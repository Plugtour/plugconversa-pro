// caminho: front/src/pages/app/configuracoes/Configuracoes.jsx
import { NavLink, Outlet } from 'react-router-dom'
import './configuracoes.css'

function navClass({ isActive }) {
  return `pcConfigMenuItem${isActive ? ' active' : ''}`
}

export default function Configuracoes() {
  return (
    <div className="pcPage">

      <div className="pcPageHeader">
        <h1>Configurações</h1>
        <p>Preferências da conta e integrações</p>
      </div>

      <div className="pcConfigLayout">

        {/* Menu lateral interno */}
        <aside className="pcConfigMenu">
          <NavLink to="conexao" className={navClass}>
            Conexão
          </NavLink>

          <NavLink to="campos" className={navClass}>
            Campos
          </NavLink>

          <NavLink to="etiquetas" className={navClass}>
            Etiquetas
          </NavLink>

          <NavLink to="respostas-rapidas" className={navClass}>
            Respostas rápidas
          </NavLink>

          <NavLink to="equipe" className={navClass}>
            Equipe
          </NavLink>

          <NavLink to="horarios" className={navClass}>
            Horários
          </NavLink>

          <NavLink to="fluxos-padroes" className={navClass}>
            Fluxos padrões
          </NavLink>

          <NavLink to="companhia" className={navClass}>
            Companhia
          </NavLink>

          <NavLink to="registros" className={navClass}>
            Registros
          </NavLink>

          <NavLink to="faturamento" className={navClass}>
            Faturamento
          </NavLink>

          <NavLink to="integracoes" className={navClass}>
            Integrações
          </NavLink>
        </aside>

        {/* Área de conteúdo das subpáginas */}
        <div className="pcConfigContent">
          <Outlet />
        </div>

      </div>

    </div>
  )
}
// fim: front/src/pages/app/configuracoes/Configuracoes.jsx