// caminho: front/src/pages/app/inbox/block1/InboxLeft.jsx
import './block1.css'
import InboxLeftTop from './InboxLeftTop.jsx'
import ConversationList from './ConversationList.jsx'

export default function InboxLeft(props) {
  const {
    loadingList,
    listErr,
    search,
    setSearch,
    filterKey,
    setFilterKey,
    filteredConversations,
    selectedId,
    onPickConversation,
    loadConversations,
    snippetMap
  } = props

  return (
    <aside className="pcInboxLeft">
      <InboxLeftTop
        loadingList={loadingList}
        listErr={listErr}
        search={search}
        setSearch={setSearch}
        filterKey={filterKey}
        setFilterKey={setFilterKey}
        loadConversations={loadConversations}
      />

      <ConversationList
        loadingList={loadingList}
        filteredConversations={filteredConversations}
        selectedId={selectedId}
        onPickConversation={onPickConversation}
        snippetMap={snippetMap}
      />
    </aside>
  )
}
// fim: front/src/pages/app/inbox/block1/InboxLeft.jsx