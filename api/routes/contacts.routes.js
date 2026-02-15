// caminho: api/routes/contacts.routes.js
const express = require('express')
const { pool } = require('../db')

const router = express.Router()

/**
 * Tabela: contacts
 * Campos:
 * - id (serial pk)
 * - name (text not null)
 * - phone (text not null)
 * - notes (text)
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

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, phone, notes, created_at FROM contacts ORDER BY id DESC'
    )

    return sendOk(res, 200, { contacts: rows })
  } catch (err) {
    return sendErr(res, 500, 'contacts_fetch_error', err?.message)
  }
})

// POST /api/contacts
router.post('/', async (req, res) => {
  try {
    const { name, phone, notes } = req.body

    if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
      return sendErr(res, 400, 'validation_error', 'name e phone são obrigatórios')
    }

    const { rows } = await pool.query(
      `
      INSERT INTO contacts (name, phone, notes)
      VALUES ($1, $2, $3)
      RETURNING id, name, phone, notes, created_at
      `,
      [String(name).trim(), String(phone).trim(), notes ? String(notes) : null]
    )

    return sendOk(res, 201, { contact: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'contacts_create_error', err?.message)
  }
})

// PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { name, phone, notes } = req.body

    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }
    if (!name || !String(name).trim() || !phone || !String(phone).trim()) {
      return sendErr(res, 400, 'validation_error', 'name e phone são obrigatórios')
    }

    const { rowCount, rows } = await pool.query(
      `
      UPDATE contacts
      SET name = $1,
          phone = $2,
          notes = $3
      WHERE id = $4
      RETURNING id, name, phone, notes, created_at
      `,
      [String(name).trim(), String(phone).trim(), notes ? String(notes) : null, id]
    )

    if (rowCount === 0) {
      return sendErr(res, 404, 'contact_not_found')
    }

    return sendOk(res, 200, { contact: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'contacts_update_error', err?.message)
  }
})

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isFinite(id) || id <= 0) {
      return sendErr(res, 400, 'validation_error', 'id inválido')
    }

    const { rowCount } = await pool.query('DELETE FROM contacts WHERE id = $1', [id])

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
