// caminho: front/src/pages/app/inbox/shared/inboxUtils.js
export function safeArr(v) {
  return Array.isArray(v) ? v : []
}

export function pickArrayFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (payload.ok && Array.isArray(payload.data)) return payload.data
  if (payload.data && Array.isArray(payload.data)) return payload.data
  return []
}

export function pickObjFromPayload(payload) {
  if (!payload) return null
  if (payload.ok && payload.data && typeof payload.data === 'object') return payload.data
  if (payload.data && typeof payload.data === 'object') return payload.data
  if (typeof payload === 'object') return payload
  return null
}

export function clampText(v, n = 44) {
  const s = String(v || '')
  if (s.length <= n) return s
  return s.slice(0, n - 1) + '…'
}

export function fmtTime(v) {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function makeInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] || 'U'
  const b = parts[1]?.[0] || ''
  return (a + b).toUpperCase()
}

export function computeSlaKind(lastInboundAt) {
  if (!lastInboundAt) return 'ok'
  const ms = Date.now() - new Date(lastInboundAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'ok'
  const min = ms / 60000
  if (min <= 5) return 'ok'
  if (min <= 15) return 'warn'
  return 'bad'
}

export function scoreLabel(score) {
  const s = Number(score || 0)
  if (s >= 80) return 'Quente'
  if (s >= 50) return 'Morno'
  return 'Frio'
}

export function defaultStageLabel(stageKey) {
  const k = String(stageKey || '').toLowerCase()
  if (k === 'lead') return 'Lead'
  if (k === 'qualificado') return 'Qualificado'
  if (k === 'orcamento') return 'Orçamento'
  if (k === 'negociacao') return 'Negociação'
  if (k === 'fechado') return 'Fechado'
  return 'Lead'
}

export function applyVariables(text, vars) {
  let out = String(text || '')
  for (const [k, v] of Object.entries(vars || {})) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ''))
  }
  return out
}

export function getActiveTokenSlash(text, caretPos) {
  const pos = Number.isFinite(caretPos) ? caretPos : String(text || '').length
  const before = String(text || '').slice(0, pos)
  const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'), before.lastIndexOf('\t'))
  const token = before.slice(lastSpace + 1)
  if (!token.startsWith('/')) return null
  return token
}

export function toMs(v) {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

export function pickLatestMessageText(messages) {
  const arr = Array.isArray(messages) ? messages : []
  if (arr.length === 0) return ''
  let last = arr[0]
  let lastMs = toMs(arr[0]?.created_at) || 0
  for (let i = 1; i < arr.length; i++) {
    const m = arr[i]
    const ms = toMs(m?.created_at) || 0
    if (ms >= lastMs) {
      last = m
      lastMs = ms
    }
  }
  return String(last?.text || '').trim()
}

export function pickConvFallbackSnippet(conv) {
  const c = conv || {}
  const inMs = toMs(c.last_inbound_at)
  const outMs = toMs(c.last_outbound_at)

  if (!inMs && !outMs) return 'Sem mensagens ainda.'
  if (inMs && !outMs) return 'Última mensagem recebida.'
  if (!inMs && outMs) return 'Última mensagem enviada.'
  if (inMs > outMs) return 'Última mensagem recebida.'
  return 'Última mensagem enviada.'
}
// fim: front/src/pages/app/inbox/shared/inboxUtils.js