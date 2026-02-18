// caminho: api/server.js
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const { testDbConnection } = require('./db')
const apiRouter = require('./routes')

const app = express()

// ===== Middlewares básicos =====
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// ===== CORS (permite header x-client-id + preflight) =====
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id'],
    exposedHeaders: ['x-client-id']
  })
)


// ===== DEV fallback client_id (apenas localhost) =====
app.use((req, res, next) => {
  const h = req.headers['x-client-id']
  const host = String(req.headers.host || '')
  const isLocalhost =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1'

  // Se não veio header, assume 1 somente em DEV/local
  if ((!h || String(h).trim() === '') && isLocalhost) {
    req.headers['x-client-id'] = '1'
  }

  next()
})

// ✅ LOG simples (debug) — ajuda ver o erro do /flow no terminal
app.use((req, res, next) => {
  const clientId = req.headers['x-client-id']
  console.log(`[API] ${req.method} ${req.originalUrl} x-client-id=${clientId ?? '-'}`)
  next()
})

// ===== Healthcheck (simples) =====
app.get('/health', (req, res) => {
  return res.status(200).json({
    ok: true,
    service: 'plugconversa-api',
    env: process.env.NODE_ENV || 'development',
    ts: new Date().toISOString()
  })
})

// ===== Healthcheck + DB (valida conexão) =====
app.get('/health/db', async (req, res) => {
  try {
    await testDbConnection()
    return res.status(200).json({
      ok: true,
      db: true,
      ts: new Date().toISOString()
    })
  } catch (e) {
    return res.status(500).json({
      ok: false,
      db: false,
      error: e?.message || 'db_error',
      ts: new Date().toISOString()
    })
  }
})

// ===== Rotas da API =====
app.use('/api', apiRouter)

// ===== 404 global =====
app.use((req, res) => {
  return res.status(404).json({
    ok: false,
    error: 'not_found',
    path: req.originalUrl
  })
})

// ===== Error handler global =====
app.use((err, req, res, next) => {
  console.error('[API] erro não tratado ❌', err?.message || err)

  return res.status(500).json({
    ok: false,
    error: 'internal_error',
    message: err?.message || 'Erro interno'
  })
})

// ===== Start =====
async function start() {
  // ✅ testa conexão ao subir (log seguro)
  await testDbConnection()

  const port = Number(process.env.PORT || 3000)
  app.listen(port, () => {
    console.log(`[API] rodando ✅ http://localhost:${port}`)
  })
}

start().catch((err) => {
  console.error('[API] falha ao iniciar ❌', err?.message || err)
  process.exit(1)
})
// fim: api/server.js
