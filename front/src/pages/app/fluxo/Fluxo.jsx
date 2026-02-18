// caminho: front/src/pages/app/fluxo/Fluxo.jsx
import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '../../../services/api'
import FluxoBuilder from './components/FluxoBuilder.jsx'
import './fluxo.css'

function getErrText(err) {
  const status = err?.status
  const payload = err?.payload
  const msg =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
    err?.message ||
    'erro'
  return status ? `${msg} (HTTP ${status})` : msg
}

function formatDateBR(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

export default function Fluxo() {
  const [pastas, setPastas] = useState([])
  const [fluxos, setFluxos] = useState([])
  const [loading, setLoading] = useState(false)
  const [pastaAtual, setPastaAtual] = useState(null)
  const [fluxoAtual, setFluxoAtual] = useState(null)

  // ✅ evita alert duplicado no React StrictMode (DEV) e evita setState após unmount
  const didInitRef = useRef(false)
  const mountedRef = useRef(false)

  async function carregarDados({ silent = false } = {}) {
    setLoading(true)

    try {
      const [pastasRes, fluxosRes] = await Promise.allSettled([apiGet('/flow/folders'), apiGet('/flow')])

      if (!mountedRef.current) return

      if (pastasRes.status === 'fulfilled') {
        setPastas(pastasRes.value?.data || [])
      } else {
        console.error(pastasRes.reason)
        if (!silent) alert(`Erro ao carregar pastas: ${getErrText(pastasRes.reason)}`)
        setPastas([])
      }

      if (fluxosRes.status === 'fulfilled') {
        setFluxos(fluxosRes.value?.data || [])
      } else {
        console.error(fluxosRes.reason)
        if (!silent) alert(`Erro ao carregar fluxos: ${getErrText(fluxosRes.reason)}`)
        setFluxos([])
      }
    } catch (err) {
      console.error(err)
      if (!silent) alert(`Erro ao carregar dados: ${getErrText(err)}`)
      if (!mountedRef.current) return
      setPastas([])
      setFluxos([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  async function carregarFluxosDaPasta(folderId, { silent = false } = {}) {
    try {
      setLoading(true)

      const fluxosRes = await apiGet('/flow', {
        query: { folder_id: folderId }
      })

      if (!mountedRef.current) return
      setFluxos(fluxosRes?.data || [])
    } catch (err) {
      console.error(err)
      if (!silent) alert(`Erro ao carregar fluxos da pasta: ${getErrText(err)}`)
      if (!mountedRef.current) return
      setFluxos([])
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true

    // ✅ React StrictMode chama effects 2x em DEV: roda só 1 vez
    if (!didInitRef.current) {
      didInitRef.current = true
      carregarDados()
    }

    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCriarPasta() {
    const nome = prompt('Nome da pasta:')
    if (!nome) return

    try {
      await apiPost('/flow/folders', { name: nome })
      await carregarDados({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao criar pasta: ${getErrText(err)}`)
    }
  }

  async function handleCriarFluxo() {
    const nome = prompt('Nome do novo fluxo:')
    if (!nome) return

    try {
      await apiPost('/flow', {
        name: nome,
        folder_id: pastaAtual?.id || null
      })

      if (pastaAtual?.id) {
        await carregarFluxosDaPasta(pastaAtual.id, { silent: true })
      } else {
        await carregarDados({ silent: true })
      }
    } catch (err) {
      console.error(err)
      alert(`Erro ao criar fluxo: ${getErrText(err)}`)
    }
  }

  async function entrarNaPasta(pasta) {
    setFluxoAtual(null)
    setPastaAtual(pasta)
    await carregarFluxosDaPasta(pasta.id)
  }

  function voltarDaPasta() {
    setFluxoAtual(null)
    setPastaAtual(null)
    carregarDados()
  }

  const fluxosFiltrados = pastaAtual ? fluxos : fluxos.filter((f) => !f.folder_id)

  if (fluxoAtual) {
    return (
      <div className="pcPage">
        <div className="pcPageHeader">
          <h1>Fluxo de Conversa</h1>
          <p>Criação e gerenciamento de robôs e caminhos automáticos</p>
        </div>

        <div className="pcBlock">
          <div className="pcCard">
            <div
              className="pcCardHeader"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h3>{fluxoAtual.name}</h3>
            </div>

            <div className="pcCardBody">
              <FluxoBuilder fluxo={fluxoAtual} onVoltar={() => setFluxoAtual(null)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pcPage">
      <div className="pcPageHeader">
        <h1>Fluxo de Conversa</h1>
        <p>Criação e gerenciamento de robôs e caminhos automáticos</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div
            className="pcCardHeader"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pastaAtual && (
                <button className="pcBtnPrimary" onClick={voltarDaPasta}>
                  Voltar
                </button>
              )}

              <h3>{pastaAtual ? `Pasta: ${pastaAtual.name}` : 'Construtor de Fluxos'}</h3>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {!pastaAtual && (
                <button className="pcBtnPrimary" onClick={handleCriarPasta}>
                  Criar Pasta
                </button>
              )}

              <button className="pcBtnPrimary" onClick={handleCriarFluxo}>
                Criar Novo Fluxo
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {loading && <div className="pcFluxoPlaceholder">Carregando...</div>}

            {!loading && !pastaAtual && pastas.length > 0 && (
              <>
                <h4 style={{ marginBottom: 10 }}>Pastas</h4>
                <div className="pcFluxoGrid">
                  {pastas.map((pasta) => {
                    const d = formatDateBR(pasta.created_at)
                    return (
                      <div key={pasta.id} className="pcFluxoCard" onClick={() => entrarNaPasta(pasta)}>
                        <strong>{pasta.name}</strong>
                        <span>{d ? `Criado em ${d}` : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {!loading && fluxosFiltrados.length > 0 && (
              <>
                <h4 style={{ marginTop: 25, marginBottom: 10 }}>{pastaAtual ? 'Fluxos da Pasta' : 'Fluxos'}</h4>

                <div className="pcFluxoGrid">
                  {fluxosFiltrados.map((fluxo) => {
                    const d = formatDateBR(fluxo.created_at)
                    return (
                      <div key={fluxo.id} className="pcFluxoCard" onClick={() => setFluxoAtual(fluxo)}>
                        <strong>{fluxo.name}</strong>
                        <span>{d ? `Criado em ${d}` : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {!loading && !pastaAtual && pastas.length === 0 && fluxosFiltrados.length === 0 && (
              <div className="pcFluxoPlaceholder">Nenhuma pasta ou fluxo criado ainda</div>
            )}

            {!loading && pastaAtual && fluxosFiltrados.length === 0 && (
              <div className="pcFluxoPlaceholder">Nenhum fluxo nesta pasta ainda</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/fluxo/Fluxo.jsx
