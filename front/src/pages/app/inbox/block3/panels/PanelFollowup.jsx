// caminho: front/src/pages/app/inbox/block3/panels/PanelFollowup.jsx
export default function PanelFollowup({ selectedLead, pushAiLog }) {
  return (
    <div>
      {selectedLead.followupAt ? (
        <div className="pcInboxFollowupBox">
          <div className="pcInboxFollowupLine">
            <span>Agendado</span>
            <b>{new Date(selectedLead.followupAt).toLocaleString()}</b>
          </div>
          <div className="pcInboxFollowupLine">
            <span>Limite</span>
            <b>até 3 mensagens</b>
          </div>
          <div className="pcInboxRowBtns">
            <button type="button" className="pcInboxMiniBtn" onClick={() => pushAiLog('info', 'Follow-up editado (mock).')}>
              Editar
            </button>
            <button type="button" className="pcInboxMiniBtn" onClick={() => pushAiLog('warn', 'Follow-up cancelado (mock).')}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="pcInboxEmptySmall">
          Nenhum follow-up agendado (mock).
          <div style={{ marginTop: 10 }}>
            <button type="button" className="pcInboxMiniBtn" onClick={() => pushAiLog('info', 'Follow-up criado (mock).')}>
              Criar follow-up
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
// fim: front/src/pages/app/inbox/block3/panels/PanelFollowup.jsx