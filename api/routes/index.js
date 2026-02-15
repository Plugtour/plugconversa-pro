// caminho: api/routes/index.js
const express = require('express')

const router = express.Router()

/**
 * Roteador central da API
 * Aqui iremos plugar todos os módulos:
 * - auth.routes
 * - users.routes
 * - contacts.routes
 * - tags.routes
 * - kanban.routes
 * - campaigns.routes
 * - automation.routes
 */

// módulos
const contactsRoutes = require('./contacts.routes')
const tagsRoutes = require('./tags.routes')
const kanbanRoutes = require('./kanban.routes')

// raiz da API
router.get('/', (req, res) => {
  return res.status(200).json({
    ok: true,
    module: 'api-root',
    ts: new Date().toISOString()
  })
})

// rotas
router.use('/contacts', contactsRoutes)
router.use('/tags', tagsRoutes)
router.use('/kanban', kanbanRoutes)

module.exports = router
// fim: api/routes/index.js
