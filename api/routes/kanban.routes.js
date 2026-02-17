// caminho: api/routes/kanban.routes.js
const express = require('express')
const { pool } = require('../db')

const router = express.Router()

/**
 * Kanban (MVP)
 * Tabelas:
 * - kanban_boards (id, client_id, name, created_at)
 * - kanban_columns (id, board_id, title, position, color, created_at)
 * - kanban_cards (id, column_id, title, description, position, created_at)
 *
 * Multi-tenant (SaaS):
 * - client_id obrigatório (header: x-client-id | query: ?client_id= | body: client_id)
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

/**
 * ✅ Multi-tenant (client_id)
 * Prioridade:
 * 1) header: x-client-id
 * 2) query: ?client_id=
 * 3) body: client_id
 */
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
  if (!clientId) return sendErr(res, 400, 'validation_error', 'client_id é obrigatório')
  req.clientId = clientId
  next()
}

function toInt(x) {
  const n = Number(x)
  return Number.isFinite(n) && n > 0 ? n : null
}

function toStr(x) {
  const s = String(x ?? '').trim()
  return s ? s : null
}

/**
 * Por enquanto: validar só HEX (mais previsível pro UI).
 */
function normalizeColor(input) {
  if (input === undefined || input === null) return null
  const s = String(input).trim()
  if (!s) return null

  const ok = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)
  if (!ok) return null

  return s.toUpperCase()
}

/** valida board do tenant */
async function getBoardOrNull(boardId, clientId) {
  const r = await pool.query(
    `
    SELECT id, client_id, name, created_at
    FROM kanban_boards
    WHERE id = $1 AND client_id = $2
    LIMIT 1
    `,
    [boardId, clientId]
  )
  return r?.rows?.[0] || null
}

/** valida column do tenant (via board) */
async function getColumnOrNull(columnId, clientId) {
  const r = await pool.query(
    `
    SELECT c.id, c.board_id, c.title, c.position, c.color, c.created_at
    FROM kanban_columns c
    JOIN kanban_boards b ON b.id = c.board_id
    WHERE c.id = $1 AND b.client_id = $2
    LIMIT 1
    `,
    [columnId, clientId]
  )
  return r?.rows?.[0] || null
}

/** valida card do tenant (via column -> board) */
async function getCardOrNull(cardId, clientId) {
  const r = await pool.query(
    `
    SELECT k.id, k.column_id, k.title, k.description, k.position, k.created_at
    FROM kanban_cards k
    JOIN kanban_columns c ON c.id = k.column_id
    JOIN kanban_boards b ON b.id = c.board_id
    WHERE k.id = $1 AND b.client_id = $2
    LIMIT 1
    `,
    [cardId, clientId]
  )
  return r?.rows?.[0] || null
}

// =========================
// BOARDS
// =========================

