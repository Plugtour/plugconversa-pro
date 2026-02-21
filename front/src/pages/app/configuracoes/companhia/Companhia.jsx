// caminho: front/src/pages/app/configuracoes/companhia/Companhia.jsx
import { useState } from 'react'
import './companhia.css'

export default function Companhia() {
  const [company, setCompany] = useState({
    nomeEmpresa: '',
    nomeFantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    whatsapp: '',
    logo: null,
    corPrimaria: '#2563eb',
    timezone: 'America/Sao_Paulo',
    idioma: 'pt-BR',
    endereco: {
      cep: '',
      cidade: '',
      estado: '',
      pais: 'Brasil'
    }
  })

  function update(field, value) {
    setCompany((prev) => ({ ...prev, [field]: value }))
  }

  function updateEndereco(field, value) {
    setCompany((prev) => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value }
    }))
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    update('logo', preview)
  }

  function onSave() {
    console.log('Salvar companhia:', company)
    alert('Configurações salvas (mock local)')
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Companhia</h2>
        <p>Dados institucionais e identidade visual da empresa.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Informações gerais</h3>
          </div>

          <div className="pcCardBody pcCompanyGrid">
            <input className="pcCfgInput" placeholder="Nome da empresa"
              value={company.nomeEmpresa}
              onChange={(e) => update('nomeEmpresa', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="Nome fantasia"
              value={company.nomeFantasia}
              onChange={(e) => update('nomeFantasia', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="CNPJ"
              value={company.cnpj}
              onChange={(e) => update('cnpj', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="E-mail"
              value={company.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="Telefone"
              value={company.telefone}
              onChange={(e) => update('telefone', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="WhatsApp"
              value={company.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Identidade visual</h3>
          </div>

          <div className="pcCardBody pcCompanyVisual">
            <div>
              <label className="pcCfgLabel">Logo</label>
              <input type="file" onChange={onLogoChange} />
              {company.logo && (
                <img src={company.logo} alt="Logo preview" className="pcCompanyLogoPreview" />
              )}
            </div>

            <div>
              <label className="pcCfgLabel">Cor primária</label>
              <input
                type="color"
                value={company.corPrimaria}
                onChange={(e) => update('corPrimaria', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Configurações regionais</h3>
          </div>

          <div className="pcCardBody pcCompanyGrid">
            <select className="pcCfgInput"
              value={company.timezone}
              onChange={(e) => update('timezone', e.target.value)}
            >
              <option value="America/Sao_Paulo">Brasil (GMT-3)</option>
              <option value="America/Argentina/Buenos_Aires">Argentina</option>
              <option value="America/Santiago">Chile</option>
            </select>

            <select className="pcCfgInput"
              value={company.idioma}
              onChange={(e) => update('idioma', e.target.value)}
            >
              <option value="pt-BR">Português</option>
              <option value="es">Espanhol</option>
              <option value="en">Inglês</option>
            </select>
          </div>
        </div>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Endereço</h3>
          </div>

          <div className="pcCardBody pcCompanyGrid">
            <input className="pcCfgInput" placeholder="CEP"
              value={company.endereco.cep}
              onChange={(e) => updateEndereco('cep', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="Cidade"
              value={company.endereco.cidade}
              onChange={(e) => updateEndereco('cidade', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="Estado"
              value={company.endereco.estado}
              onChange={(e) => updateEndereco('estado', e.target.value)}
            />
            <input className="pcCfgInput" placeholder="País"
              value={company.endereco.pais}
              onChange={(e) => updateEndereco('pais', e.target.value)}
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
// fim: front/src/pages/app/configuracoes/companhia/Companhia.jsx