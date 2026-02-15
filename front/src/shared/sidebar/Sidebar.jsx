// caminho: front/src/shared/sidebar/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import './sidebar.css'

function navClass({ isActive }) {
  return `pcSidebarItem${isActive ? ' active' : ''}`
}

export default function Sidebar({ kind = 'client' }) {
  return (
    <aside className="pcSidebar">
      <div className="pcSidebarHeader">
        <h3>PlugConversa</h3>
      </div>

      <nav className="pcSidebarNav">
        {kind === 'client' && (
          <>
            <NavLink to="/app" end className={navClass}>
              Dashboard
            </NavLink>

            <NavLink to="/app/inbox" className={navClass}>
              Inbox
            </NavLink>

            <NavLink to="/app/crm" className={navClass}>
              CRM Kanban
            </NavLink>

            <NavLink to="/app/disparo" className={navClass}>
              Disparo em Massa
            </NavLink>

            <NavLink to="/app/fluxo" className={navClass}>
              Fluxo de Conversa
            </NavLink>

            <NavLink to="/app/contatos" className={navClass}>
              Contatos
            </NavLink>

            <NavLink to="/app/campanhas" className={navClass}>
              Campanhas
            </NavLink>

            <NavLink to="/app/automacao" className={navClass}>
              Automação
            </NavLink>

            <NavLink to="/app/configuracoes" className={navClass}>
              Configurações
            </NavLink>

            <NavLink to="/app/suporte" className={navClass}>
              Suporte
            </NavLink>
          </>
        )}

        {kind === 'admin' && (
          <>
            <NavLink to="/admin" end className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/clientes" className={navClass}>
              Clientes
            </NavLink>
            <NavLink to="/admin/planos" className={navClass}>
              Planos
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
// fim: front/src/shared/sidebar/Sidebar.jsx
