// caminho: api/routes/index.js
const express = require('express')

const router = express.Router()

/**
 * Roteador central da API
 */

// módulos
const contactsRoutes = require('./contacts.routes')
const tagsRoutes = require('./tags.routes')
const kanbanRoutes = require('./kanban.routes')
const flowRoutes = require('./flow.routes')

// ✅ debug simples pra confirmar mounts carregados
const mounts = []
function mount(path, mod) {
  mounts.push(path)
  router.use(path, mod)
}

// raiz da API
router.get('/', (req, res) => {
  return res.status(200).json({
    ok: true,
    module: 'api-root',
    mounts,
    ts: new Date().toISOString()
  })
})

// debug mounts
router.get('/_debug/mounts', (req, res) => {
  return res.json({ ok: true, mounts })
})

// debug rotas (lista o que estiver registrado no router)
router.get('/_debug/routes', (req, res) => {
  const routes = []
  for (const layer of router.stack || []) {
    if (layer?.route?.path) {
      const methods = Object.keys(layer.route.methods || {}).filter(Boolean)
      routes.push({ path: layer.route.path, methods })
    }
  }
  return res.json({ ok: true, mounts, routes })
})

// rotas
mount('/contacts', contactsRoutes)
mount('/tags', tagsRoutes)
mount('/kanban', kanbanRoutes)
mount('/flow', flowRoutes)

module.exports = router
// fim: api/routes/index.js
