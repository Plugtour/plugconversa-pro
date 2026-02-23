// caminho: api/routes/contacts.routes.js
const express = require('express')
const { pool } = require('../db')

const router = express.Router()

/**
 * Tabela: contacts
 * Campos:
 * - id (serial pk)
 * - client_id (int not null)
 * - name (text not null)
 * - phone (text not null)
 * - notes (text)
 * - created_at (timestamp default now())
 *
 * Padrão SaaS:
 * - sempre filtrar por client_id (multi-tenant)
 * - respostas consistentes (ok + data)
 * - erros com código lógico (error) e message opcional
 */

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
  // vem do middleware do server.js
  const cid = Number(req.clientId || req.headers['x-client-id'])
  return Number.isFinite(cid) && cid > 0 ? cid : null
}

function normalizeTagIds(v) {
  if (!Array.isArray(v)) return []
  const out = []
  for (const x of v) {
    const n = Number(x)
    if (Number.isFinite(n) && n > 0) out.push(n)
  }
  // unique
  return Array.from(new Set(out))
}

async function fetchContactWithTags(client, clientId, contactId) {
  const { rows } = await client.query(
    `
    SELECT
      c.id,
      c.client_id,
      c.name,
      c.phone,
      c.notes,
      c.created_at,
      COALESCE(array_agg(DISTINCT ct.tag_id) FILTER (WHERE ct.tag_id IS NOT NULL), '{}') AS tag_ids,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
        FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM contacts c
    LEFT JOIN contact_tags ct
      ON ct.contact_id = c.id AND ct.client_id = c.client_id
    LEFT JOIN tags t
      ON t.id = ct.tag_id AND t.client_id = c.client_id
    WHERE c.client_id = $1
      AND c.id = $2
    GROUP BY c.id
    `,
    [clientId, contactId]
  )
  return rows[0] || null
}

async function upsertContactTags(client, clientId, contactId, tagIds) {
  const ids = normalizeTagIds(tagIds)
  if (ids.length === 0) {
    // limpa vínculos
    await client.query(
      `DELETE FROM contact_tags WHERE client_id = $1 AND contact_id = $2`,
      [clientId, contactId]
    )
    return
  }

  // valida: só permite tags do próprio tenant
  const validRes = await client.query(
    `SELECT id FROM tags WHERE client_id = $1 AND id = ANY($2::int[])`,
    [clientId, ids]
  )
  const validIds = (validRes.rows || []).map((r) => Number(r.id)).filter((n) => Number.isFinite(n) && n > 0)

  // reseta e grava somente válidas
  await client.query(
    `DELETE FROM contact_tags WHERE client_id = $1 AND contact_id = $2`,
    [clientId, contactId]
  )

  if (validIds.length === 0) return

  // insert em lote (com proteção contra duplicados)
  const values = validIds.map((_, i) => `($1, $2, $${i + 3})`).join(',')
  await client.query(
    `
    INSERT INTO contact_tags (client_id, contact_id, tag_id)
    VALUES ${values}
    ON CONFLICT (client_id, contact_id, tag_id) DO NOTHING
    `,
    [clientId, contactId, ...validIds]
  )
}

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    const { rows } = await pool.query(
      `
      SELECT
        c.id,
        c.client_id,
        c.name,
        c.phone,
        c.notes,
        c.created_at,
        COALESCE(array_agg(DISTINCT ct.tag_id) FILTER (WHERE ct.tag_id IS NOT NULL), '{}') AS tag_ids,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM contacts c
      LEFT JOIN contact_tags ct
        ON ct.contact_id = c.id AND ct.client_id = c.client_id
      LEFT JOIN tags t
        ON t.id = ct.tag_id AND t.client_id = c.client_id
      WHERE c.client_id = $1
      GROUP BY c.id
      ORDER BY c.id DESC
      `,
      [clientId]
    )

    return sendOk(res, 200, { contacts: rows })
  } catch (err) {
    return sendErr(res, 500, 'contacts_fetch_error', err?.message)
  }
})

// POST /api/contacts
router.post('/', async (req, res) => {
  const client = await pool.connect()
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    const { name, phone, notes, tag_ids } = req.body

    if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
      return sendErr(res, 400, 'validation_error', 'name e phone são obrigatórios')
    }

    await client.query('BEGIN')

    const ins = await client.query(
      `
      INSERT INTO contacts (client_id, name, phone, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [clientId, String(name).trim(), String(phone).trim(), notes ? String(notes) : null]
    )

    const contactId = Number(ins?.rows?.[0]?.id)
    if (!Number.isFinite(contactId) || contactId <= 0) {
      await client.query('ROLLBACK')
      return sendErr(res, 500, 'contacts_create_error', 'Falha ao criar contato')
    }

    // ✅ grava vínculo de etiquetas se vier do front
    await upsertContactTags(client, clientId, contactId, tag_ids)

    const full = await fetchContactWithTags(client, clientId, contactId)

    await client.query('COMMIT')

    return sendOk(res, 201, { contact: full })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    return sendErr(res, 500, 'contacts_create_error', err?.message)
  } finally {
    client.release()
  }
})

// PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
  const client = await pool.connect()
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    const id = Number(req.params.id)
    const { name, phone, notes, tag_ids } = req.body

    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }
    if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
      return sendErr(res, 400, 'validation_error', 'name e phone são obrigatórios')
    }

    await client.query('BEGIN')

    const { rowCount } = await client.query(
      `
      UPDATE contacts
      SET name = $1,
          phone = $2,
          notes = $3
      WHERE id = $4
        AND client_id = $5
      `,
      [String(name).trim(), String(phone).trim(), notes ? String(notes) : null, id, clientId]
    )

    if (rowCount === 0) {
      await client.query('ROLLBACK')
      return sendErr(res, 404, 'contact_not_found')
    }

    // ✅ se o front mandar tag_ids, atualiza vínculo; se não mandar, mantém como está
    if (tag_ids !== undefined) {
      await upsertContactTags(client, clientId, id, tag_ids)
    }

    const full = await fetchContactWithTags(client, clientId, id)

    await client.query('COMMIT')

    return sendOk(res, 200, { contact: full })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // ignore
    }
    return sendErr(res, 500, 'contacts_update_error', err?.message)
  } finally {
    client.release()
  }
})

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    const id = Number(req.params.id)

    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }

    const { rowCount } = await pool.query(
      `
      DELETE FROM contacts
      WHERE id = $1
        AND client_id = $2
      `,
      [id, clientId]
    )

    if (rowCount === 0) {
      return sendErr(res, 404, 'contact_not_found')
    }

    return sendOk(res, 200, { deleted: true })
  } catch (err) {
    return sendErr(res, 500, 'contacts_delete_error', err?.message)
  }
})

module.exports = router
// fim: api/routes/contacts.routes.js