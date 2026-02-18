// caminho: api/routes/flow.routes.js
const express = require('express')
const router = express.Router()
const { pool } = require('../db')

function jsonError(res, status, error, err) {
  // ✅ ajuda a enxergar no terminal a causa real do 500
  console.error('[flow.routes]', error, {
    message: err?.message,
    code: err?.code,
    detail: err?.detail,
    where: err?.where
  })

  return res.status(status).json({
    ok: false,
    error,
    details: {
      message: err?.message,
      code: err?.code,
      severity: err?.severity
    }
  })
}

function getClientId(req) {
  const h = req.headers['x-client-id']
  const q = req.query?.client_id
  const b = req.body?.client_id

  const raw = h ?? q ?? b
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function requireClientId(req, res, next) {
  const clientId = getClientId(req)
  if (!clientId) {
    return res.status(400).json({
      ok: false,
      error: 'client_id_required'
    })
  }
  req.clientId = clientId
  next()
}

function toPosIntOrNull(v) {
  if (v === undefined || v === null) return null
  if (String(v).trim() === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.trunc(n))
}

function toIdOrNull(v) {
  if (v === undefined || v === null) return null
  if (String(v).trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

function toTextOrNull(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

async function ensureFolderBelongsToClient(clientId, folderId) {
  if (!folderId) return true
  const id = Number(folderId)
  if (!Number.isFinite(id) || id <= 0) return false

  const { rows } = await pool.query(
    `SELECT 1 FROM public.flow_folders WHERE client_id = $1 AND id = $2 LIMIT 1`,
    [clientId, id]
  )
  return !!rows[0]
}

async function ensureFlowBelongsToClient(clientId, flowId) {
  const id = Number(flowId)
  if (!Number.isFinite(id) || id <= 0) return false

  const { rows } = await pool.query(
    `SELECT 1 FROM public.flows WHERE client_id = $1 AND id = $2 LIMIT 1`,
    [clientId, id]
  )
  return !!rows[0]
}

/* ===========================
   FOLDERS
=========================== */

// listar pastas
router.get('/folders', requireClientId, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM public.flow_folders
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [req.clientId]
    )

    return res.json({ ok: true, data: rows })
  } catch (err) {
    return jsonError(res, 500, 'list_folders_error', err)
  }
})

// criar pasta
router.post('/folders', requireClientId, async (req, res) => {
  try {
    const name = toTextOrNull(req.body?.name)

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: 'name_required'
      })
    }

    const { rows } = await pool.query(
      `INSERT INTO public.flow_folders (client_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [req.clientId, name]
    )

    return res.json({ ok: true, data: rows[0] })
  } catch (err) {
    return jsonError(res, 500, 'create_folder_error', err)
  }
})

/* ===========================
   FLOWS
=========================== */

// listar fluxos (opcionalmente por pasta)
router.get('/', requireClientId, async (req, res) => {
  try {
    const folderId = toIdOrNull(req.query?.folder_id)
    const hasFolderFilter = !!folderId

    const { rows } = await pool.query(
      hasFolderFilter
        ? `SELECT * FROM public.flows
           WHERE client_id = $1 AND folder_id = $2
           ORDER BY created_at DESC`
        : `SELECT * FROM public.flows
           WHERE client_id = $1
           ORDER BY created_at DESC`,
      hasFolderFilter ? [req.clientId, folderId] : [req.clientId]
    )

    return res.json({ ok: true, data: rows })
  } catch (err) {
    return jsonError(res, 500, 'list_flows_error', err)
  }
})

// criar fluxo
router.post('/', requireClientId, async (req, res) => {
  try {
    const name = toTextOrNull(req.body?.name)
    const safeFolderId = toIdOrNull(req.body?.folder_id)

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: 'name_required'
      })
    }

    if (safeFolderId) {
      const okFolder = await ensureFolderBelongsToClient(req.clientId, safeFolderId)
      if (!okFolder) return res.status(404).json({ ok: false, error: 'folder_not_found' })
    }

    const { rows } = await pool.query(
      `INSERT INTO public.flows (client_id, folder_id, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.clientId, safeFolderId, name]
    )

    return res.json({ ok: true, data: rows[0] })
  } catch (err) {
    return jsonError(res, 500, 'create_flow_error', err)
  }
})

