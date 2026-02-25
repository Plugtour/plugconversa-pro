// caminho: api/routes/whatsapp.routes.js
const express = require('express')
const crypto = require('crypto')
const https = require('https')
const { pool } = require('../db')

const router = express.Router()

function sendOk(res, status, data) {
  return res.status(status).json({ ok: true, ...data })
}

function sendErr(res, status, error, message) {
  return res.status(status).json({
    ok: false,
    error,
    ...(message ? { message } : {})
  })
}

function getClientId(req) {
  const cid = Number(req.clientId || req.headers['x-client-id'])
  return Number.isFinite(cid) && cid > 0 ? cid : null
}

function toInt(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

function nowTs() {
  return new Date()
}

function normalizeE164(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.startsWith('+') ? s : `+${s.replace(/[^\d]/g, '')}`
}

function safeJson(v) {
  try {
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

// =========================
// Assinatura Meta (X-Hub-Signature-256)
// =========================
function verifyMetaSignature(req) {
  const appSecret = String(process.env.META_APP_SECRET || '').trim()
  if (!appSecret) return { ok: false, error: 'missing_meta_app_secret' }

  const sig = String(req.headers['x-hub-signature-256'] || '').trim()
  if (!sig) return { ok: false, error: 'missing_signature' }

  // Meta usa: sha256=<hex>
  const [algo, hex] = sig.split('=')
  if (algo !== 'sha256' || !hex) return { ok: false, error: 'invalid_signature_format' }

  const raw = req.rawBody
  if (!raw || !Buffer.isBuffer(raw)) return { ok: false, error: 'missing_raw_body' }

  const h = crypto.createHmac('sha256', appSecret).update(raw).digest('hex')
  const a = Buffer.from(hex, 'hex')
  const b = Buffer.from(h, 'hex')

  if (a.length !== b.length) return { ok: false, error: 'signature_mismatch' }
  const match = crypto.timingSafeEqual(a, b)
  return match ? { ok: true } : { ok: false, error: 'signature_mismatch' }
}

// =========================
// Resolver tenant pelo phone_number_id
// - preferimos wa_numbers.phone_number_id
// - fallback: provider_meta->>'phone_number_id' (caso legado)
// Token: tenta wa_numbers.access_token -> wa_accounts.access_token -> provider_meta->>'access_token'
// =========================
async function resolveTenantByPhoneNumberId(phoneNumberId) {
  const pid = String(phoneNumberId || '').trim()
  if (!pid) return null

  const q = await pool.query(
    `
    SELECT
      wn.id                 AS wa_number_id,
      wn.client_id          AS client_id,
      wn.phone_e164         AS phone_e164,
      wn.label              AS label,
      wn.phone_number_id    AS phone_number_id,
      wn.access_token       AS number_access_token,
      wa.access_token       AS account_access_token,
      wn.provider_meta      AS provider_meta
    FROM wa_numbers wn
    LEFT JOIN wa_accounts wa
      ON wa.id = wn.wa_account_id
    WHERE
      (wn.phone_number_id = $1)
      OR (wn.provider_meta->>'phone_number_id' = $1)
    LIMIT 1
    `,
    [pid]
  )

  const row = q.rows?.[0]
  if (!row) return null

  const providerMeta = row.provider_meta || null
  const providerToken =
    (providerMeta && typeof providerMeta === 'object' && providerMeta.access_token) ||
    (providerMeta && typeof providerMeta === 'object' && providerMeta.token) ||
    null

  const token = row.number_access_token || row.account_access_token || providerToken || null

  return {
    clientId: Number(row.client_id),
    waNumberId: Number(row.wa_number_id),
    phoneE164: row.phone_e164 || null,
    token
  }
}

// =========================
// Eventos: auditoria
// =========================
async function addEvent({ clientId, conversationId, type, actorType, actorId, payload }) {
  await pool.query(
    `
    INSERT INTO conversation_events (client_id, conversation_id, type, actor_type, actor_id, payload)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [clientId, conversationId, String(type), String(actorType || 'system'), actorId ?? null, payload ?? null]
  )
}

// =========================
// Encontrar ou criar conversa
// Regras:
/// - match por client_id + wa_number_id + lead_phone_e164
// =========================
async function getOrCreateConversation({ clientId, waNumberId, fromE164, leadName }) {
  const phone = normalizeE164(fromE164)

  // tenta achar conversa existente
  const find = await pool.query(
    `
    SELECT *
      FROM conversations
     WHERE client_id = $1
       AND wa_number_id = $2
       AND lead_phone_e164 = $3
     ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, id DESC
     LIMIT 1
    `,
    [clientId, waNumberId, phone]
  )

  const existing = find.rows?.[0]
  if (existing?.id) return existing

  // cria nova
  const ins = await pool.query(
    `
    INSERT INTO conversations
      (client_id, wa_number_id, lead_name, lead_phone_e164, status, ai_active, human_active, meta)
    VALUES
      ($1, $2, $3, $4, 'ai', TRUE, FALSE, $5)
    RETURNING *
    `,
    [clientId, waNumberId, leadName ? String(leadName) : null, phone || null, { channel: 'whatsapp' }]
  )

  const conv = ins.rows?.[0]
  if (conv?.id) {
    await addEvent({
      clientId,
      conversationId: conv.id,
      type: 'create_conversation',
      actorType: 'system',
      actorId: null,
      payload: { wa_number_id: waNumberId, lead_phone_e164: phone || null }
    })
  }

  return conv
}

// =========================
// Touch conversa (last_message_at, etc.)
// =========================
async function touchConversation({ clientId, conversationId, direction }) {
  const now = nowTs()
  const patch =
    direction === 'in'
      ? { last_message_at: now, last_inbound_at: now }
      : { last_message_at: now, last_outbound_at: now }

  const sets = []
  const vals = [clientId, conversationId]
  let i = 3

  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = $${i++}`)
    vals.push(v)
  }

  sets.push('updated_at = NOW()')

  await pool.query(
    `
    UPDATE conversations
       SET ${sets.join(', ')}
     WHERE client_id = $1 AND id = $2
    `,
    vals
  )
}

// =========================
// Inserir mensagem inbound com dedup por wa_message_id
// =========================
async function insertInboundMessage({
  clientId,
  conversationId,
  waMessageId,
  text,
  fromE164,
  toPhoneNumberId,
  raw
}) {
  const direction = 'in'
  const role = 'user'
  const cleanText = String(text || '').trim()

  // tenta inserir
  try {
    const q = await pool.query(
      `
      INSERT INTO conversation_messages
        (client_id, conversation_id, role, direction, text, meta, wa_message_id, wa_timestamp, wa_from, wa_to, status)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'created')
      RETURNING *
      `,
      [
        clientId,
        conversationId,
        role,
        direction,
        cleanText || '[mensagem sem texto]',
        raw ? { raw } : null,
        waMessageId || null,
        raw?.timestamp ? Number(raw.timestamp) : null,
        fromE164 ? String(fromE164) : null,
        toPhoneNumberId ? String(toPhoneNumberId) : null
      ]
    )

    const msg = q.rows?.[0] || null
    if (msg?.id) {
      await touchConversation({ clientId, conversationId, direction })
      await addEvent({
        clientId,
        conversationId,
        type: 'message_received',
        actorType: 'system',
        actorId: null,
        payload: { wa_message_id: waMessageId || null }
      })
    }

    return { created: true, msg }
  } catch (e) {
    // 23505 = unique violation (dedup)
    if (String(e?.code) === '23505') {
      return { created: false, msg: null }
    }
    throw e
  }
}

// =========================
// Atualizar status de mensagem (sent/delivered/read/failed)
// =========================
async function applyStatusUpdate({ clientId, waMessageId, status, raw, error }) {
  if (!waMessageId) return

  // tenta achar message_id e conversation_id pelo wa_message_id
  const m = await pool.query(
    `
    SELECT id, conversation_id
      FROM conversation_messages
     WHERE client_id = $1
       AND wa_message_id = $2
     LIMIT 1
    `,
    [clientId, waMessageId]
  )

  const row = m.rows?.[0]
  const messageId = row?.id ? Number(row.id) : null
  const conversationId = row?.conversation_id ? Number(row.conversation_id) : null

  // grava histórico de status mesmo que ainda não tenha message local (às vezes status chega antes)
  await pool.query(
    `
    INSERT INTO message_status
      (client_id, conversation_id, message_id, wa_message_id, status, error_code, error_title, error_message, raw)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      clientId,
      conversationId ?? 0,
      messageId ?? 0,
      waMessageId,
      String(status),
      error?.code ? String(error.code) : null,
      error?.title ? String(error.title) : null,
      error?.message ? String(error.message) : null,
      raw ?? null
    ]
  )

  // atualiza status no message (se existir)
  if (messageId) {
    await pool.query(
      `
      UPDATE conversation_messages
         SET status = $3
       WHERE client_id = $1 AND id = $2
      `,
      [clientId, messageId, String(status)]
    )
  }
}

// =========================
// HTTP helper (Graph API)
// =========================
function httpPostJson(url, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url)
      const body = Buffer.from(JSON.stringify(bodyObj || {}), 'utf8')

      const req = https.request(
        {
          method: 'POST',
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + (u.search || ''),
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': body.length,
            ...(headers || {})
          }
        },
        (res) => {
          const chunks = []
          res.on('data', (d) => chunks.push(d))
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8')
            let json = null
            try {
              json = raw ? JSON.parse(raw) : null
            } catch {
              json = null
            }
            resolve({ status: res.statusCode || 0, json, raw })
          })
        }
      )

      req.on('error', reject)
      req.write(body)
      req.end()
    } catch (e) {
      reject(e)
    }
  })
}

async function sendTextCloudApi({ token, phoneNumberId, toE164, text }) {
  const ver = String(process.env.META_GRAPH_VERSION || 'v20.0').trim()
  const url = `https://graph.facebook.com/${ver}/${encodeURIComponent(phoneNumberId)}/messages`

  const payload = {
    messaging_product: 'whatsapp',
    to: String(toE164).replace(/[^\d+]/g, ''),
    type: 'text',
    text: { body: String(text || '') }
  }

  const r = await httpPostJson(
    url,
    {
      Authorization: `Bearer ${token}`
    },
    payload
  )

  return r
}

// =====================================================
// WEBHOOK (GET) - verificação
// GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
// =====================================================
router.get('/webhook', (req, res) => {
  const mode = String(req.query['hub.mode'] || '')
  const token = String(req.query['hub.verify_token'] || '')
  const challenge = String(req.query['hub.challenge'] || '')

  const expected = String(process.env.WA_VERIFY_TOKEN || '').trim()
  if (!expected) {
    return res.status(500).send('missing_verify_token')
  }

  if (mode === 'subscribe' && token === expected) {
    return res.status(200).send(challenge)
  }

  return res.status(403).send('forbidden')
})

// =====================================================
// WEBHOOK (POST) - eventos (mensagens + status)
// POST /api/whatsapp/webhook
// =====================================================
router.post('/webhook', async (req, res) => {
  // valida assinatura
  const sig = verifyMetaSignature(req)
  if (!sig.ok) {
    return res.status(401).json({ ok: false, error: 'invalid_signature', detail: sig.error })
  }

  const body = req.body || {}
  // ack rápido
  res.status(200).json({ ok: true })

  try {
    const entry = Array.isArray(body.entry) ? body.entry : []
    for (const ent of entry) {
      const changes = Array.isArray(ent.changes) ? ent.changes : []
      for (const ch of changes) {
        const value = ch?.value || {}
        const metadata = value?.metadata || {}
        const phoneNumberId = metadata?.phone_number_id ? String(metadata.phone_number_id) : ''

        const tenant = await resolveTenantByPhoneNumberId(phoneNumberId)
        if (!tenant?.clientId || !tenant?.waNumberId) {
          console.warn('[WA] webhook: tenant não encontrado p/ phone_number_id=', phoneNumberId)
          continue
        }

        const clientId = tenant.clientId
        const waNumberId = tenant.waNumberId

        // ===== mensagens =====
        const messages = Array.isArray(value.messages) ? value.messages : []
        for (const m of messages) {
          const waMessageId = m?.id ? String(m.id) : null
          const from = m?.from ? String(m.from) : null // geralmente vem só dígitos
          const fromE164 = from ? (from.startsWith('+') ? from : `+${from}`) : null

          let text = ''
          if (m?.text?.body) text = String(m.text.body)
          else if (m?.type) text = `[${String(m.type)}]`

          const leadName = null

          const conv = await getOrCreateConversation({
            clientId,
            waNumberId,
            fromE164,
            leadName
          })

          if (!conv?.id) continue

          const created = await insertInboundMessage({
            clientId,
            conversationId: conv.id,
            waMessageId,
            text,
            fromE164,
            toPhoneNumberId: phoneNumberId,
            raw: m
          })

          if (!created.created) {
            // duplicado (idempotência)
          }

          // aqui entra a IA no próximo passo (FASE 4/5), via fila/worker
        }

        // ===== status =====
        const statuses = Array.isArray(value.statuses) ? value.statuses : []
        for (const st of statuses) {
          const waMessageId = st?.id ? String(st.id) : null
          const status = st?.status ? String(st.status) : 'unknown'
          const errorsArr = Array.isArray(st?.errors) ? st.errors : []
          const err0 = errorsArr[0] || null

          await applyStatusUpdate({
            clientId,
            waMessageId,
            status,
            raw: st,
            error: err0
          })
        }
      }
    }
  } catch (e) {
    console.error('[WA] webhook erro ❌', e?.message || e)
  }
})

// =====================================================
// (CLIENT) Listar números do tenant
// GET /api/whatsapp/numbers
// =====================================================
router.get('/numbers', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  try {
    const q = await pool.query(
      `
      SELECT *
        FROM wa_numbers
       WHERE client_id = $1
       ORDER BY id DESC
      `,
      [clientId]
    )
    return sendOk(res, 200, { data: q.rows || [] })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao listar números.')
  }
})

// =====================================================
// (CLIENT) Cadastrar/atualizar mapeamento phone_number_id
// POST /api/whatsapp/numbers
// body: { id? , label?, phone_e164, phone_number_id, access_token?, provider? , provider_meta? , active? }
// =====================================================
router.post('/numbers', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const id = toInt(req.body?.id)
  const phoneE164 = normalizeE164(req.body?.phone_e164)
  const phoneNumberId = req.body?.phone_number_id ? String(req.body.phone_number_id).trim() : ''
  const label = req.body?.label ? String(req.body.label) : null
  const provider = req.body?.provider ? String(req.body.provider) : 'meta_cloud'
  const active = req.body?.active !== undefined ? Boolean(req.body.active) : true

  if (!phoneE164) return sendErr(res, 400, 'invalid_phone', 'phone_e164 obrigatório.')
  if (!phoneNumberId) return sendErr(res, 400, 'invalid_phone_number_id', 'phone_number_id obrigatório.')

  try {
    if (id) {
      const u = await pool.query(
        `
        UPDATE wa_numbers
           SET label = $3,
               phone_e164 = $4,
               provider = $5,
               active = $6,
               phone_number_id = $7,
               access_token = $8,
               provider_meta = $9
         WHERE client_id = $1 AND id = $2
         RETURNING *
        `,
        [
          clientId,
          id,
          label,
          phoneE164,
          provider,
          active,
          phoneNumberId,
          req.body?.access_token ?? null,
          req.body?.provider_meta ?? null
        ]
      )
      const row = u.rows?.[0]
      if (!row) return sendErr(res, 404, 'not_found', 'Número não encontrado.')
      return sendOk(res, 200, { data: row })
    }

    const ins = await pool.query(
      `
      INSERT INTO wa_numbers
        (client_id, label, phone_e164, provider, provider_meta, active, phone_number_id, access_token)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        clientId,
        label,
        phoneE164,
        provider,
        req.body?.provider_meta ?? null,
        active,
        phoneNumberId,
        req.body?.access_token ?? null
      ]
    )

    return sendOk(res, 201, { data: ins.rows?.[0] || null })
  } catch (e) {
    // uq_wa_numbers_client_phone
    if (String(e?.code) === '23505') {
      return sendErr(res, 409, 'duplicate', 'Número já cadastrado para este cliente.')
    }
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao salvar número.')
  }
})

// =====================================================
// (CLIENT) Enviar mensagem real
// POST /api/whatsapp/send
// body: { wa_number_id, to, text }
// =====================================================
router.post('/send', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const waNumberId = toInt(req.body?.wa_number_id)
  const to = normalizeE164(req.body?.to)
  const text = String(req.body?.text || '').trim()

  if (!waNumberId) return sendErr(res, 400, 'invalid_wa_number_id', 'wa_number_id inválido.')
  if (!to) return sendErr(res, 400, 'invalid_to', 'Destino inválido.')
  if (!text) return sendErr(res, 400, 'invalid_text', 'Mensagem vazia.')

  try {
    const q = await pool.query(
      `
      SELECT
        wn.*,
        wa.access_token AS account_access_token
      FROM wa_numbers wn
      LEFT JOIN wa_accounts wa
        ON wa.id = wn.wa_account_id
      WHERE wn.client_id = $1 AND wn.id = $2
      LIMIT 1
      `,
      [clientId, waNumberId]
    )

    const row = q.rows?.[0]
    if (!row) return sendErr(res, 404, 'not_found', 'Número não encontrado.')

    const phoneNumberId = row.phone_number_id || row?.provider_meta?.phone_number_id
    if (!phoneNumberId) return sendErr(res, 400, 'missing_phone_number_id', 'Número sem phone_number_id.')

    const token =
      row.access_token ||
      row.account_access_token ||
      (row.provider_meta && row.provider_meta.access_token) ||
      null

    if (!token) return sendErr(res, 400, 'missing_token', 'Token não configurado para este número.')

    // conversa (cria/pega)
    const conv = await getOrCreateConversation({
      clientId,
      waNumberId,
      fromE164: to,
      leadName: null
    })

    // envia na Meta
    const r = await sendTextCloudApi({
      token,
      phoneNumberId,
      toE164: to,
      text
    })

    if (r.status < 200 || r.status >= 300) {
      return sendErr(res, 502, 'wa_send_failed', r.json?.error?.message || r.raw || 'Falha ao enviar.')
    }

    const waMessageId = r.json?.messages?.[0]?.id || null

    // salva outbound
    const ins = await pool.query(
      `
      INSERT INTO conversation_messages
        (client_id, conversation_id, role, direction, text, meta, wa_message_id, wa_from, wa_to, status)
      VALUES
        ($1, $2, 'agent', 'out', $3, $4, $5, $6, $7, 'sent')
      RETURNING *
      `,
      [
        clientId,
        conv.id,
        text,
        { wa_send: true },
        waMessageId,
        row.phone_e164 || null,
        to
      ]
    )

    await touchConversation({ clientId, conversationId: conv.id, direction: 'out' })
    await addEvent({
      clientId,
      conversationId: conv.id,
      type: 'message_sent',
      actorType: 'human',
      actorId: null,
      payload: { wa_message_id: waMessageId }
    })

    return sendOk(res, 200, { data: { wa_message_id: waMessageId, message: ins.rows?.[0] || null } })
  } catch (e) {
    return sendErr(res, 500, 'internal_error', e?.message || 'Erro ao enviar WhatsApp.')
  }
})

module.exports = router
// fim: api/routes/whatsapp.routes.js