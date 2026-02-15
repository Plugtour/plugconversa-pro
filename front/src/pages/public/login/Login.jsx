// caminho: front/src/pages/public/login/Login.jsx
import './login.css'

function Login() {
  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Entrar na Plataforma</h2>

        <div className="login-form">
          <input type="email" placeholder="E-mail" />
          <input type="password" placeholder="Senha" />

          <button className="login-button">
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
// fim: front/src/pages/public/login/Login.jsx