// GET /api/kanban/boards
router.get('/boards', requireClientId, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, client_id, name, created_at
      FROM kanban_boards
      WHERE client_id = $1
      ORDER BY id DESC
      `,
      [req.clientId]
    )
    return sendOk(res, 200, { boards: rows })
  } catch (err) {
    return sendErr(res, 500, 'kanban_boards_fetch_error', err?.message)
  }
})

// POST /api/kanban/boards
router.post('/boards', requireClientId, async (req, res) => {
  try {
    const name = toStr(req.body?.name)
    if (!name) return sendErr(res, 400, 'validation_error', 'name é obrigatório')

    const { rows } = await pool.query(
      `
      INSERT INTO kanban_boards (client_id, name)
      VALUES ($1, $2)
      RETURNING id, client_id, name, created_at
      `,
      [req.clientId, name]
    )

    return sendOk(res, 201, { board: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'kanban_boards_create_error', err?.message)
  }
})

// GET /api/kanban/boards/:boardId  (board + colunas + cards)
router.get('/boards/:boardId', requireClientId, async (req, res) => {
  try {
    const boardId = toInt(req.params.boardId)
    if (!boardId) return sendErr(res, 400, 'validation_error', 'boardId inválido')

    const board = await getBoardOrNull(boardId, req.clientId)
    if (!board) return sendErr(res, 404, 'board_not_found')

    const c = await pool.query(
      `
      SELECT id, board_id, title, position, color, created_at
      FROM kanban_columns
      WHERE board_id = $1
      ORDER BY position ASC, id ASC
      `,
      [boardId]
    )

    const columns = c?.rows || []
    const colIds = columns.map((x) => x.id)

    let cards = []
    if (colIds.length > 0) {
      const k = await pool.query(
        `
        SELECT id, column_id, title, description, position, created_at
        FROM kanban_cards
        WHERE column_id = ANY($1::int[])
        ORDER BY column_id ASC, position ASC, id ASC
        `,
        [colIds]
      )
      cards = k?.rows || []
    }

    return sendOk(res, 200, { board, columns, cards })
  } catch (err) {
    return sendErr(res, 500, 'kanban_board_fetch_error', err?.message)
  }
})

// =========================
// COLUMNS
// =========================

// POST /api/kanban/boards/:boardId/columns  { title, color? }
router.post('/boards/:boardId/columns', requireClientId, async (req, res) => {
  try {
    const boardId = toInt(req.params.boardId)
    if (!boardId) return sendErr(res, 400, 'validation_error', 'boardId inválido')

    const title = toStr(req.body?.title)
    if (!title) return sendErr(res, 400, 'validation_error', 'title é obrigatório')

    const colorRaw = req.body?.color
    const color = normalizeColor(colorRaw) || '#111111'

    if (colorRaw !== undefined && colorRaw !== null && String(colorRaw).trim() && !normalizeColor(colorRaw)) {
      return sendErr(res, 400, 'validation_error', 'color inválida. Use HEX (#RGB ou #RRGGBB).')
    }

    const board = await getBoardOrNull(boardId, req.clientId)
    if (!board) return sendErr(res, 404, 'board_not_found')

    const pos = await pool.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM kanban_columns WHERE board_id = $1`,
      [boardId]
    )
    const nextPos = Number(pos?.rows?.[0]?.next_pos || 1)

    const { rows } = await pool.query(
      `
      INSERT INTO kanban_columns (board_id, title, position, color)
      VALUES ($1, $2, $3, $4)
      RETURNING id, board_id, title, position, color, created_at
      `,
      [boardId, title, nextPos, color]
    )

    return sendOk(res, 201, { column: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'kanban_column_create_error', err?.message)
  }
})

