// caminho: front/src/pages/app/inbox/block3/panels/PanelTags.jsx
export default function PanelTags({ selectedLead, pushAiLog }) {
  return (
    <div className="pcInboxTags">
      {(selectedLead.tags || []).map((t) => (
        <span key={t} className="pcInboxTag">{t}</span>
      ))}
      <button
        type="button"
        className="pcInboxTagAdd"
        onClick={() => pushAiLog('info', 'Adicionar etiqueta (mock).')}
      >
        +
      </button>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block3/panels/PanelTags.jsx