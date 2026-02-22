// caminho: front/src/pages/app/inbox/Inbox.jsx
import { useMemo, useRef, useState } from 'react'
import './inbox.css'
import { getQuickReplies, logEvent } from '../../../services/appStore'

function normalize(v) {
  return String(v || '')
}

function applyVariables(text, vars) {
  let out = String(text || '')
  for (const [k, v] of Object.entries(vars || {})) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ''))
  }
  return out
}

function getActiveTokenSlash(text, caretPos) {
  const pos = Number.isFinite(caretPos) ? caretPos : String(text || '').length
  const before = String(text || '').slice(0, pos)
  const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'), before.lastIndexOf('\t'))
  const token = before.slice(lastSpace + 1)
  if (!token.startsWith('/')) return null
  return token
}

export default function Inbox() {
  const clientId = 1

  // mock simples (até integrar contatos/CRM)
  const activeContact = useMemo(
    () => ({
      nome: 'Marcelo',
      empresa: 'PlugConversa Pro',
      telefone: '(51) 99999-9999'
    }),
    []
  )

  const inputRef = useRef(null)

  const [message, setMessage] = useState('')
  const [caret, setCaret] = useState(0)

  const replies = useMemo(() => getQuickReplies(clientId).filter((x) => x?.active), [clientId])

  const activeSlashToken = useMemo(() => getActiveTokenSlash(message, caret), [message, caret])

  const filteredSuggestions = useMemo(() => {
    if (!activeSlashToken) return []
    const q = activeSlashToken.toLowerCase()
    return replies
      .filter((r) => String(r.shortcut || '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [activeSlashToken, replies])

  const showSuggestions = !!activeSlashToken && filteredSuggestions.length > 0

  function onChangeMessage(e) {
    setMessage(e.target.value)
    const el = e.target
    setCaret(el.selectionStart || 0)
  }

  function onSelectSuggestion(item) {
    const el = inputRef.current
    const cur = String(message || '')
    const pos = Number.isFinite(caret) ? caret : cur.length

    const before = cur.slice(0, pos)
    const after = cur.slice(pos)

    const lastSpace = Math.max(before.lastIndexOf(' '), before.lastIndexOf('\n'), before.lastIndexOf('\t'))
    const tokenStart = lastSpace + 1

    const expanded = applyVariables(item.message, {
      nome: activeContact.nome,
      empresa: activeContact.empresa,
      telefone: activeContact.telefone
    })

    const next = before.slice(0, tokenStart) + expanded + (after.startsWith(' ') ? '' : ' ') + after

    setMessage(next)

    // posiciona cursor no fim do texto inserido
    const nextPos = (before.slice(0, tokenStart) + expanded + ' ').length
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(nextPos, nextPos)
      setCaret(nextPos)
    })

    logEvent(clientId, {
      module: 'Inbox',
      action: 'Usou resposta rápida',
      description: `Atalho ${item.shortcut} aplicado para ${activeContact.nome}.`
    })
  }

  function onKeyDown(e) {
    if (!showSuggestions) return
    if (e.key === 'Escape') {
      e.preventDefault()
      // fecha implicitamente ao remover token (mantém simples)
      return
    }
    if (e.key === 'Enter') {
      // Enter envia mensagem (placeholder)
      // mas se tem sugestões e o token é exatamente a primeira, aplica a primeira
      const first = filteredSuggestions[0]
      if (first && activeSlashToken && String(first.shortcut).toLowerCase() === String(activeSlashToken).toLowerCase()) {
        e.preventDefault()
        onSelectSuggestion(first)
      }
    }
  }

  return (
    <div className="pcInbox">
      <div className="pcInboxSidebar">
        <div className="pcInboxHeader">Conversas</div>
        <div className="pcInboxListPlaceholder">Lista de conversas aparecerá aqui</div>
      </div>

      <div className="pcInboxChat">
        <div className="pcInboxChatHeader">
          {activeContact?.nome ? `Conversa com ${activeContact.nome}` : 'Selecione uma conversa'}
        </div>

        <div className="pcInboxChatBody">Área de mensagens</div>

        <div className="pcInboxComposer">
          {showSuggestions && (
            <div className="pcInboxSuggest">
              {filteredSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="pcInboxSuggestItem"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => onSelectSuggestion(s)}
                >
                  <div className="pcInboxSuggestTop">
                    <span className="pcInboxSuggestShortcut">{s.shortcut}</span>
                    <span className="pcInboxSuggestName">{s.name}</span>
                  </div>
                  <div className="pcInboxSuggestMsg">{s.message}</div>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef}
            className="pcInboxInput"
            rows={2}
            placeholder="Digite uma mensagem... (use /atalho)"
            value={message}
            onChange={onChangeMessage}
            onKeyDown={onKeyDown}
            onSelect={(e) => setCaret(e.target.selectionStart || 0)}
            onClick={(e) => setCaret(e.target.selectionStart || 0)}
          />

          <div className="pcInboxComposerActions">
            <div className="pcInboxHint">
              Dica: use <b>/</b> para respostas rápidas — variáveis: <b>{'{{nome}}'}</b>, <b>{'{{empresa}}'}</b>, <b>{'{{telefone}}'}</b>
            </div>
            <button
              type="button"
              className="pcInboxSend"
              onClick={() => {
                if (!String(message || '').trim()) return
                logEvent(clientId, {
                  module: 'Inbox',
                  action: 'Enviou mensagem',
                  description: `Mensagem enviada para ${activeContact.nome}.`
                })
                setMessage('')
                setCaret(0)
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/Inbox.jsx