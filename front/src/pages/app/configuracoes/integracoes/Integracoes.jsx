// caminho: front/src/pages/app/configuracoes/integracoes/Integracoes.jsx
import { useState } from 'react'
import './integracoes.css'

export default function Integracoes() {
  const [config, setConfig] = useState({
    whatsapp: {
      connected: false,
      phoneNumberId: '',
      token: ''
    },
    webhook: {
      url: '',
      secret: ''
    },
    apiExterna: {
      baseUrl: '',
      apiKey: ''
    }
  })

  function update(section, field, value) {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  function toggleWhatsApp() {
    setConfig((prev) => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        connected: !prev.whatsapp.connected
      }
    }))
  }

  function onSave() {
    console.log('Salvar integrações:', config)
    alert('Configurações salvas (mock local)')
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Integrações</h2>
        <p>Conecte seu sistema com APIs externas e serviços oficiais.</p>
      </div>

      {/* ================= WHATSAPP ================= */}
      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcIntegrationsHeader">
            <h3>WhatsApp Cloud API</h3>
            <button
              className={`pcCfgPillBtn ${config.whatsapp.connected ? 'on' : ''}`}
              onClick={toggleWhatsApp}
            >
              {config.whatsapp.connected ? 'Conectado' : 'Desconectado'}
            </button>
          </div>

          <div className="pcCardBody pcIntegrationGrid">
            <input
              className="pcCfgInput"
              placeholder="Phone Number ID"
              value={config.whatsapp.phoneNumberId}
              onChange={(e) =>
                update('whatsapp', 'phoneNumberId', e.target.value)
              }
            />

            <input
              className="pcCfgInput"
              placeholder="Access Token"
              value={config.whatsapp.token}
              onChange={(e) =>
                update('whatsapp', 'token', e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* ================= WEBHOOK ================= */}
      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Webhook</h3>
          </div>

          <div className="pcCardBody pcIntegrationGrid">
            <input
              className="pcCfgInput"
              placeholder="URL do Webhook"
              value={config.webhook.url}
              onChange={(e) =>
                update('webhook', 'url', e.target.value)
              }
            />

            <input
              className="pcCfgInput"
              placeholder="Secret Key"
              value={config.webhook.secret}
              onChange={(e) =>
                update('webhook', 'secret', e.target.value)
              }
            />
          </div>
        </div>
      </div>

      {/* ================= API EXTERNA ================= */}
      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>API Externa</h3>
          </div>

          <div className="pcCardBody pcIntegrationGrid">
            <input
              className="pcCfgInput"
              placeholder="Base URL"
              value={config.apiExterna.baseUrl}
              onChange={(e) =>
                update('apiExterna', 'baseUrl', e.target.value)
              }
            />

            <input
              className="pcCfgInput"
              placeholder="API Key"
              value={config.apiExterna.apiKey}
              onChange={(e) =>
                update('apiExterna', 'apiKey', e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div className="pcCompanyActions">
        <button className="pcCfgBtnPrimary" onClick={onSave}>
          Salvar alterações
        </button>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/integracoes/Integracoes.jsx