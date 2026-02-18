// caminho: front/src/services/api.js

/**
 * API Client (fetch) — PlugConversaPro
 * - Base URL: por ENV (VITE_API_ORIGIN) ou fallback
 * - Prefixo padrão: /api
 * - Multi-tenant: envia x-client-id (default 1), com override por request
 * - Helpers: apiGet / apiPost / apiPut / apiPatch / apiDel
 *
 * Dica (DEV):
 * - Se você usar proxy do Vite para /api -> http://localhost:3000,
 *   deixe VITE_API_ORIGIN vazio e ele usa mesma origem (evita CORS).
 */

const ENV_ORIGIN =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_ORIGIN) || ''

const API_ORIGIN = String(ENV_ORIGIN).trim() || 'http://localhost:3000'
const API_PREFIX = '/api'
const DEFAULT_CLIENT_ID = 1

function buildUrl(path, query) {
  const cleanPath = String(path || '')
  const isAbs = /^https?:\/\//i.test(cleanPath)

  const base = isAbs
    ? cleanPath
    : `${API_ORIGIN}${cleanPath.startsWith(API_PREFIX) ? '' : API_PREFIX}${
        cleanPath.startsWith('/') ? '' : '/'
      }${cleanPath}`

  const url = new URL(base)

  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue
      url.searchParams.set(k, String(v))
    }
  }

  return url.toString()
}

function isFormData(v) {
  return typeof FormData !== 'undefined' && v instanceof FormData
}

async function readBodySafe(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    try {
      return await res.json()
    } catch {
      return null
    }
  }
  try {
    return await res.text()
  } catch {
    return null
  }
}

function makeError(res, payload) {
  const message =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
    (typeof payload === 'string' && payload) ||
    `HTTP ${res.status}`

  const err = new Error(message)
  err.status = res.status
  err.payload = payload
  return err
}

function makeNetworkError(originalErr, url) {
  const err = new Error(originalErr?.message || 'network_error')
  err.status = 0
  err.payload = { error: 'network_error', url }
  return err
}

// ✅ abort de request anterior (evita corrida no reload)
const inflight = new Map()
function getAbortKey(method, url) {
  return `${method}:${url}`
}

export async function apiRequest(path, opts = {}) {
  const {
    method = 'GET',
    query,
    body,
    headers,
    clientId = DEFAULT_CLIENT_ID,
    signal,
    // ✅ quando true, aborta request anterior com mesma chave
    dedupe = true
  } = opts

  const url = buildUrl(path, query)

  const h = {
    ...(headers || {}),
    'x-client-id': String(clientId ?? DEFAULT_CLIENT_ID)
  }

  let finalSignal = signal
  if (dedupe && typeof AbortController !== 'undefined') {
    const key = getAbortKey(method, url)
    const prev = inflight.get(key)
    if (prev) prev.abort()
    const ac = new AbortController()
    inflight.set(key, ac)
    finalSignal = ac.signal
  }

  const init = {
    method,
    headers: h,
    signal: finalSignal
  }

  if (body !== undefined) {
    if (isFormData(body)) {
      init.body = body
    } else {
      init.headers = {
        'content-type': 'application/json',
        ...h
      }
      init.body = JSON.stringify(body)
    }
  }

  let res
  try {
    res = await fetch(url, init)
  } catch (e) {
    // abort não é erro pro usuário
    if (e?.name === 'AbortError') {
      const err = new Error('aborted')
      err.status = 0
      err.payload = { error: 'aborted', url }
      throw err
    }
    throw makeNetworkError(e, url)
  } finally {
    if (dedupe) {
      const key = getAbortKey(method, url)
      const cur = inflight.get(key)
      // limpa só se ainda for o mesmo controller (evita race)
      // (se mudou, o novo request é quem manda)
      if (cur && cur.signal === finalSignal) inflight.delete(key)
    }
  }

  const payload = await readBodySafe(res)

  if (!res.ok) throw makeError(res, payload)

  return payload
}

export function apiGet(path, opts = {}) {
  return apiRequest(path, { ...opts, method: 'GET' })
}

export function apiPost(path, body, opts = {}) {
  return apiRequest(path, { ...opts, method: 'POST', body, dedupe: false })
}

export function apiPut(path, body, opts = {}) {
  return apiRequest(path, { ...opts, method: 'PUT', body, dedupe: false })
}

export function apiPatch(path, body, opts = {}) {
  return apiRequest(path, { ...opts, method: 'PATCH', body, dedupe: false })
}

export function apiDel(path, opts = {}) {
  return apiRequest(path, { ...opts, method: 'DELETE', dedupe: false })
}

// fim: front/src/services/api.js
