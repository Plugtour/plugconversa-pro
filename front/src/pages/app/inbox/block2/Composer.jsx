// caminho: front/src/pages/app/inbox/block2/Composer.jsx
import { useMemo } from 'react'
import './block2.css'
import QuickReplySuggest from './QuickReplySuggest.jsx'
import { applyVariables, getActiveTokenSlash } from '../shared/inboxUtils'

export default function Composer({
  selectedLead,
  selectedConv,
  inputRef,
  message,
  setMessage,
  caret,
  setCaret,
  replies,
  pushAiLog,
  onSend
}) {
  const activeSlashToken = useMemo(() => getActiveTokenSlash(message, caret), [message, caret])

  const filteredSuggestions = useMemo(() => {
    if (!activeSlashToken) return []
    const q = activeSlashToken.toLowerCase()
    return (replies || [])
      .filter((r) => String(r.shortcut || '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [activeSlashToken, replies])

  const showSuggestions = !!activeSlashToken && filteredSuggestions.length > 0

  function onChangeMessage(e) {
    setMessage(e.target.value)
    setCaret(e.target.selectionStart || 0)
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
      nome: selectedConv?.lead_name || '',
      empresa: String(selectedConv?.meta?.empresa || selectedConv?.meta?.company || ''),
      telefone: selectedConv?.lead_phone_e164 || ''
    })

    const next = before.slice(0, tokenStart) + expanded + (after.startsWith(' ') ? '' : ' ') + after
    setMessage(next)

    const nextPos = (before.slice(0, tokenStart) + expanded + ' ').length
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.setSelectionRange(nextPos, nextPos)
      setCaret(nextPos)
    })
  }

  // ENTER envia | SHIFT/CTRL (+SHIFT) quebra linha
  function onComposerKeyDown(e) {
    if (showSuggestions) {
      if (e.key === 'Escape') {
        e.preventDefault()
        return
      }
      if (e.key === 'Enter') {
        const first = filteredSuggestions[0]
        if (
          first &&
          activeSlashToken &&
          String(first.shortcut).toLowerCase() === String(activeSlashToken).toLowerCase()
        ) {
          e.preventDefault()
          onSelectSuggestion(first)
          return
        }
      }
    }

    if (e.key === 'Enter') {
      const allowNewline = e.shiftKey || e.ctrlKey || e.metaKey
      if (!allowNewline) {
        e.preventDefault()
        onSend(message)
      }
    }
  }

  const composerStickyStyle = {
    position: 'sticky',
    bottom: 0,
    background: '#fff',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    zIndex: 5
  }

  return (
    <div className="pcInboxComposer" style={composerStickyStyle}>
      {showSuggestions && (
        <QuickReplySuggest suggestions={filteredSuggestions} onSelect={onSelectSuggestion} />
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 6 }}>
          <button
            type="button"
            className="pcInboxIconBtn"
            title="Emojis"
            disabled={!selectedLead}
            onClick={() => pushAiLog('info', 'Abrir emojis (mock).')}
          >
            😊
          </button>
          <button
            type="button"
            className="pcInboxIconBtn"
            title="Anexar"
            disabled={!selectedLead}
            onClick={() => pushAiLog('info', 'Abrir anexos (mock).')}
          >
            📎
          </button>
          <button
            type="button"
            className="pcInboxIconBtn"
            title="Microfone"
            disabled={!selectedLead}
            onClick={() => pushAiLog('info', 'Gravar áudio (mock).')}
          >
            🎤
          </button>
        </div>

        <textarea
          ref={inputRef}
          className="pcInboxInput"
          rows={2}
          placeholder="Digite uma mensagem… (Enter envia | Shift/Ctrl+Enter quebra linha)"
          value={message}
          onChange={onChangeMessage}
          onKeyDown={onComposerKeyDown}
          onSelect={(e) => setCaret(e.target.selectionStart || 0)}
          onClick={(e) => setCaret(e.target.selectionStart || 0)}
          disabled={!selectedLead}
          style={{ flex: 1 }}
        />

        <button
          type="button"
          className="pcInboxSend"
          onClick={() => onSend(message)}
          disabled={!selectedLead}
          title="Enviar"
          style={{ marginBottom: 6 }}
        >
          Enviar
        </button>
      </div>

      <div className="pcInboxComposerActions">
        <div className="pcInboxHint">
          Dica: use <b>/</b> para respostas rápidas — <b>{'{{nome}}'}</b>, <b>{'{{empresa}}'}</b>, <b>{'{{telefone}}'}</b>
        </div>

        <div className="pcInboxComposerBtns">
          <button
            type="button"
            className="pcInboxBtn"
            onClick={() => pushAiLog('info', 'Abrir montagem de orçamento (mock).')}
            title="Orçamento"
            disabled={!selectedLead}
          >
            Orçar
          </button>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block2/Composer.jsx