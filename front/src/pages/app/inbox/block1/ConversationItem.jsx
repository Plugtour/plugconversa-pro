// caminho: front/src/pages/app/inbox/block1/ConversationItem.jsx
import './block1.css'
import { clampText, computeSlaKind, fmtTime, makeInitials, pickConvFallbackSnippet, scoreLabel } from '../shared/inboxUtils'

export default function ConversationItem({ conv, isActive, onPick, snippetMap }) {
  const c = conv || {}
  const slaKind = computeSlaKind(c.last_inbound_at)
  const name = c.lead_name || 'Lead'
  const time = fmtTime(c.last_message_at || c.updated_at || c.created_at)

  const numberLabel = c.wa_number_id ? `📱${c.wa_number_id}` : '📱—'
  const dept = 'Vendas'
  const heat = scoreLabel(c.score)
  const aiMode = c.status === 'human' ? 'human' : 'ai'

  const cached = snippetMap?.[Number(c.id)]
  const snippet = cached?.text ? cached.text : pickConvFallbackSnippet(c)

  return (
    <button
      type="button"
      className={`pcInboxLeadItem${isActive ? ' isActive' : ''}`}
      onClick={onPick}
    >
      <div className={`pcInboxSla pcInboxSla--${slaKind}`} />
      <div className="pcInboxAvatar">{makeInitials(name)}</div>

      <div className="pcInboxLeadMain">
        <div className="pcInboxLeadTop">
          <div className="pcInboxLeadName">{name}</div>
          <div className="pcInboxLeadTime">{time}</div>
        </div>

        <div className="pcInboxLeadMid">
          <div className="pcInboxLeadSnippet">{clampText(snippet, 56)}</div>
        </div>

        <div className="pcInboxLeadBottom">
          <span className="pcInboxChip">{numberLabel}</span>
          <span className="pcInboxChip">{dept}</span>
          <span className="pcInboxChip pcInboxChip--heat">{heat}</span>

          <span className={`pcInboxAiTag${aiMode === 'ai' ? ' isAi' : ''}`}>
            {aiMode === 'ai' ? 'IA' : 'Humano'}
          </span>
        </div>
      </div>
    </button>
  )
}
// fim: front/src/pages/app/inbox/block1/ConversationItem.jsx