// caminho: front/src/pages/public/home/Home.jsx
import { Link } from 'react-router-dom'
import './home.css'

function Home() {
  return (
    <div className="pc-page">
      <div className="pc-container">
        <div className="home-card">
          <h1 className="home-title">PlugConversaPro</h1>

          <p className="home-subtitle">
            Plataforma SaaS de CRM, Kanban e Automação para WhatsApp.
            Controle conversas, equipes e resultados em um único lugar.
          </p>

          <div className="home-question">
            <span>Não tem uma conta?</span>
            <Link to="/quero-ser-cliente" className="home-link">
              Cadastrar-se
            </Link>
          </div>

          <div className="home-actions">
            <Link to="/login" className="pc-button pc-button-primary">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
// fim: front/src/pages/public/home/Home.jsx
