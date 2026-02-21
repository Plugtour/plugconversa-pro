// caminho: front/src/pages/app/configuracoes/fluxos-padroes/FluxosPadroes.jsx
import { useState } from 'react'
import './fluxos-padroes.css'

export default function FluxosPadroes() {
  const [fluxos] = useState([
    { id: 1, name: 'Boas-vindas' },
    { id: 2, name: 'Captura de Lead' },
    { id: 3, name: 'Reativação' },
    { id: 4, name: 'Atendimento Humano' }
  ])

  const [config, setConfig] = useState({
    novoContato: '',
    foraHorario: '',
    mensagemRecebida: ''
  })

  function update(field, value) {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Fluxos Padrões</h2>
        <p>Defina quais fluxos serão executados automaticamente pelo sistema.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardBody pcFluxosPadroesGrid">

            <div className="pcFluxoItem">
              <label>Novo Contato</label>
              <select
                value={config.novoContato}
                onChange={(e) => update('novoContato', e.target.value)}
                className="pcCfgInput"
              >
                <option value="">Nenhum</option>
                {fluxos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <span className="pcFluxoHint">
                Executado quando um novo contato iniciar conversa.
              </span>
            </div>

            <div className="pcFluxoItem">
              <label>Fora do Horário</label>
              <select
                value={config.foraHorario}
                onChange={(e) => update('foraHorario', e.target.value)}
                className="pcCfgInput"
              >
                <option value="">Nenhum</option>
                {fluxos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <span className="pcFluxoHint">
                Executado automaticamente fora do horário comercial.
              </span>
            </div>

            <div className="pcFluxoItem">
              <label>Mensagem Recebida</label>
              <select
                value={config.mensagemRecebida}
                onChange={(e) => update('mensagemRecebida', e.target.value)}
                className="pcCfgInput"
              >
                <option value="">Nenhum</option>
                {fluxos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <span className="pcFluxoHint">
                Executado ao receber qualquer nova mensagem.
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/fluxos-padroes/FluxosPadroes.jsx