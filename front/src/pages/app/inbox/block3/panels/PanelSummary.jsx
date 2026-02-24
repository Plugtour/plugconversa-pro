// caminho: front/src/pages/app/inbox/block3/panels/PanelSummary.jsx
import { defaultStageLabel, scoreLabel } from '../../shared/inboxUtils'

export default function PanelSummary({ selectedLead, pushAiLog }) {
  return (
    <div>
      <div className="pcInboxSummary">
        Lead <b>{selectedLead.nome}</b> ({scoreLabel(selectedLead.score)}). Etapa atual:{' '}
        <b>{defaultStageLabel(selectedLead.stage)}</b>. Preferências e dados coletados aparecem aqui (mock).
      </div>
      <button
        type="button"
        className="pcInboxMiniBtn"
        onClick={() => pushAiLog('info', 'Resumo atualizado (mock).')}
      >
        Atualizar resumo
      </button>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block3/panels/PanelSummary.jsx