// caminho: front/src/pages/app/configuracoes/conexao/Conexao.jsx
import './conexao.css'

export default function Conexao() {
  return (
    <div className="pcCfgPage">

      <div className="pcCfgHeader">
        <h2>Conexão</h2>
        <p>Conecte canais e gerencie autenticação.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Status</h3>
          </div>

          <div className="pcCardBody">
            <div className="pcCfgGrid">
              <div className="pcCfgTile">
                <div className="pcCfgTileTop">
                  <span className="pcCfgLabel">WhatsApp</span>
                  <span className="pcCfgPill warn">Não conectado</span>
                </div>
                <div className="pcCfgHint">
                  Em breve: conectar número, verificar status e reconectar.
                </div>
                <div className="pcCfgActions">
                  <button type="button" className="pcCfgBtn" disabled>
                    Conectar
                  </button>
                  <button type="button" className="pcCfgBtn ghost" disabled>
                    Ver detalhes
                  </button>
                </div>
              </div>

              <div className="pcCfgTile">
                <div className="pcCfgTileTop">
                  <span className="pcCfgLabel">API</span>
                  <span className="pcCfgPill ok">Ativa</span>
                </div>
                <div className="pcCfgHint">
                  Em breve: chaves, webhooks e permissões por equipe.
                </div>
                <div className="pcCfgActions">
                  <button type="button" className="pcCfgBtn ghost" disabled>
                    Gerenciar
                  </button>
                </div>
              </div>
            </div>

            <div className="pcCfgNote">
              Esta tela é a base visual. Quando você me passar as regras de conexão (API/WhatsApp),
              eu ligo nos endpoints e deixo funcional.
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
// fim: front/src/pages/app/configuracoes/conexao/Conexao.jsx