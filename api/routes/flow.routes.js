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

function toStepTypeOrNull(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim().toLowerCase()
  if (!s) return null
  if (s === 'message' || s === 'condition' || s === 'wait') return s
  return null
}

function normalizeStepType(v) {
  const t = String(v || '').trim().toLowerCase()
  return t === 'condition' || t === 'wait' || t === 'message' ? t : 'message'
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

async function ensureStepBelongsToClientAndFlow(clientId, flowId, stepId) {
  if (!stepId) return true
  const id = Number(stepId)
  if (!Number.isFinite(id) || id <= 0) return false

  const { rows } = await pool.query(
    `SELECT 1
     FROM public.flow_steps
     WHERE client_id = $1 AND flow_id = $2 AND id = $3
     LIMIT 1`,
    [clientId, flowId, id]
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
      `SELECT
         id, client_id, flow_id,
         title, message,
         type,
         next_step_id, condition_true_id, condition_false_id,
         position, created_at
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

    const typeRaw = req.body?.type
    const type = typeRaw === undefined ? 'message' : toStepTypeOrNull(typeRaw)
    if (!type) return res.status(400).json({ ok: false, error: 'type_invalid' })

    const title = toTextOrNull(req.body?.title)
    const message = toTextOrNull(req.body?.message)

    if (!title) return res.status(400).json({ ok: false, error: 'title_required' })

    // ✅ message obrigatório apenas para "message"
    if (type === 'message' && !message) {
      return res.status(400).json({ ok: false, error: 'message_required' })
    }

    const pos = toPosIntOrNull(req.body?.position) ?? 0

    const nextStepId = toIdOrNull(req.body?.next_step_id)
    const conditionTrueId = toIdOrNull(req.body?.condition_true_id)
    const conditionFalseId = toIdOrNull(req.body?.condition_false_id)

    // ✅ referências devem ser da mesma flow + client
    if (nextStepId) {
      const okRef = await ensureStepBelongsToClientAndFlow(req.clientId, flowId, nextStepId)
      if (!okRef) return res.status(404).json({ ok: false, error: 'next_step_not_found' })
    }
    if (conditionTrueId) {
      const okRef = await ensureStepBelongsToClientAndFlow(req.clientId, flowId, conditionTrueId)
      if (!okRef) return res.status(404).json({ ok: false, error: 'condition_true_not_found' })
    }
    if (conditionFalseId) {
      const okRef = await ensureStepBelongsToClientAndFlow(req.clientId, flowId, conditionFalseId)
      if (!okRef) return res.status(404).json({ ok: false, error: 'condition_false_not_found' })
    }

    const { rows } = await pool.query(
      `INSERT INTO public.flow_steps (
         client_id, flow_id, title, message, type,
         next_step_id, condition_true_id, condition_false_id,
         position
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING
         id, client_id, flow_id,
         title, message, type,
         next_step_id, condition_true_id, condition_false_id,
         position, created_at`,
      [
        req.clientId,
        flowId,
        title,
        // ✅ para condition/wait pode ser null
        type === 'message' ? message : message,
        type,
        nextStepId,
        conditionTrueId,
        conditionFalseId,
        pos
      ]
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

    const hasType = req.body?.type !== undefined
    const hasNext = req.body?.next_step_id !== undefined
    const hasTrue = req.body?.condition_true_id !== undefined
    const hasFalse = req.body?.condition_false_id !== undefined

    if (!hasTitle && !hasMessage && !hasPosition && !hasType && !hasNext && !hasTrue && !hasFalse) {
      return res.status(400).json({ ok: false, error: 'nothing_to_update' })
    }

    // 🔎 pega dados atuais (para validar mudança de tipo e refs no mesmo fluxo)
    const stepInfo = await pool.query(
      `SELECT id, flow_id, type, message
       FROM public.flow_steps
       WHERE client_id = $1 AND id = $2
       LIMIT 1`,
      [req.clientId, id]
    )
    if (!stepInfo.rows[0]) return res.status(404).json({ ok: false, error: 'step_not_found' })

    const flowId = Number(stepInfo.rows[0].flow_id)
    const currentType = normalizeStepType(stepInfo.rows[0].type)
    const currentMessage = toTextOrNull(stepInfo.rows[0].message)

    const titleVal = hasTitle ? toTextOrNull(req.body?.title) : null
    const messageVal = hasMessage ? toTextOrNull(req.body?.message) : null
    const posVal = hasPosition ? toPosIntOrNull(req.body?.position) : null

    const typeVal = hasType ? toStepTypeOrNull(req.body?.type) : null
    if (hasType && !typeVal) return res.status(400).json({ ok: false, error: 'type_invalid' })

    const nextVal = hasNext ? toIdOrNull(req.body?.next_step_id) : null
    const trueVal = hasTrue ? toIdOrNull(req.body?.condition_true_id) : null
    const falseVal = hasFalse ? toIdOrNull(req.body?.condition_false_id) : null

    // ✅ null explícito para limpar campos (ex: next_step_id: null)
    const willSetNextNull =
      hasNext && (req.body?.next_step_id === null || String(req.body?.next_step_id).trim() === '')
    const willSetTrueNull =
      hasTrue && (req.body?.condition_true_id === null || String(req.body?.condition_true_id).trim() === '')
    const willSetFalseNull =
      hasFalse && (req.body?.condition_false_id === null || String(req.body?.condition_false_id).trim() === '')

    // ✅ evita self-reference
    if (hasNext && nextVal && nextVal === id) return res.status(400).json({ ok: false, error: 'next_step_invalid' })
    if (hasTrue && trueVal && trueVal === id)
      return res.status(400).json({ ok: false, error: 'condition_true_invalid' })
    if (hasFalse && falseVal && falseVal === id)
      return res.status(400).json({ ok: false, error: 'condition_false_invalid' })

    // ✅ valida referências (mesmo flow + client)
    if (hasNext && !willSetNextNull && nextVal) {
      const okRef = await ensureStepBelongsToClientAndFlow(req.clientId, flowId, nextVal)
      if (!okRef) return res.status(404).json({ ok: false, error: 'next_step_not_found' })
    }
    if (hasTrue && !willSetTrueNull && trueVal) {
      const okRef = await ensureStepBelongsToClientAndFlow(req.clientId, flowId, trueVal)
      if (!okRef) return res.status(404).json({ ok: false, error: 'condition_true_not_found' })
    }
    if (hasFalse && !willSetFalseNull && falseVal) {
      const okRef = await ensureStepBelongsToClientAndFlow(req.clientId, flowId, falseVal)
      if (!okRef) return res.status(404).json({ ok: false, error: 'condition_false_not_found' })
    }

    // ✅ valida regra: se virar "message", precisa ter message final
    const nextType = hasType ? normalizeStepType(typeVal) : currentType

    // message final será:
    // - se veio no body: messageVal (pode ser null para limpar)
    // - senão: mantém currentMessage
    const finalMessage = hasMessage ? messageVal : currentMessage

    if (nextType === 'message' && !finalMessage) {
      return res.status(400).json({ ok: false, error: 'message_required' })
    }

    const { rows } = await pool.query(
      `UPDATE public.flow_steps
       SET
         title = COALESCE($3, title),
         message = CASE WHEN $4 THEN $5 ELSE message END,
         type = COALESCE($6, type),

         next_step_id = CASE WHEN $7 THEN NULL ELSE COALESCE($8, next_step_id) END,
         condition_true_id = CASE WHEN $9 THEN NULL ELSE COALESCE($10, condition_true_id) END,
         condition_false_id = CASE WHEN $11 THEN NULL ELSE COALESCE($12, condition_false_id) END,

         position = COALESCE($13, position)
       WHERE client_id = $1 AND id = $2
       RETURNING
         id, client_id, flow_id,
         title, message, type,
         next_step_id, condition_true_id, condition_false_id,
         position, created_at`,
      [
        req.clientId,
        id,

        titleVal,

        // message: set explícito só quando veio no body (permite limpar com null)
        hasMessage,
        messageVal,

        typeVal,

        willSetNextNull,
        nextVal,

        willSetTrueNull,
        trueVal,

        willSetFalseNull,
        falseVal,

        posVal
      ]
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
