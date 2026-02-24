// caminho: front/src/pages/app/inbox/block1/ConversationList.jsx
import './block1.css'
import ConversationItem from './ConversationItem.jsx'

export default function ConversationList({
  loadingList,
  filteredConversations,
  selectedId,
  onPickConversation,
  snippetMap
}) {
  return (
    <div className="pcInboxLeadList">
      {loadingList ? (
        <div className="pcInboxLoading">Carregando conversas…</div>
      ) : filteredConversations.length === 0 ? (
        <div className="pcInboxEmptySmall">Nenhuma conversa encontrada.</div>
      ) : (
        filteredConversations.map((c) => (
          <ConversationItem
            key={c.id}
            conv={c}
            isActive={Number(c.id) === Number(selectedId)}
            onPick={() => onPickConversation(c)}
            snippetMap={snippetMap}
          />
        ))
      )}
    </div>
  )
}
// fim: front/src/pages/app/inbox/block1/ConversationList.jsx