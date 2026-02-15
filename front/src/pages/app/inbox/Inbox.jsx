// caminho: front/src/pages/app/inbox/Inbox.jsx
import './inbox.css'

export default function Inbox() {
  return (
    <div className="pcInbox">
      <div className="pcInboxSidebar">
        <div className="pcInboxHeader">Conversas</div>
        <div className="pcInboxListPlaceholder">
          Lista de conversas aparecerá aqui
        </div>
      </div>

      <div className="pcInboxChat">
        <div className="pcInboxChatHeader">Selecione uma conversa</div>
        <div className="pcInboxChatBody">
          Área de mensagens
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/Inbox.jsx
