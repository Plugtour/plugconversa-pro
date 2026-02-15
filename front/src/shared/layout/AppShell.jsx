// caminho: front/src/shared/layout/AppShell.jsx
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../sidebar/Sidebar.jsx'
import './shell.css'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

function clearAuthCookie() {
  // remove em todos os subdomínios
  document.cookie =
    'pc_auth=; domain=.plugconversa.com.br; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax'
}

export default function AppShell({ kind = 'client' }) {
  useEffect(() => {
    const isAuth = getCookie('pc_auth')

    if (window.location.hostname.startsWith('app.') && !isAuth) {
      window.location.href = 'https://plugconversa.com.br/login'
    }
  }, [])

  function onLogout() {
    clearAuthCookie()
    window.location.href = 'https://plugconversa.com.br/login'
  }

  const isAppHost = window.location.hostname.startsWith('app.')

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

              {isAppHost && (
                <button type="button" className="pcTopbarLogout" onClick={onLogout}>
                  Sair
                </button>
              )}
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
