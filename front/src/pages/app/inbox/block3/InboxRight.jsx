// caminho: front/src/pages/app/inbox/block3/InboxRight.jsx
import './block3.css'
import RightPanelModal from '../shared/RightPanelModal.jsx'
import RightButtons from './RightButtons.jsx'

import PanelSummary from './panels/PanelSummary.jsx'
import PanelFunnel from './panels/PanelFunnel.jsx'
import PanelTags from './panels/PanelTags.jsx'
import PanelBudget from './panels/PanelBudget.jsx'
import PanelFollowup from './panels/PanelFollowup.jsx'
import PanelLogs from './panels/PanelLogs.jsx'

function titleFor(key) {
  if (key === 'summary') return '🧠 Resumo IA'
  if (key === 'funnel') return '🎯 Etapa do funil'
  if (key === 'tags') return '🏷 Etiquetas'
  if (key === 'budget') return '📄 Orçamento'
  if (key === 'followup') return '🔁 Follow-up'
  if (key === 'logs') return '🧾 Logs IA'
  return 'Detalhes'
}

export default function InboxRight({
  rightOpen,
  selectedLead,
  aiEnabled,
  salesProfile,
  aiLogs,
  rightModal,
  openRightModal,
  closeRightModal,
  pushAiLog
}) {
  function renderPanel(key) {
    if (key === 'summary') return <PanelSummary selectedLead={selectedLead} pushAiLog={pushAiLog} />
    if (key === 'funnel') return <PanelFunnel selectedLead={selectedLead} aiEnabled={aiEnabled} salesProfile={salesProfile} />
    if (key === 'tags') return <PanelTags selectedLead={selectedLead} pushAiLog={pushAiLog} />
    if (key === 'budget') return <PanelBudget pushAiLog={pushAiLog} />
    if (key === 'followup') return <PanelFollowup selectedLead={selectedLead} pushAiLog={pushAiLog} />
    if (key === 'logs') return <PanelLogs aiLogs={aiLogs} pushAiLog={pushAiLog} />
    return null
  }

  return (
    <aside className={`pcInboxRight${rightOpen ? '' : ' isHidden'}`}>
      <div className="pcInboxRightInner" style={{ position: 'relative' }}>
        <RightPanelModal
          open={!!rightModal.open}
          title={titleFor(rightModal.key)}
          onClose={closeRightModal}
        >
          {renderPanel(rightModal.key)}
        </RightPanelModal>

        <RightButtons onOpen={openRightModal} />
      </div>
    </aside>
  )
}
// fim: front/src/pages/app/inbox/block3/InboxRight.jsx