// caminho: front/src/pages/admin/dashboard/AdminDashboard.jsx
import './admin-dashboard.css'

export default function AdminDashboard() {
  return (
    <div className="pcPageCard">
      <div className="pcPageHeader">
        <h1 className="pcPageTitle">Admin</h1>
        <p className="pcPageSubtitle">Visão geral do sistema</p>
      </div>

      <div className="pcPageBody">
        <div className="pcKpiGrid">
          <div className="pcKpi">
            <div className="pcKpiLabel">Clientes</div>
            <div className="pcKpiValue">0</div>
          </div>
          <div className="pcKpi">
            <div className="pcKpiLabel">Usuários</div>
            <div className="pcKpiValue">0</div>
          </div>
          <div className="pcKpi">
            <div className="pcKpiLabel">Ativos</div>
            <div className="pcKpiValue">0</div>
          </div>
          <div className="pcKpi">
            <div className="pcKpiLabel">MRR</div>
            <div className="pcKpiValue">R$ 0</div>
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/admin/dashboard/AdminDashboard.jsx
