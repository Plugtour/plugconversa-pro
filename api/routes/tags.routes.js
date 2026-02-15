// caminho: api/routes/tags.routes.js
const express = require('express')
const { pool } = require('../db')

const router = express.Router()

/**
 * Tabela esperada: tags
 * Campos mínimos:
 * - id (serial pk)
 * - name (text not null)
 * - color (text)
 * - ai_profile (text)
 * - created_at (timestamp default now())
 *
 * Padrão SaaS:
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

// GET /api/tags
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, color, ai_profile, created_at FROM tags ORDER BY id DESC'
    )
    return sendOk(res, 200, { tags: rows })
  } catch (err) {
    return sendErr(res, 500, 'tags_fetch_error', err?.message)
  }
})

// POST /api/tags
router.post('/', async (req, res) => {
  try {
    const { name, color, ai_profile } = req.body

    if (!name || !String(name).trim()) {
      return sendErr(res, 400, 'validation_error', 'name é obrigatório')
    }

    const { rows } = await pool.query(
      `
      INSERT INTO tags (name, color, ai_profile)
      VALUES ($1, $2, $3)
      RETURNING id, name, color, ai_profile, created_at
      `,
      [
        String(name).trim(),
        color ? String(color) : null,
        ai_profile ? String(ai_profile) : null
      ]
    )

    return sendOk(res, 201, { tag: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'tags_create_error', err?.message)
  }
})

// PUT /api/tags/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, color, ai_profile } = req.body

    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }
    if (!name || !String(name).trim()) {
      return sendErr(res, 400, 'validation_error', 'name é obrigatório')
    }

    const { rowCount, rows } = await pool.query(
      `
      UPDATE tags
      SET name = $1,
          color = $2,
          ai_profile = $3
      WHERE id = $4
      RETURNING id, name, color, ai_profile, created_at
      `,
      [
        String(name).trim(),
        color ? String(color) : null,
        ai_profile ? String(ai_profile) : null,
        id
      ]
    )

    if (rowCount === 0) {
      return sendErr(res, 404, 'tag_not_found')
    }

    return sendOk(res, 200, { tag: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'tags_update_error', err?.message)
  }
})

// DELETE /api/tags/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }

    const { rowCount } = await pool.query('DELETE FROM tags WHERE id = $1', [id])

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
