// caminho: front/src/pages/public/login/Login.jsx
import { useEffect, useState } from 'react'
import './login.css'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
}

function Login() {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const isAuth = getCookie('pc_auth')
    if (isAuth) {
      window.location.href = 'https://app.plugconversa.com.br/dashboard'
    }
  }, [])

  function handleLogin(e) {
    e.preventDefault()

    if (!user || !password) {
      alert('Preencha usuário e senha.')
      return
    }

    // 🔐 Cookie compartilhado entre subdomínios
    document.cookie =
      'pc_auth=true; domain=.plugconversa.com.br; path=/; Secure; SameSite=Lax'

    // 🚀 Redirecionar direto para o Dashboard
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
