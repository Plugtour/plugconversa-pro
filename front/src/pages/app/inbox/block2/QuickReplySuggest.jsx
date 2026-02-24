// caminho: front/src/pages/app/inbox/block2/QuickReplySuggest.jsx
import './block2.css'

export default function QuickReplySuggest({ suggestions, onSelect }) {
  return (
    <div className="pcInboxSuggest">
      {suggestions.map((s) => (
        <button
          key={s.id}
          type="button"
          className="pcInboxSuggestItem"
          onMouseDown={(ev) => ev.preventDefault()}
          onClick={() => onSelect(s)}
        >
          <div className="pcInboxSuggestTop">
            <span className="pcInboxSuggestShortcut">{s.shortcut}</span>
            <span className="pcInboxSuggestName">{s.name}</span>
          </div>
          <div className="pcInboxSuggestMsg">{s.message}</div>
        </button>
      ))}
    </div>
  )
}
// fim: front/src/pages/app/inbox/block2/QuickReplySuggest.jsx