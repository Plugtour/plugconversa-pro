// caminho: front/src/pages/public/login/Login.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './login.css'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

function isLocalhost() {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

function Login() {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const isAuth = getCookie('pc_auth')

    // ✅ Em dev/local e também no app, se já estiver logado: vai pro dashboard (rota interna)
    if (isAuth) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  function handleLogin(e) {
    e.preventDefault()

    if (!user || !password) {
      alert('Preencha usuário e senha.')
      return
    }

    // ✅ DEV/LOCAL: cookie simples (sem domain e sem Secure)
    if (isLocalhost()) {
      document.cookie = 'pc_auth=true; path=/; SameSite=Lax'
      navigate('/dashboard', { replace: true })
      return
    }

    // ✅ PRODUÇÃO: cookie compartilhado entre subdomínios
    document.cookie =
      'pc_auth=true; domain=.plugconversa.com.br; path=/; Secure; SameSite=Lax'

    // ✅ PRODUÇÃO: no app, navega interno; fora do app, manda pro app
    if (window.location.hostname.startsWith('app.')) {
      navigate('/dashboard', { replace: true })
      return
    }

    window.location.href = 'https://app.plugconversa.com.br/dashboard'
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Entrar na Plataforma</h2>

        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuário ou e-mail"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
// fim: front/src/pages/public/login/Login.jsx
