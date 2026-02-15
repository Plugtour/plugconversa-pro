// caminho: front/src/shared/layout/AppShell.jsx
import { Outlet } from 'react-router-dom'
import Sidebar from '../sidebar/Sidebar.jsx'
import './shell.css'

export default function AppShell({ kind = 'client' }) {
  return (
    <div className="pcLayout">

      <Sidebar kind={kind} />

      <div className="pcLayoutMain">

        <header className="pcTopbar">
          <div className="pcTopbarLeft">
            <span className="pcTopbarTitle">
              {kind === 'admin' ? 'Painel Administrativo' : 'Área do Cliente'}
            </span>
          </div>

          <div className="pcTopbarRight">
            <div className="pcTopbarUser">
              <div className="pcTopbarAvatar">PC</div>
            </div>
          </div>
        </header>

        <div className="pcLayoutContent">
          <Outlet />
        </div>

      </div>
    </div>
  )
}
// fim: front/src/shared/layout/AppShell.jsx
