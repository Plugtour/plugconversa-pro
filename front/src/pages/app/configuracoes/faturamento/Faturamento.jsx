// caminho: front/src/pages/app/configuracoes/faturamento/Faturamento.jsx
import './faturamento.css'

export default function Faturamento() {
  const plano = {
    nome: 'Plano Profissional',
    status: 'Ativo',
    proximaCobranca: '15/03/2026',
    valor: 'R$ 197,00'
  }

  const historico = [
    { id: 1, data: '15/02/2026', valor: 'R$ 197,00', status: 'Pago' },
    { id: 2, data: '15/01/2026', valor: 'R$ 197,00', status: 'Pago' },
    { id: 3, data: '15/12/2025', valor: 'R$ 197,00', status: 'Pago' }
  ]

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Faturamento</h2>
        <p>Gerencie seu plano e histórico de pagamentos.</p>
      </div>

      <div className="pcBlock">
        {/* Plano Atual */}
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Plano Atual</h3>
          </div>

          <div className="pcCardBody pcBillingInfo">
            <div className="pcBillingPlan">
              <div className="pcBillingPlanTop">
                <strong className="pcBillingPlanName">{plano.nome}</strong>
                <span className="pcBillingBadge pcBillingBadgeActive">{plano.status}</span>
              </div>

              <div className="pcBillingMeta">
                <div>Valor: {plano.valor}</div>
                <div>Próxima cobrança: {plano.proximaCobranca}</div>
              </div>
            </div>

            <div className="pcBillingActions">
              <button type="button" className="pcBtnPrimary">
                Alterar Plano
              </button>

              <button type="button" className="pcBtnDanger">
                Cancelar Assinatura
              </button>
            </div>
          </div>
        </div>

        {/* Histórico */}
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Histórico de Pagamentos</h3>
          </div>

          <div className="pcCardBody">
            <div className="pcBillingTable">
              <div className="pcBillingRow pcBillingRowHead">
                <div>Data</div>
                <div>Valor</div>
                <div>Status</div>
              </div>

              {historico.map((item) => (
                <div key={item.id} className="pcBillingRow">
                  <div>{item.data}</div>
                  <div>{item.valor}</div>
                  <div>
                    <span className="pcBillingBadge pcBillingBadgePaid">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/faturamento/Faturamento.jsx