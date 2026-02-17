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

// ✅ Se VITE_API_ORIGIN existir, usa.
// ✅ Se não existir, usa fallback local.
// ✅ Você pode colocar VITE_API_ORIGIN="" para forçar mesma origem.
const ENV_ORIGIN =
  (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_ORIGIN) || ''

const API_ORIGIN = String(ENV_ORIGIN).trim() || 'http://localhost:3000'
const API_PREFIX = '/api'
const DEFAULT_CLIENT_ID = 1

function buildUrl(path, query) {
  const cleanPath = String(path || '')
  const isAbs = /^https?:\/\//i.test(cleanPath)

  // ✅ se for absoluto, usa como veio
  // ✅ se for relativo, monta: {API_ORIGIN}{/api}{/path}
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

export async function apiRequest(path, opts = {}) {
  const { method = 'GET', query, body, headers, clientId = DEFAULT_CLIENT_ID, signal } = opts

  const url = buildUrl(path, query)

  const h = {
    ...(headers || {}),
    'x-client-id': String(clientId ?? DEFAULT_CLIENT_ID)
  }

  const init = {
    method,
    headers: h,
    signal
  }

  if (body !== undefined) {
    if (isFormData(body)) {
      // Não setar Content-Type manualmente em FormData
      init.body = body
    } else {
      init.headers = {
        'content-type': 'application/json',
        ...h
      }
      init.body = JSON.stringify(body)
    }
  }

  const res = await fetch(url, init)
  const payload = await readBodySafe(res)

  if (!res.ok) throw makeError(res, payload)

  return payload
}

export function apiGet(path, opts = {}) {
  return apiRequest(path, { ...opts, method: 'GET' })
}

export function apiPost(path, body, opts = {}) {
  return apiRequest(path, { ...opts, method: 'POST', body })
}

export function apiPut(path, body, opts = {}) {
  return apiRequest(path, { ...opts, method: 'PUT', body })
}

export function apiPatch(path, body, opts = {}) {
  return apiRequest(path, { ...opts, method: 'PATCH', body })
}

export function apiDel(path, opts = {}) {
  return apiRequest(path, { ...opts, method: 'DELETE' })
}

// fim: front/src/services/api.js
