// caminho: front/src/pages/app/inbox/block3/panels/PanelBudget.jsx
export default function PanelBudget({ pushAiLog }) {
  return (
    <div>
      <div className="pcInboxBudgetList">
        <div className="pcInboxBudgetItem">
          <span>Passeio X</span>
          <b>R$ 900</b>
        </div>
        <div className="pcInboxBudgetItem">
          <span>Transfer</span>
          <b>R$ 300</b>
        </div>
        <div className="pcInboxBudgetTotal">
          <span>Total</span>
          <b>R$ 1.200</b>
        </div>
      </div>

      <div className="pcInboxRowBtns">
        <button type="button" className="pcInboxMiniBtn" onClick={() => pushAiLog('info', 'PDF gerado (mock).')}>
          Gerar PDF
        </button>
        <button type="button" className="pcInboxMiniBtn pcInboxMiniBtnPrimary" onClick={() => pushAiLog('info', 'Orçamento enviado (mock).')}>
          Enviar
        </button>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block3/panels/PanelBudget.jsx