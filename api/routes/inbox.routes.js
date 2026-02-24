// caminho: api/routes/inbox.routes.js
const express = require('express')
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

// ✅ agora null/undefined/"" viram null (não 0)
function toInt(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  const i = Math.trunc(n)
  return i > 0 ? i : null
}

async function addEvent({ clientId, conversationId, type, actorType, actorId, payload }) {
  await pool.query(
    `
    INSERT INTO conversation_events (client_id, conversation_id, type, actor_type, actor_id, payload)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      clientId,
      conversationId,
      String(type),
      String(actorType || 'system'),
      actorId ?? null,
      payload ?? null
    ]
  )
}

async function touchConversation({ clientId, conversationId, patch }) {
  const keys = Object.keys(patch || {})
  if (!keys.length) return

  const allowed = new Set([
    'wa_number_id',
    'lead_name',
    'lead_phone_e164',
    'status',
    'ai_active',
    'human_active',
    'assigned_user_id',
    'stage',
    'score',
    'meta',
    'last_message_at',
    'last_inbound_at',
    'last_outbound_at'
  ])

  const safe = {}
  for (const k of keys) {
    if (!allowed.has(k)) continue
    safe[k] = patch[k]
  }

  const safeKeys = Object.keys(safe)
  if (!safeKeys.length) return

  const sets = []
  const vals = [clientId, conversationId]
  let i = 3

  for (const k of safeKeys) {
    sets.push(`${k} = $${i++}`)
    vals.push(safe[k])
  }

  sets.push(`updated_at = NOW()`)

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
// POST /api/inbox/conversations  (criar conversa)
// =========================
router.post('/conversations', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const waNumberId = toInt(req.body?.wa_number_id) // ✅ agora null fica null
  const leadName = req.body?.lead_name ? String(req.body.lead_name) : null
  const leadPhone = req.body?.lead_phone_e164 ? String(req.body.lead_phone_e164) : null

  try {
    const q = await pool.query(
      `
      INSERT INTO conversations
        (client_id, wa_number_id, lead_name, lead_phone_e164, status, ai_active, human_active, meta)
      VALUES
        ($1, $2, $3, $4, 'ai', TRUE, FALSE, $5)
      RETURNING *
      `,
      [clientId, waNumberId, leadName, leadPhone, req.body?.meta ?? null]
    )

    const conv = q.rows?.[0]
    if (conv?.id) {
      await addEvent({
        clientId,
        conversationId: conv.id,
        type: 'create_conversation',
        actorType: 'system',
        actorId: null,
        payload: { wa_number_id: waNumberId, lead_name: leadName, lead_phone_e164: leadPhone }
      })
    }

    return sendOk(res, 201, { data: conv })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao criar conversa.')
  }
})

// =========================
// GET /api/inbox/conversations
// =========================
router.get('/conversations', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  try {
    const q = await pool.query(
      `
      SELECT *
        FROM conversations
       WHERE client_id = $1
       ORDER BY COALESCE(last_message_at, updated_at, created_at) DESC, id DESC
      `,
      [clientId]
    )
    return sendOk(res, 200, { data: q.rows || [] })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao listar conversas.')
  }
})

// =========================
// GET /api/inbox/conversations/:id
// =========================
router.get('/conversations/:id', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const id = toInt(req.params.id)
  if (!id) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  try {
    const q = await pool.query(
      `
      SELECT *
        FROM conversations
       WHERE client_id = $1 AND id = $2
       LIMIT 1
      `,
      [clientId, id]
    )
    const row = q.rows?.[0]
    if (!row) return sendErr(res, 404, 'not_found', 'Conversa não encontrada.')
    return sendOk(res, 200, { data: row })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao carregar conversa.')
  }
})

// =========================
// GET /api/inbox/conversations/:id/messages
// =========================
router.get('/conversations/:id/messages', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const id = toInt(req.params.id)
  if (!id) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  try {
    const q = await pool.query(
      `
      SELECT *
        FROM conversation_messages
       WHERE client_id = $1 AND conversation_id = $2
       ORDER BY created_at ASC, id ASC
      `,
      [clientId, id]
    )
    return sendOk(res, 200, { data: q.rows || [] })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao listar mensagens.')
  }
})

// =========================
// POST /api/inbox/conversations/:id/messages
// =========================
router.post('/conversations/:id/messages', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const conversationId = toInt(req.params.id)
  if (!conversationId) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  const role = req.body?.role ? String(req.body.role) : 'user'
  const direction = req.body?.direction ? String(req.body.direction) : 'in'
  const text = req.body?.text ? String(req.body.text) : ''

  if (!text.trim()) return sendErr(res, 400, 'invalid_text', 'Mensagem vazia.')

  try {
    const c = await pool.query(
      `SELECT id FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )
    if (!c.rows?.[0]) return sendErr(res, 404, 'not_found', 'Conversa não encontrada.')

    const q = await pool.query(
      `
      INSERT INTO conversation_messages
        (client_id, conversation_id, role, direction, text, media_url, media_type, meta)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        clientId,
        conversationId,
        role,
        direction,
        text,
        req.body?.media_url ?? null,
        req.body?.media_type ?? null,
        req.body?.meta ?? null
      ]
    )

    const msg = q.rows?.[0]

    const now = new Date()
    const patch = {
      last_message_at: now,
      ...(direction === 'in' ? { last_inbound_at: now } : {}),
      ...(direction === 'out' ? { last_outbound_at: now } : {})
    }

    await touchConversation({ clientId, conversationId, patch })

    await addEvent({
      clientId,
      conversationId,
      type: 'message',
      actorType: role === 'ai' ? 'ai' : role === 'agent' ? 'human' : 'system',
      actorId: role === 'agent' ? (toInt(req.body?.actor_id) ?? null) : null,
      payload: { role, direction, has_media: Boolean(req.body?.media_url) }
    })

    return sendOk(res, 201, { data: msg })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao enviar mensagem.')
  }
})

// =========================
// PATCH /api/inbox/conversations/:id
// =========================
router.patch('/conversations/:id', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const conversationId = toInt(req.params.id)
  if (!conversationId) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  try {
    const c = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )
    const before = c.rows?.[0]
    if (!before) return sendErr(res, 404, 'not_found', 'Conversa não encontrada.')

    const patch = {}

    if (req.body?.wa_number_id !== undefined) patch.wa_number_id = toInt(req.body.wa_number_id)
    if (req.body?.lead_name !== undefined) patch.lead_name = req.body.lead_name ? String(req.body.lead_name) : null
    if (req.body?.lead_phone_e164 !== undefined)
      patch.lead_phone_e164 = req.body.lead_phone_e164 ? String(req.body.lead_phone_e164) : null

    if (req.body?.status !== undefined) patch.status = String(req.body.status)
    if (req.body?.ai_active !== undefined) patch.ai_active = Boolean(req.body.ai_active)
    if (req.body?.human_active !== undefined) patch.human_active = Boolean(req.body.human_active)
    if (req.body?.assigned_user_id !== undefined) patch.assigned_user_id = toInt(req.body.assigned_user_id)

    if (req.body?.stage !== undefined) patch.stage = req.body.stage ? String(req.body.stage) : null
    if (req.body?.score !== undefined) patch.score = toInt(req.body.score) ?? 0
    if (req.body?.meta !== undefined) patch.meta = req.body.meta ?? null

    await touchConversation({ clientId, conversationId, patch })

    await addEvent({
      clientId,
      conversationId,
      type: 'update_conversation',
      actorType: 'system',
      actorId: null,
      payload: { keys: Object.keys(patch) }
    })

    const q = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )

    return sendOk(res, 200, { data: q.rows?.[0] || null })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao atualizar conversa.')
  }
})

// =========================
// POST /api/inbox/conversations/:id/assign
// =========================
router.post('/conversations/:id/assign', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const conversationId = toInt(req.params.id)
  if (!conversationId) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  const assignedUserId = toInt(req.body?.assigned_user_id)

  try {
    const c = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )
    if (!c.rows?.[0]) return sendErr(res, 404, 'not_found', 'Conversa não encontrada.')

    await touchConversation({
      clientId,
      conversationId,
      patch: {
        status: 'human',
        human_active: true,
        ai_active: false,
        assigned_user_id: assignedUserId
      }
    })

    await addEvent({
      clientId,
      conversationId,
      type: 'assign',
      actorType: 'human',
      actorId: assignedUserId ?? null,
      payload: { assigned_user_id: assignedUserId ?? null }
    })

    const q = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )

    return sendOk(res, 200, { data: q.rows?.[0] || null })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao assumir conversa.')
  }
})

// =========================
// POST /api/inbox/conversations/:id/transfer
// =========================
router.post('/conversations/:id/transfer', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const conversationId = toInt(req.params.id)
  if (!conversationId) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  const toUserId = toInt(req.body?.to_user_id)
  const fromUserId = toInt(req.body?.from_user_id)

  try {
    const c = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )
    if (!c.rows?.[0]) return sendErr(res, 404, 'not_found', 'Conversa não encontrada.')

    await touchConversation({
      clientId,
      conversationId,
      patch: {
        status: 'human',
        human_active: true,
        ai_active: false,
        assigned_user_id: toUserId
      }
    })

    await addEvent({
      clientId,
      conversationId,
      type: 'transfer',
      actorType: 'human',
      actorId: fromUserId ?? null,
      payload: { from_user_id: fromUserId ?? null, to_user_id: toUserId ?? null }
    })

    const q = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )

    return sendOk(res, 200, { data: q.rows?.[0] || null })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao transferir conversa.')
  }
})

// =========================
// POST /api/inbox/conversations/:id/return-to-ai
// =========================
router.post('/conversations/:id/return-to-ai', async (req, res) => {
  const clientId = getClientId(req)
  if (!clientId) return sendErr(res, 400, 'invalid_client_id', 'client_id inválido.')

  const conversationId = toInt(req.params.id)
  if (!conversationId) return sendErr(res, 400, 'invalid_id', 'ID inválido.')

  const actorUserId = toInt(req.body?.actor_user_id)

  try {
    const c = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )
    if (!c.rows?.[0]) return sendErr(res, 404, 'not_found', 'Conversa não encontrada.')

    await touchConversation({
      clientId,
      conversationId,
      patch: {
        status: 'ai',
        ai_active: true,
        human_active: false
      }
    })

    await addEvent({
      clientId,
      conversationId,
      type: 'return_to_ai',
      actorType: 'human',
      actorId: actorUserId ?? null,
      payload: {}
    })

    const q = await pool.query(
      `SELECT * FROM conversations WHERE client_id = $1 AND id = $2 LIMIT 1`,
      [clientId, conversationId]
    )

    return sendOk(res, 200, { data: q.rows?.[0] || null })
  } catch (e) {
    return sendErr(res, 500, 'db_error', e?.message || 'Erro ao devolver para IA.')
  }
})

module.exports = router
// fim: api/routes/inbox.routes.js