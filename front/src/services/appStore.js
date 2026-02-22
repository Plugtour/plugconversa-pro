// caminho: front/src/services/appStore.js

/**
 * App Store (localStorage) — PlugConversaPro
 * - Objetivo: integração entre módulos sem backend complexo ainda.
 * - Multi-tenant: separa por clientId.
 * - Dados: campos, etiquetas, respostas rápidas, logs, board do CRM.
 */

const NS = 'pc'

function key(clientId, name) {
  const cid = Number(clientId || 1) || 1
  return `${NS}:${cid}:${name}`
}

function safeParse(v, fallback) {
  try {
    if (!v) return fallback
    return JSON.parse(v)
  } catch {
    return fallback
  }
}

function safeStringify(v) {
  try {
    return JSON.stringify(v)
  } catch {
    return 'null'
  }
}

function getLS(k) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}

function setLS(k, v) {
  try {
    localStorage.setItem(k, v)
  } catch {
    // ignore
  }
}

function nowISO() {
  return new Date().toISOString()
}

function nextId(list) {
  const maxId = Math.max(0, ...(list || []).map((x) => Number(x?.id) || 0))
  return maxId + 1
}

/* =========================
   Campos
========================= */
export function getFields(clientId = 1) {
  const k = key(clientId, 'cfg.fields')
  const fallback = [
    { id: 1, name: 'Nome', type: 'text', required: true, active: true, options: [] },
    { id: 2, name: 'Telefone', type: 'phone', required: false, active: true, options: [] },
    { id: 3, name: 'Data da chegada', type: 'date', required: false, active: true, options: [] },
    { id: 4, name: 'Data da saída', type: 'date', required: false, active: true, options: [] }
  ]
  return safeParse(getLS(k), fallback)
}

export function setFields(clientId = 1, fields = []) {
  const k = key(clientId, 'cfg.fields')
  setLS(k, safeStringify(fields || []))
}

/* =========================
   Etiquetas
========================= */
export function getTags(clientId = 1) {
  const k = key(clientId, 'cfg.tags')
  const fallback = [
    { id: 1, name: 'Lead Frio', color: '#64748B', active: true },
    { id: 2, name: 'Lead Morno', color: '#F59E0B', active: true },
    { id: 3, name: 'Lead Quente', color: '#EF4444', active: true },
    { id: 4, name: 'Comprou no site', color: '#10B981', active: true }
  ]
  return safeParse(getLS(k), fallback)
}

export function setTags(clientId = 1, tags = []) {
  const k = key(clientId, 'cfg.tags')
  setLS(k, safeStringify(tags || []))
}

/* =========================
   Respostas rápidas
========================= */
export function getQuickReplies(clientId = 1) {
  const k = key(clientId, 'cfg.quickReplies')
  const fallback = [
    {
      id: 1,
      name: 'Boas-vindas',
      shortcut: '/boasvindas',
      message: 'Olá {{nome}}, tudo bem? Seja bem-vindo(a)! 😊',
      active: true
    }
  ]
  return safeParse(getLS(k), fallback)
}

export function setQuickReplies(clientId = 1, items = []) {
  const k = key(clientId, 'cfg.quickReplies')
  setLS(k, safeStringify(items || []))
}

/* =========================
   Logs
========================= */
export function getLogs(clientId = 1) {
  const k = key(clientId, 'sys.logs')
  const fallback = []
  return safeParse(getLS(k), fallback)
}

export function addLog(clientId = 1, log) {
  const k = key(clientId, 'sys.logs')
  const cur = getLogs(clientId)
  const next = [
    {
      id: nextId(cur),
      date: nowISO(),
      ip: '-',
      user: 'Sistema',
      module: 'Sistema',
      action: 'Evento',
      description: '',
      ...(log || {})
    },
    ...cur
  ].slice(0, 500) // limita pra não explodir storage
  setLS(k, safeStringify(next))
  return next
}

export function logEvent(clientId = 1, { user, module, action, description, ip, meta } = {}) {
  return addLog(clientId, {
    user: user || 'Sistema',
    module: module || 'Sistema',
    action: action || 'Evento',
    description: description || '',
    ip: ip || '-',
    meta: meta || {}
  })
}

/* =========================
   CRM Board (colunas/cards)
========================= */
export function getCrmBoard(clientId = 1) {
  const k = key(clientId, 'crm.board')
  return safeParse(getLS(k), null)
}

export function setCrmBoard(clientId = 1, board) {
  const k = key(clientId, 'crm.board')
  setLS(k, safeStringify(board || null))
}

/* fim: front/src/services/appStore.js */