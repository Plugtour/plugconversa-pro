// caminho: front/src/shared/layout/AppShell.jsx
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '../sidebar/Sidebar.jsx'
import './shell.css'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

function isLocalhost() {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

function clearAuthCookie() {
  // ✅ DEV/LOCAL: cookie simples
  if (isLocalhost()) {
    document.cookie = 'pc_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    return
  }

  // ✅ PRODUÇÃO: remove em todos os subdomínios
  document.cookie =
    'pc_auth=; domain=.plugconversa.com.br; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax'
}

export default function AppShell({ kind = 'client' }) {
  const navigate = useNavigate()
  const local = isLocalhost()
  const isAppHost = local || window.location.hostname.startsWith('app.')

  useEffect(() => {
    const isAuth = !!getCookie('pc_auth')

    // 🔒 Se estiver no app/localhost e não estiver logado -> vai pro login interno
    if (isAppHost && !isAuth) {
      navigate('/login', { replace: true })
    }
  }, [isAppHost, navigate])

  function onLogout() {
    clearAuthCookie()

    // ✅ DEV/LOCAL e APP: volta pro login interno
    if (isAppHost) {
      navigate('/login', { replace: true })
      return
    }

    // ✅ fallback (domínio principal em produção)
    window.location.href = 'https://plugconversa.com.br/login'
  }

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

              {/* ✅ em localhost e no app mostra o botão sair */}
              {isAppHost && (
                <button
                  type="button"
                  className="pcTopbarLogout"
                  onClick={onLogout}
                >
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
