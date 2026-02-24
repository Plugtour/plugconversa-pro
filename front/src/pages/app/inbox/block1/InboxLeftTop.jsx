// caminho: front/src/pages/app/inbox/block1/InboxLeftTop.jsx
import './block1.css'

export default function InboxLeftTop({
  loadingList,
  listErr,
  search,
  setSearch,
  filterKey,
  setFilterKey,
  loadConversations
}) {
  return (
    <div className="pcInboxLeftTop">
      <div className="pcInboxLeftTitle">
        Conversas
        <button
          type="button"
          className="pcInboxMiniReload"
          onClick={loadConversations}
          disabled={loadingList}
          title="Atualizar"
        >
          ⟳
        </button>
      </div>

      <div className="pcInboxSearch">
        <input
          className="pcInboxSearchInput"
          placeholder="Buscar lead…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pcInboxFilters">
        <button
          type="button"
          className={`pcInboxFilterBtn${filterKey === 'all' ? ' isActive' : ''}`}
          onClick={() => setFilterKey('all')}
        >
          Todos
        </button>
        <button
          type="button"
          className={`pcInboxFilterBtn${filterKey === 'unread' ? ' isActive' : ''}`}
          onClick={() => setFilterKey('unread')}
          title="Placeholder (campo ainda não existe)"
        >
          Não lidos
        </button>
        <button
          type="button"
          className={`pcInboxFilterBtn${filterKey === 'hot' ? ' isActive' : ''}`}
          onClick={() => setFilterKey('hot')}
        >
          Quentes
        </button>
        <button
          type="button"
          className={`pcInboxFilterBtn${filterKey === 'no_reply' ? ' isActive' : ''}`}
          onClick={() => setFilterKey('no_reply')}
        >
          Sem resposta
        </button>
      </div>

      {listErr ? <div className="pcInboxInlineErr">{listErr}</div> : null}
    </div>
  )
}
// fim: front/src/pages/app/inbox/block1/InboxLeftTop.jsx