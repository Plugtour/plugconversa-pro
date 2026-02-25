// caminho: api/server.js
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const { testDbConnection } = require('./db')
const apiRouter = require('./routes')

const app = express()

// =========================
// WhatsApp Webhook precisa do RAW body p/ validar assinatura (X-Hub-Signature-256)
// e também NÃO envia x-client-id.
// Então:
// - para /api/whatsapp/webhook: usa express.raw e faz parse manual do JSON
// - para o resto: express.json normal
// =========================
function isWebhookPath(req) {
  const url = String(req.originalUrl || '')
  return url.startsWith('/api/whatsapp/webhook')
}

app.use((req, res, next) => {
  if (!isWebhookPath(req)) return next()

  return express.raw({ type: 'application/json', limit: '2mb' })(req, res, () => {
    // guarda rawBody para assinatura
    req.rawBody = req.body

    // parse JSON para req.body (obj)
    try {
      const buf = req.rawBody
      const txt = buf && buf.length ? buf.toString('utf8') : ''
      req.body = txt ? JSON.parse(txt) : {}
    } catch (e) {
      req.body = {}
    }

    return next()
  })
})

// ===== Middlewares básicos =====
app.use((req, res, next) => {
  if (isWebhookPath(req)) return next()
  return express.json({ limit: '2mb' })(req, res, next)
})
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

function isReqLocalhost(req) {
  const host = String(req.headers.host || '')
  const hostname = String(req.hostname || '')
  return (
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  )
}

// ===== DEV fallback client_id (apenas localhost) =====
app.use((req, res, next) => {
  if (isWebhookPath(req)) return next()

  const h = req.headers['x-client-id']
  const isLocalhost = isReqLocalhost(req)

  // Se não veio header, assume 1 somente em DEV/local
  if ((!h || String(h).trim() === '') && isLocalhost) {
    req.headers['x-client-id'] = '1'
  }

  next()
})

// ===== Normaliza clientId no req + valida =====
app.use((req, res, next) => {
  if (isWebhookPath(req)) return next()

  const raw = req.headers['x-client-id']
  const isLocalhost = isReqLocalhost(req)

  // em produção, se não vier, bloqueia (evita vazar dados entre tenants)
  if (!raw || String(raw).trim() === '') {
    if (!isLocalhost) {
      return res.status(400).json({
        ok: false,
        error: 'missing_client_id',
        message: 'Header x-client-id é obrigatório.'
      })
    }
  }

  const cid = Number(String(raw || '').trim())
  if (!Number.isFinite(cid) || cid <= 0) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_client_id',
      message: 'Header x-client-id inválido.'
    })
  }

  // deixa disponível para as rotas
  req.clientId = cid

  // espelha no response (debug/inspeção)
  res.setHeader('x-client-id', String(cid))

  next()
})

// ✅ LOG simples (debug)
app.use((req, res, next) => {
  const isWebhook = isWebhookPath(req)
  const clientId = req.headers['x-client-id']
  console.log(`[API] ${req.method} ${req.originalUrl} webhook=${isWebhook ? 'yes' : 'no'} x-client-id=${clientId ?? '-'}`)
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