// PUT /api/kanban/columns/:columnId  { title?, color? }
router.put('/columns/:columnId', requireClientId, async (req, res) => {
  try {
    const columnId = toInt(req.params.columnId)
    if (!columnId) return sendErr(res, 400, 'validation_error', 'columnId inválido')

    const col = await getColumnOrNull(columnId, req.clientId)
    if (!col) return sendErr(res, 404, 'column_not_found')

    const titleRaw = req.body?.title
    const colorRaw = req.body?.color

    const nextTitle = titleRaw !== undefined ? toStr(titleRaw) : null
    const nextColor = colorRaw !== undefined ? normalizeColor(colorRaw) : null

    if (titleRaw === undefined && colorRaw === undefined) {
      return sendErr(res, 400, 'validation_error', 'envie title e/ou color')
    }

    if (titleRaw !== undefined && !nextTitle) {
      return sendErr(res, 400, 'validation_error', 'title é obrigatório')
    }

    if (colorRaw !== undefined && colorRaw !== null && String(colorRaw).trim() && !nextColor) {
      return sendErr(res, 400, 'validation_error', 'color inválida. Use HEX (#RGB ou #RRGGBB).')
    }

    const finalTitle = nextTitle !== null ? nextTitle : col.title
    const finalColor =
      nextColor !== null
        ? nextColor
        : (colorRaw !== undefined && !String(colorRaw ?? '').trim() ? col.color : col.color)

    const { rows } = await pool.query(
      `
      UPDATE kanban_columns
      SET title = $1,
          color = $2
      WHERE id = $3
      RETURNING id, board_id, title, position, color, created_at
      `,
      [finalTitle, finalColor, columnId]
    )

    return sendOk(res, 200, { column: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'kanban_column_update_error', err?.message)
  }
})

// DELETE /api/kanban/columns/:columnId
router.delete('/columns/:columnId', requireClientId, async (req, res) => {
  const client = await pool.connect()
  try {
    const columnId = toInt(req.params.columnId)
    if (!columnId) return sendErr(res, 400, 'validation_error', 'columnId inválido')

    const col = await getColumnOrNull(columnId, req.clientId)
    if (!col) return sendErr(res, 404, 'column_not_found')

    await client.query('BEGIN')
    await client.query(`DELETE FROM kanban_cards WHERE column_id = $1`, [columnId])
    await client.query(`DELETE FROM kanban_columns WHERE id = $1`, [columnId])
    await client.query('COMMIT')

    return sendOk(res, 200, { deleted: true })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    return sendErr(res, 500, 'kanban_column_delete_error', err?.message)
  } finally {
    client.release()
  }
})

// PUT /api/kanban/boards/:boardId/columns/reorder  { ordered_ids: [int,...] }
router.put('/boards/:boardId/columns/reorder', requireClientId, async (req, res) => {
  const client = await pool.connect()
  try {
    const boardId = toInt(req.params.boardId)
    if (!boardId) return sendErr(res, 400, 'validation_error', 'boardId inválido')

    const raw = Array.isArray(req.body?.ordered_ids) ? req.body.ordered_ids : null
    if (!raw || raw.length === 0) return sendErr(res, 400, 'validation_error', 'ordered_ids é obrigatório')

    // ✅ normaliza + valida duplicados
    const ordered = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    if (ordered.length !== raw.length) {
      return sendErr(res, 400, 'validation_error', 'ordered_ids deve conter apenas inteiros positivos')
    }
    const uniq = new Set(ordered)
    if (uniq.size !== ordered.length) {
      return sendErr(res, 400, 'validation_error', 'ordered_ids contém ids duplicados')
    }

    const board = await getBoardOrNull(boardId, req.clientId)
    if (!board) return sendErr(res, 404, 'board_not_found')

    const chk = await pool.query(
      `
      SELECT id
      FROM kanban_columns
      WHERE board_id = $1 AND id = ANY($2::int[])
      `,
      [boardId, ordered]
    )

    if ((chk?.rows?.length || 0) !== ordered.length) {
      return sendErr(res, 400, 'validation_error', 'ordered_ids contém colunas inválidas')
    }

    await client.query('BEGIN')
    for (let i = 0; i < ordered.length; i++) {
      await client.query(`UPDATE kanban_columns SET position = $1 WHERE id = $2`, [i + 1, ordered[i]])
    }
    await client.query('COMMIT')

    return sendOk(res, 200, { reordered: true })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    return sendErr(res, 500, 'kanban_columns_reorder_error', err?.message)
  } finally {
    client.release()
  }
})

// =========================
// CARDS
// =========================

// POST /api/kanban/columns/:columnId/cards  { title, description? }
router.post('/columns/:columnId/cards', requireClientId, async (req, res) => {
  try {
    const columnId = toInt(req.params.columnId)
    if (!columnId) return sendErr(res, 400, 'validation_error', 'columnId inválido')

    const title = toStr(req.body?.title)
    const description = toStr(req.body?.description)

    if (!title) return sendErr(res, 400, 'validation_error', 'title é obrigatório')

    const col = await getColumnOrNull(columnId, req.clientId)
    if (!col) return sendErr(res, 404, 'column_not_found')

    const pos = await pool.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM kanban_cards WHERE column_id = $1`,
      [columnId]
    )
    const nextPos = Number(pos?.rows?.[0]?.next_pos || 1)

    const { rows } = await pool.query(
      `
      INSERT INTO kanban_cards (column_id, title, description, position)
      VALUES ($1, $2, $3, $4)
      RETURNING id, column_id, title, description, position, created_at
      `,
      [columnId, title, description || null, nextPos]
    )

    return sendOk(res, 201, { card: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'kanban_card_create_error', err?.message)
  }
})

// PUT /api/kanban/cards/:cardId  { title, description? }
router.put('/cards/:cardId', requireClientId, async (req, res) => {
  try {
    const cardId = toInt(req.params.cardId)
    if (!cardId) return sendErr(res, 400, 'validation_error', 'cardId inválido')

    const title = toStr(req.body?.title)
    const description = toStr(req.body?.description)

    if (!title) return sendErr(res, 400, 'validation_error', 'title é obrigatório')

    const card = await getCardOrNull(cardId, req.clientId)
    if (!card) return sendErr(res, 404, 'card_not_found')

    const { rows } = await pool.query(
      `
      UPDATE kanban_cards
      SET title = $1,
          description = $2
      WHERE id = $3
      RETURNING id, column_id, title, description, position, created_at
      `,
      [title, description || null, cardId]
    )

    return sendOk(res, 200, { card: rows[0] })
  } catch (err) {
    return sendErr(res, 500, 'kanban_card_update_error', err?.message)
  }
})

// DELETE /api/kanban/cards/:cardId
router.delete('/cards/:cardId', requireClientId, async (req, res) => {
  try {
    const cardId = toInt(req.params.cardId)
    if (!cardId) return sendErr(res, 400, 'validation_error', 'cardId inválido')

    const card = await getCardOrNull(cardId, req.clientId)
    if (!card) return sendErr(res, 404, 'card_not_found')

    await pool.query(`DELETE FROM kanban_cards WHERE id = $1`, [cardId])
    return sendOk(res, 200, { deleted: true })
  } catch (err) {
    return sendErr(res, 500, 'kanban_card_delete_error', err?.message)
  }
})

// PUT /api/kanban/columns/:columnId/cards/reorder  { ordered_ids: [int,...] }
router.put('/columns/:columnId/cards/reorder', requireClientId, async (req, res) => {
  const client = await pool.connect()
  try {
    const columnId = toInt(req.params.columnId)
    if (!columnId) return sendErr(res, 400, 'validation_error', 'columnId inválido')

    const raw = Array.isArray(req.body?.ordered_ids) ? req.body.ordered_ids : null
    if (!raw || raw.length === 0) return sendErr(res, 400, 'validation_error', 'ordered_ids é obrigatório')

    const ordered = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0)
    if (ordered.length !== raw.length) {
      return sendErr(res, 400, 'validation_error', 'ordered_ids deve conter apenas inteiros positivos')
    }
    const uniq = new Set(ordered)
    if (uniq.size !== ordered.length) {
      return sendErr(res, 400, 'validation_error', 'ordered_ids contém ids duplicados')
    }

    const col = await getColumnOrNull(columnId, req.clientId)
    if (!col) return sendErr(res, 404, 'column_not_found')

    const chk = await pool.query(
      `
      SELECT id
      FROM kanban_cards
      WHERE column_id = $1 AND id = ANY($2::int[])
      `,
      [columnId, ordered]
    )

    if ((chk?.rows?.length || 0) !== ordered.length) {
      return sendErr(res, 400, 'validation_error', 'ordered_ids contém cards inválidos')
    }

    await client.query('BEGIN')
    for (let i = 0; i < ordered.length; i++) {
      await client.query(`UPDATE kanban_cards SET position = $1 WHERE id = $2`, [i + 1, ordered[i]])
    }
    await client.query('COMMIT')

    return sendOk(res, 200, { reordered: true })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    return sendErr(res, 500, 'kanban_cards_reorder_error', err?.message)
  } finally {
    client.release()
  }
})

// PUT /api/kanban/cards/:cardId/move  { to_column_id, to_position }
router.put('/cards/:cardId/move', requireClientId, async (req, res) => {
  const client = await pool.connect()
  try {
    const cardId = toInt(req.params.cardId)
    if (!cardId) return sendErr(res, 400, 'validation_error', 'cardId inválido')

    const toColumnId = toInt(req.body?.to_column_id)
    const toPosRaw = Number(req.body?.to_position)

    if (!toColumnId) return sendErr(res, 400, 'validation_error', 'to_column_id é obrigatório')

    const card = await getCardOrNull(cardId, req.clientId)
    if (!card) return sendErr(res, 404, 'card_not_found')

    const toCol = await getColumnOrNull(toColumnId, req.clientId)
    if (!toCol) return sendErr(res, 404, 'target_column_not_found')

    const fromColumnId = Number(card.column_id)
    const fromPos = Number(card.position)

    let toPos = Number.isFinite(toPosRaw) && toPosRaw > 0 ? Math.floor(toPosRaw) : null

    await client.query('BEGIN')

    // ✅ clamp por CONTAGEM (evita bug de "n+1" na mesma coluna)
    if (fromColumnId === toColumnId) {
      const cntR = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM kanban_cards WHERE column_id = $1 AND id <> $2`,
        [toColumnId, cardId]
      )
      const cnt = Number(cntR?.rows?.[0]?.cnt || 0)
      const maxInsert = cnt + 1 // posições válidas: 1..n

      if (!toPos) toPos = maxInsert
      if (toPos < 1) toPos = 1
      if (toPos > maxInsert) toPos = maxInsert

      if (toPos === fromPos) {
        const r = await client.query(
          `
          SELECT id, column_id, title, description, position, created_at
          FROM kanban_cards
          WHERE id = $1
          `,
          [cardId]
        )
        await client.query('COMMIT')
        return sendOk(res, 200, { card: r?.rows?.[0] })
      }

      if (toPos > fromPos) {
        await client.query(
          `
          UPDATE kanban_cards
          SET position = position - 1
          WHERE column_id = $1
            AND position > $2
            AND position <= $3
            AND id <> $4
          `,
          [fromColumnId, fromPos, toPos, cardId]
        )
      } else {
        await client.query(
          `
          UPDATE kanban_cards
          SET position = position + 1
          WHERE column_id = $1
            AND position >= $2
            AND position < $3
            AND id <> $4
          `,
          [fromColumnId, toPos, fromPos, cardId]
        )
      }

      const moved = await client.query(
        `
        UPDATE kanban_cards
        SET position = $1
        WHERE id = $2
        RETURNING id, column_id, title, description, position, created_at
        `,
        [toPos, cardId]
      )

      await client.query('COMMIT')
      return sendOk(res, 200, { card: moved?.rows?.[0] })
    }

    // coluna diferente
    const cntR = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM kanban_cards WHERE column_id = $1`,
      [toColumnId]
    )
    const cnt = Number(cntR?.rows?.[0]?.cnt || 0)
    const maxInsert = cnt + 1 // pode inserir no fim

    if (!toPos) toPos = maxInsert
    if (toPos < 1) toPos = 1
    if (toPos > maxInsert) toPos = maxInsert

    await client.query(
      `
      UPDATE kanban_cards
      SET position = position + 1
      WHERE column_id = $1
        AND position >= $2
      `,
      [toColumnId, toPos]
    )

    await client.query(
      `
      UPDATE kanban_cards
      SET position = position - 1
      WHERE column_id = $1
        AND position > $2
      `,
      [fromColumnId, fromPos]
    )

    const moved = await client.query(
      `
      UPDATE kanban_cards
      SET column_id = $1,
          position = $2
      WHERE id = $3
      RETURNING id, column_id, title, description, position, created_at
      `,
      [toColumnId, toPos, cardId]
    )

    await client.query('COMMIT')
    return sendOk(res, 200, { card: moved?.rows?.[0] })
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    return sendErr(res, 500, 'kanban_card_move_error', err?.message)
  } finally {
    client.release()
  }
})

module.exports = router
// fim: api/routes/kanban.routes.js
