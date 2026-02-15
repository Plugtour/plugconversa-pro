// caminho: front/src/pages/public/login/Login.jsx
import { useState } from 'react'
import './login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleLogin(e) {
    e.preventDefault()

    if (!email || !password) {
      alert('Preencha e-mail e senha.')
      return
    }

    // 🔐 Criar cookie compartilhado entre subdomínios
    document.cookie = "pc_auth=true; domain=.plugconversa.com.br; path=/; Secure"

    // 🚀 Redirecionar
    window.location.href = 'https://app.plugconversa.com.br'
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Entrar na Plataforma</h2>

        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
