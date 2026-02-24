// caminho: front/src/pages/app/inbox/block3/panels/PanelFunnel.jsx
export default function PanelFunnel({ selectedLead, aiEnabled, salesProfile }) {
  return (
    <div>
      <div className="pcInboxStageRow">
        <span className={`pcInboxStage${selectedLead.stage === 'lead' ? ' isActive' : ''}`}>Lead</span>
        <span className={`pcInboxStage${selectedLead.stage === 'qualificado' ? ' isActive' : ''}`}>Qualificado</span>
        <span className={`pcInboxStage${selectedLead.stage === 'orcamento' ? ' isActive' : ''}`}>Orçamento</span>
        <span className={`pcInboxStage${selectedLead.stage === 'negociacao' ? ' isActive' : ''}`}>Negociação</span>
        <span className={`pcInboxStage${selectedLead.stage === 'fechado' ? ' isActive' : ''}`}>Fechado</span>
      </div>

      <div className="pcInboxKpis">
        <div className="pcInboxKpi">
          <span>Score</span>
          <b>{selectedLead.score}</b>
        </div>
        <div className="pcInboxKpi">
          <span>Atendimento</span>
          <b>{aiEnabled ? 'IA' : 'Humano'}</b>
        </div>
        <div className="pcInboxKpi">
          <span>Perfil</span>
          <b>{salesProfile}</b>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block3/panels/PanelFunnel.jsx