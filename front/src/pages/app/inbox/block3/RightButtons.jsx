// caminho: front/src/pages/app/inbox/block3/RightButtons.jsx
import './block3.css'

function RightButton({ label, icon, onClick }) {
  return (
    <div className="pcInboxPanel">
      <button type="button" className="pcInboxPanelHead" onClick={onClick}>
        <span>{icon} {label}</span>
        <span className="pcInboxChevron">+</span>
      </button>
    </div>
  )
}

export default function RightButtons({ onOpen }) {
  return (
    <>
      <RightButton icon="🧠" label="Resumo IA" onClick={() => onOpen('summary')} />
      <RightButton icon="🎯" label="Etapa do funil" onClick={() => onOpen('funnel')} />
      <RightButton icon="🏷" label="Etiquetas" onClick={() => onOpen('tags')} />
      <RightButton icon="📄" label="Orçamento" onClick={() => onOpen('budget')} />
      <RightButton icon="🔁" label="Follow-up" onClick={() => onOpen('followup')} />
      <RightButton icon="🧾" label="Logs IA" onClick={() => onOpen('logs')} />
    </>
  )
}
// fim: front/src/pages/app/inbox/block3/RightButtons.jsx