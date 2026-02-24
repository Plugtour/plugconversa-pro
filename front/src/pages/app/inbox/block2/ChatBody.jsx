// caminho: front/src/pages/app/inbox/block2/ChatBody.jsx
import './block2.css'
import { fmtTime } from '../shared/inboxUtils'

export default function ChatBody({ msgsErr, loadingMsgs, messages }) {
  return (
    <div className="pcInboxChatBody">
      {msgsErr ? <div className="pcInboxInlineErr">{msgsErr}</div> : null}

      {loadingMsgs ? (
        <div className="pcInboxLoading">Carregando mensagens…</div>
      ) : messages.length === 0 ? (
        <div className="pcInboxChatBodyHint">
          Sem mensagens ainda. Envie a primeira mensagem pelo campo abaixo.
        </div>
      ) : (
        <div className="pcInboxChatMock">
          {messages.map((m) => {
            const isOut = String(m.direction) === 'out'
            return (
              <div
                key={m.id}
                className={`pcInboxBubble ${isOut ? 'pcInboxBubble--out' : 'pcInboxBubble--in'}`}
              >
                <div className="pcInboxBubbleText">{m.text}</div>
                <div className="pcInboxBubbleTime">{fmtTime(m.created_at)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
// fim: front/src/pages/app/inbox/block2/ChatBody.jsx