/* ===========================
   STEPS
=========================== */

// listar etapas de um fluxo
router.get('/:flowId/steps', requireClientId, async (req, res) => {
  try {
    const flowId = toIdOrNull(req.params.flowId)
    if (!flowId) {
      return res.status(400).json({ ok: false, error: 'flow_id_invalid' })
    }

    const okFlow = await ensureFlowBelongsToClient(req.clientId, flowId)
    if (!okFlow) return res.status(404).json({ ok: false, error: 'flow_not_found' })

    const { rows } = await pool.query(
      `SELECT id, client_id, flow_id, title, message, position, created_at
       FROM public.flow_steps
       WHERE client_id = $1 AND flow_id = $2
       ORDER BY position ASC, id ASC`,
      [req.clientId, flowId]
    )

    return res.json({ ok: true, data: rows })
  } catch (err) {
    return jsonError(res, 500, 'list_steps_error', err)
  }
})

// criar etapa em um fluxo
router.post('/:flowId/steps', requireClientId, async (req, res) => {
  try {
    const flowId = toIdOrNull(req.params.flowId)
    if (!flowId) {
      return res.status(400).json({ ok: false, error: 'flow_id_invalid' })
    }

    const okFlow = await ensureFlowBelongsToClient(req.clientId, flowId)
    if (!okFlow) return res.status(404).json({ ok: false, error: 'flow_not_found' })

    const title = toTextOrNull(req.body?.title)
    const message = toTextOrNull(req.body?.message)

    if (!title) return res.status(400).json({ ok: false, error: 'title_required' })
    if (!message) return res.status(400).json({ ok: false, error: 'message_required' })

    const pos = toPosIntOrNull(req.body?.position) ?? 0

    const { rows } = await pool.query(
      `INSERT INTO public.flow_steps (client_id, flow_id, title, message, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, client_id, flow_id, title, message, position, created_at`,
      [req.clientId, flowId, title, message, pos]
    )

    return res.json({ ok: true, data: rows[0] })
  } catch (err) {
    return jsonError(res, 500, 'create_step_error', err)
  }
})

// editar etapa
router.put('/steps/:id', requireClientId, async (req, res) => {
  try {
    const id = toIdOrNull(req.params.id)
    if (!id) {
      return res.status(400).json({ ok: false, error: 'step_id_invalid' })
    }

    const hasTitle = req.body?.title !== undefined
    const hasMessage = req.body?.message !== undefined
    const hasPosition = req.body?.position !== undefined

    if (!hasTitle && !hasMessage && !hasPosition) {
      return res.status(400).json({ ok: false, error: 'nothing_to_update' })
    }

    const titleVal = hasTitle ? toTextOrNull(req.body?.title) : null
    const messageVal = hasMessage ? toTextOrNull(req.body?.message) : null
    const posVal = hasPosition ? toPosIntOrNull(req.body?.position) : null

    const { rows } = await pool.query(
      `UPDATE public.flow_steps
       SET
         title = COALESCE($3, title),
         message = COALESCE($4, message),
         position = COALESCE($5, position)
       WHERE client_id = $1 AND id = $2
       RETURNING id, client_id, flow_id, title, message, position, created_at`,
      [req.clientId, id, titleVal, messageVal, posVal]
    )

    if (!rows[0]) return res.status(404).json({ ok: false, error: 'step_not_found' })

    return res.json({ ok: true, data: rows[0] })
  } catch (err) {
    return jsonError(res, 500, 'update_step_error', err)
  }
})

// excluir etapa
router.delete('/steps/:id', requireClientId, async (req, res) => {
  try {
    const id = toIdOrNull(req.params.id)
    if (!id) {
      return res.status(400).json({ ok: false, error: 'step_id_invalid' })
    }

    const { rows } = await pool.query(
      `DELETE FROM public.flow_steps
       WHERE client_id = $1 AND id = $2
       RETURNING id`,
      [req.clientId, id]
    )

    if (!rows[0]) return res.status(404).json({ ok: false, error: 'step_not_found' })

    return res.json({ ok: true, data: { id: rows[0].id } })
  } catch (err) {
    return jsonError(res, 500, 'delete_step_error', err)
  }
})

module.exports = router
// fim: api/routes/flow.routes.js
