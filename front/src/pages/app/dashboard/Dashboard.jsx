// caminho: front/src/pages/app/dashboard/Dashboard.jsx
import './dashboard.css'

export default function Dashboard() {
  return (
    <div className="pcPageCard">
      <div className="pcPageHeader">
        <h1 className="pcPageTitle">Dashboard</h1>
        <p className="pcPageSubtitle">Visão geral do atendimento e performance</p>
      </div>

      <div className="pcPageBody">
        <div className="pcKpiGrid">
          <div className="pcKpi">
            <div className="pcKpiLabel">Conversas hoje</div>
            <div className="pcKpiValue">0</div>
          </div>
          <div className="pcKpi">
            <div className="pcKpiLabel">Em atendimento</div>
            <div className="pcKpiValue">0</div>
          </div>
          <div className="pcKpi">
            <div className="pcKpiLabel">Pendentes</div>
            <div className="pcKpiValue">0</div>
          </div>
          <div className="pcKpi">
            <div className="pcKpiLabel">Finalizadas</div>
            <div className="pcKpiValue">0</div>
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/dashboard/Dashboard.jsx
