// caminho: front/src/pages/public/quero-ser-cliente/QueroSerCliente.jsx
import './quero-ser-cliente.css'

function QueroSerCliente() {
  return (
    <div className="qsc-wrapper">
      <div className="qsc-card">
        <h2 className="qsc-title">Criar Conta</h2>

        <div className="qsc-form">
          <input type="text" placeholder="Nome da empresa" />
          <input type="text" placeholder="Seu nome" />
          <input type="email" placeholder="E-mail" />
          <input type="password" placeholder="Senha" />

          <button className="qsc-button">
            Cadastrar-se
          </button>
        </div>
      </div>
    </div>
  )
}

export default QueroSerCliente
// fim: front/src/pages/public/quero-ser-cliente/QueroSerCliente.jsx
