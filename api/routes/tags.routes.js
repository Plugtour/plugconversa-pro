// caminho: api/routes/tags.routes.js
const express = require('express')
const { pool } = require('../db')

const router = express.Router()

/**
 * Tabela esperada: tags
 * Campos mínimos:
 * - id (serial pk)
 * - client_id (int not null)
 * - name (text not null)
 * - color (text)
 * - ai_profile (text)
 * - created_at (timestamp default now())
 *
 * Campos adicionais já existentes no seu banco (confirmado pelo erro):
 * - position (int not null)
 * Possíveis (dependendo do seu schema):
 * - active (boolean)
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
  const cid = Number(req.clientId || req.headers['x-client-id'])
  return Number.isFinite(cid) && cid > 0 ? cid : null
}

function asTrimmedText(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s ? s : null
}

function asNullableText(v) {
  if (v === undefined) return undefined
  if (v === null) return null
  return String(v)
}

function asNullableBool(v) {
  if (v === undefined) return undefined
  if (v === null) return null
  if (typeof v === 'boolean') return v
  const s = String(v).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes' || s === 'sim') return true
  if (s === 'false' || s === '0' || s === 'no' || s === 'nao' || s === 'não') return false
  return undefined
}

function asNullableInt(v) {
  if (v === undefined) return undefined
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function isMissingColumnError(err, colName) {
  const msg = String(err?.message || '').toLowerCase()
  const col = String(colName || '').toLowerCase()
  return msg.includes('column') && msg.includes(col) && msg.includes('does not exist')
}

// GET /api/tags
router.get('/', async (req, res) => {
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    // ✅ tenta com active; se a coluna não existir, refaz sem active
    async function selectWithActive() {
      const { rows } = await pool.query(
        `
        SELECT id, client_id, name, color, ai_profile, position, active, created_at
        FROM tags
        WHERE client_id = $1
        ORDER BY position ASC, id ASC
        `,
        [clientId]
      )
      return rows
    }

    async function selectWithoutActive() {
      const { rows } = await pool.query(
        `
        SELECT id, client_id, name, color, ai_profile, position, created_at
        FROM tags
        WHERE client_id = $1
        ORDER BY position ASC, id ASC
        `,
        [clientId]
      )
      // normaliza para o front (treat missing active as true)
      return rows.map((r) => ({ ...r, active: true }))
    }

    let rows
    try {
      rows = await selectWithActive()
    } catch (e) {
      if (isMissingColumnError(e, 'active')) {
        rows = await selectWithoutActive()
      } else {
        throw e
      }
    }

    return sendOk(res, 200, { tags: rows })
  } catch (err) {
    return sendErr(res, 500, 'tags_fetch_error', err?.message)
  }
})

// POST /api/tags
router.post('/', async (req, res) => {
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    const name = asTrimmedText(req.body?.name)
    const color = asNullableText(req.body?.color)
    const ai_profile = asNullableText(req.body?.ai_profile)

    // opcionais (dependendo do schema)
    const active = asNullableBool(req.body?.active)
    let position = asNullableInt(req.body?.position)

    if (!name) {
      return sendErr(res, 400, 'validation_error', 'name é obrigatório')
    }

    // ✅ position é NOT NULL no seu banco.
    // Se não vier do front, calculamos (max + 1) por client_id.
    if (position === undefined || position === null) {
      const maxRes = await pool.query(
        `
        SELECT COALESCE(MAX(position), 0) + 1 AS next_position
        FROM tags
        WHERE client_id = $1
        `,
        [clientId]
      )
      position = Number(maxRes?.rows?.[0]?.next_position) || 1
    }

    // Monta INSERT tolerante a schema:
    // - sempre grava position
    // - grava active apenas se a coluna existir (se não existir, o DB vai acusar; então deixamos no INSERT mas com fallback)
    // Para evitar erro caso a coluna active NÃO exista, fazemos tentativa com active e, se falhar por coluna inexistente, repetimos sem active.
    const insertWithActive = async () => {
      const { rows } = await pool.query(
        `
        INSERT INTO tags (client_id, name, color, ai_profile, position, active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, client_id, name, color, ai_profile, position, active, created_at
        `,
        [clientId, name, color ?? null, ai_profile ?? null, position, active ?? true]
      )
      return rows[0]
    }

    const insertWithoutActive = async () => {
      const { rows } = await pool.query(
        `
        INSERT INTO tags (client_id, name, color, ai_profile, position)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, client_id, name, color, ai_profile, position, created_at
        `,
        [clientId, name, color ?? null, ai_profile ?? null, position]
      )
      // normaliza para o front
      return { ...rows[0], active: true }
    }

    let tag
    try {
      tag = await insertWithActive()
    } catch (e) {
      // coluna active não existe -> tenta sem
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('active')) {
        tag = await insertWithoutActive()
      } else {
        throw e
      }
    }

    return sendOk(res, 201, { tag })
  } catch (err) {
    // unique violation (caso exista índice único por client_id+name etc.)
    if (err?.code === '23505') {
      return sendErr(res, 409, 'tag_already_exists', 'Já existe uma etiqueta com esse nome.')
    }
    return sendErr(res, 500, 'tags_create_error', err?.message)
  }
})

// PUT /api/tags/:id  (aceita update parcial: name/color/ai_profile/position/active)
router.put('/:id', async (req, res) => {
  try {
    const clientId = getClientId(req)
    if (!clientId) return sendErr(res, 400, 'invalid_client_id')

    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }

    const nameRaw = req.body?.name
    const name = nameRaw !== undefined ? asTrimmedText(nameRaw) : undefined
    const color = asNullableText(req.body?.color)
    const ai_profile = asNullableText(req.body?.ai_profile)
    const position = asNullableInt(req.body?.position)
    const active = asNullableBool(req.body?.active)

    // se name veio mas ficou vazio, erro
    if (nameRaw !== undefined && !name) {
      return sendErr(res, 400, 'validation_error', 'name é obrigatório')
    }

    // monta update dinâmico (sem refatorar estrutura)
    const sets = []
    const vals = []
    let i = 1

    function addSet(col, value) {
      sets.push(`${col} = $${i}`)
      vals.push(value)
      i += 1
    }

    if (name !== undefined) addSet('name', name)
    if (color !== undefined) addSet('color', color === null ? null : String(color))
    if (ai_profile !== undefined) addSet('ai_profile', ai_profile === null ? null : String(ai_profile))
    if (position !== undefined) addSet('position', position)
    if (active !== undefined) addSet('active', active)

    if (sets.length === 0) {
      return sendErr(res, 400, 'validation_error', 'nenhum campo para atualizar')
    }

    // where
    vals.push(id)
    vals.push(clientId)

    let rows
    let rowCount

    try {
      const r = await pool.query(
        `
        UPDATE tags
        SET ${sets.join(', ')}
        WHERE id = $${i} AND client_id = $${i + 1}
        RETURNING id, client_id, name, color, ai_profile, position, active, created_at
        `,
        vals
      )
      rows = r.rows
      rowCount = r.rowCount
    } catch (e) {
      // coluna active pode não existir no schema
      const msg = String(e?.message || '')
      if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('active')) {
        // remove active se foi solicitado e tenta novamente
        if (active !== undefined) {
          const sets2 = sets.filter((s) => !s.startsWith('active ='))
          if (sets2.length === 0) {
            return sendErr(res, 400, 'validation_error', 'nenhum campo para atualizar')
          }

          // reconstrói vals sem o active (primeiro match)
          const vals2 = []
          const setsFinal = []
          let j = 1
          const pushSet = (col, value) => {
            setsFinal.push(`${col} = $${j}`)
            vals2.push(value)
            j += 1
          }

          if (name !== undefined) pushSet('name', name)
          if (color !== undefined) pushSet('color', color === null ? null : String(color))
          if (ai_profile !== undefined) pushSet('ai_profile', ai_profile === null ? null : String(ai_profile))
          if (position !== undefined) pushSet('position', position)

          vals2.push(id)
          vals2.push(clientId)

          const r2 = await pool.query(
            `
            UPDATE tags
            SET ${setsFinal.join(', ')}
            WHERE id = $${j} AND client_id = $${j + 1}
            RETURNING id, client_id, name, color, ai_profile, position, created_at
            `,
            vals2
          )
          rows = r2.rows
          rowCount = r2.rowCount

          // normaliza para o front
          if (rows?.[0] && rows[0].active === undefined) rows[0].active = true
        } else {
          throw e
        }
      } else {
        throw e
      }
    }

    if (rowCount === 0) {
      return sendErr(res, 404, 'tag_not_found')
    }

    return sendOk(res, 200, { tag: rows[0] })
  } catch (err) {
    if (err?.code === '23505') {
      return sendErr(res, 409, 'tag_already_exists', 'Já existe uma etiqueta com esse nome.')
    }
    return sendErr(res, 500, 'tags_update_error', err?.message)
  }
})

// DELETE /api/tags/:id
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
      DELETE FROM tags
      WHERE id = $1
        AND client_id = $2
      `,
      [id, clientId]
    )

    if (rowCount === 0) {
      return sendErr(res, 404, 'tag_not_found')
    }

    return sendOk(res, 200, { deleted: true })
  } catch (err) {
    return sendErr(res, 500, 'tags_delete_error', err?.message)
  }
})

module.exports = router
// fim: api/routes/tags.routes.js