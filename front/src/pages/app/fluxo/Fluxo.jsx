// caminho: front/src/pages/app/fluxo/Fluxo.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiDel, apiGet, apiPost, apiPut } from '../../../services/api'
import FluxoBuilder from './components/FluxoBuilder.jsx'
import './fluxo.css'

function getErrText(err) {
  const status = err?.status
  const payload = err?.payload
  const msg =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) || err?.message || 'erro'
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

  // ✅ menu ⋯ (pastas e fluxos)
  const [menu, setMenu] = useState({
    open: false,
    type: null, // 'folder' | 'flow'
    id: null
  })
  const menuRef = useRef(null)

  // ✅ evita alert duplicado no React StrictMode (DEV) e evita setState após unmount
  const didInitRef = useRef(false)
  const mountedRef = useRef(false)

  function closeMenu() {
    setMenu({ open: false, type: null, id: null })
  }

  useEffect(() => {
    function onDocDown(e) {
      if (!menu.open) return
      const el = menuRef.current
      if (el && el.contains(e.target)) return
      closeMenu()
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [menu.open])

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

  async function refreshList({ silent = true } = {}) {
    if (pastaAtual?.id) {
      await carregarFluxosDaPasta(pastaAtual.id, { silent })
      return
    }
    await carregarDados({ silent })
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

      await refreshList({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao criar fluxo: ${getErrText(err)}`)
    }
  }

  async function entrarNaPasta(pasta) {
    closeMenu()
    setFluxoAtual(null)
    setPastaAtual(pasta)
    await carregarFluxosDaPasta(pasta.id)
  }

  function voltarDaPasta() {
    closeMenu()
    setFluxoAtual(null)
    setPastaAtual(null)
    carregarDados()
  }

  function abrirFluxo(fluxo) {
    closeMenu()
    setFluxoAtual(fluxo)
  }

  function toggleFolderMenu(e, pasta) {
    e.preventDefault()
    e.stopPropagation()
    setMenu((m) => {
      const same = m.open && m.type === 'folder' && m.id === pasta.id
      return same ? { open: false, type: null, id: null } : { open: true, type: 'folder', id: pasta.id }
    })
  }

  function toggleFlowMenu(e, fluxo) {
    e.preventDefault()
    e.stopPropagation()
    setMenu((m) => {
      const same = m.open && m.type === 'flow' && m.id === fluxo.id
      return same ? { open: false, type: null, id: null } : { open: true, type: 'flow', id: fluxo.id }
    })
  }

  async function handleRenomearPasta(pasta) {
    closeMenu()
    const nome = prompt('Novo nome da pasta:', pasta?.name || '')
    if (!nome) return
    const next = String(nome).trim()
    if (!next) return
    if (next === String(pasta?.name || '')) return

    try {
      await apiPut(`/flow/folders/${pasta.id}`, { name: next })
      await carregarDados({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao renomear pasta: ${getErrText(err)}`)
    }
  }

  async function handleCopiarPasta(pasta) {
    closeMenu()
    const nome = prompt('Nome da cópia (opcional):', '')
    const payload = {}
    const v = String(nome || '').trim()
    if (v) payload.name = v

    try {
      await apiPost(`/flow/folders/${pasta.id}/copy`, payload)
      await carregarDados({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao copiar pasta: ${getErrText(err)}`)
    }
  }

  async function handleExcluirPasta(pasta) {
    closeMenu()
    const ok = confirm(`Excluir a pasta "${pasta?.name}"?\n\nAtenção: só é possível excluir se estiver vazia.`)
    if (!ok) return

    try {
      await apiDel(`/flow/folders/${pasta.id}`)
      await carregarDados({ silent: true })
    } catch (err) {
      console.error(err)

      const code = err?.payload?.error
      if (code === 'folder_not_empty') {
        const n = err?.payload?.data?.flows_count
        alert(`Essa pasta não está vazia. (${n || 0} fluxo(s) dentro)`)
        return
      }

      alert(`Erro ao excluir pasta: ${getErrText(err)}`)
    }
  }

  async function handleRenomearFluxo(fluxo) {
    closeMenu()
    const nome = prompt('Novo nome do fluxo:', fluxo?.name || '')
    if (!nome) return
    const next = String(nome).trim()
    if (!next) return
    if (next === String(fluxo?.name || '')) return

    try {
      await apiPut(`/flow/${fluxo.id}`, { name: next })
      await refreshList({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao renomear fluxo: ${getErrText(err)}`)
    }
  }

  async function handleCopiarFluxo(fluxo) {
    closeMenu()

    const nome = prompt('Nome da cópia (opcional):', '')
    if (nome === null) return

    const payload = {}
    const v = String(nome || '').trim()
    if (v) payload.name = v

    // ✅ destino opcional (raiz / outra pasta / manter a mesma pasta)
    const options = pastas || []
    const lines = ['0 - Raiz (sem pasta)']
    for (const p of options) lines.push(`${p.id} - ${p.name}`)

    const rawDest = prompt(
      `Copiar o fluxo "${fluxo?.name}" para qual pasta?\n\n${lines.join(
        '\n'
      )}\n\nDigite o número (ou deixe vazio para manter a mesma pasta):`,
      ''
    )
    if (rawDest === null) return

    const dest = String(rawDest || '').trim()

    // vazio => mantém a mesma pasta do original (não envia folder_id)
    if (dest) {
      if (dest === '0') {
        payload.folder_id = null // raiz
      } else {
        const targetId = Number(dest)
        if (!Number.isFinite(targetId) || targetId <= 0) {
          alert('ID inválido.')
          return
        }
        payload.folder_id = targetId
      }
    }

    try {
      await apiPost(`/flow/${fluxo.id}/copy`, payload)
      await refreshList({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao copiar fluxo: ${getErrText(err)}`)
    }
  }

  async function handleMoverFluxo(fluxo) {
    closeMenu()

    const isInFolder = !!fluxo?.folder_id

    const options = pastas || []
    if (options.length === 0) {
      alert('Você ainda não tem pastas para mover. Crie uma pasta primeiro.')
      return
    }

    const title = `Mover fluxo "${fluxo?.name}" para:`
    const lines = []

    if (isInFolder) lines.push('0 - Raiz (sem pasta)')
    for (const p of options) {
      if (isInFolder && Number(p.id) === Number(fluxo.folder_id)) continue
      lines.push(`${p.id} - ${p.name}`)
    }

    const raw = prompt(`${title}\n\n${lines.join('\n')}\n\nDigite o número:`)
    if (raw === null) return

    const val = String(raw).trim()
    if (!val) return

    if (val === '0') {
      if (!isInFolder) return
      try {
        await apiPut(`/flow/${fluxo.id}`, { folder_id: null })
        await refreshList({ silent: true })
      } catch (err) {
        console.error(err)
        alert(`Erro ao mover fluxo: ${getErrText(err)}`)
      }
      return
    }

    const targetId = Number(val)
    if (!Number.isFinite(targetId) || targetId <= 0) {
      alert('ID inválido.')
      return
    }

    if (isInFolder && Number(targetId) === Number(fluxo.folder_id)) return

    try {
      await apiPut(`/flow/${fluxo.id}`, { folder_id: targetId })
      await refreshList({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao mover fluxo: ${getErrText(err)}`)
    }
  }

  async function handleExcluirFluxo(fluxo) {
    closeMenu()
    const ok = confirm(`Excluir o fluxo "${fluxo?.name}"?\n\nAtenção: as etapas dele serão apagadas também.`)
    if (!ok) return

    try {
      await apiDel(`/flow/${fluxo.id}`)
      await refreshList({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao excluir fluxo: ${getErrText(err)}`)
    }
  }

  const fluxosFiltrados = pastaAtual ? fluxos : fluxos.filter((f) => !f.folder_id)

  // ✅ helper: nome da pasta atual de um fluxo (para UI)
  const pastaById = useMemo(() => {
    const map = new Map()
    for (const p of pastas || []) map.set(Number(p.id), p)
    return map
  }, [pastas])

  function getFlowFolderLabel(fluxo) {
    const fid = fluxo?.folder_id ? Number(fluxo.folder_id) : null
    if (!fid) return 'Raiz'
    return pastaById.get(fid)?.name || `Pasta #${fid}`
  }

  if (fluxoAtual) {
    return (
      <div className="pcPage">
        <div className="pcPageHeader">
          <h1>Fluxo de Conversa</h1>
          <p>Criação e gerenciamento de robôs e caminhos automáticos</p>
        </div>

        <div className="pcBlock">
          <div className="pcCard">
            <div className="pcCardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div className="pcCardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    const isMenuOpen = menu.open && menu.type === 'folder' && menu.id === pasta.id

                    return (
                      <div key={pasta.id} className="pcFluxoCard" onClick={() => entrarNaPasta(pasta)} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div
                            style={{
                              minWidth: 0,
                              flex: '1 1 auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}
                          >
                            <strong title={pasta.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {pasta.name}
                            </strong>
                            <span>{d ? `Criado em ${d}` : ''}</span>
                          </div>

                          <button
                            className="pcBtnMini"
                            type="button"
                            onClick={(e) => toggleFolderMenu(e, pasta)}
                            title="Mais opções"
                            aria-label="Mais opções"
                            style={{ flex: '0 0 auto' }}
                          >
                            ⋯
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="pcFluxoMenu pcFluxoMenuPanel pcFluxoMenuPanelFolder"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            role="menu"
                          >
                            <button type="button" className="pcFluxoMenuItem" onClick={() => handleRenomearPasta(pasta)}>
                              Renomear
                            </button>

                            <button type="button" className="pcFluxoMenuItem" onClick={() => handleCopiarPasta(pasta)}>
                              Copiar pasta
                            </button>

                            <div className="pcFluxoMenuDivider" />

                            <button
                              type="button"
                              className="pcFluxoMenuItem pcFluxoMenuItemDanger"
                              onClick={() => handleExcluirPasta(pasta)}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
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
                    const isMenuOpen = menu.open && menu.type === 'flow' && menu.id === fluxo.id

                    return (
                      <div key={fluxo.id} className="pcFluxoCard" onClick={() => abrirFluxo(fluxo)} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div
                            style={{
                              minWidth: 0,
                              flex: '1 1 auto',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}
                          >
                            <strong title={fluxo.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fluxo.name}
                            </strong>

                            <span>
                              {d ? `Criado em ${d}` : ''}
                              {pastaAtual ? '' : ` • ${getFlowFolderLabel(fluxo)}`}
                            </span>
                          </div>

                          <button
                            className="pcBtnMini"
                            type="button"
                            onClick={(e) => toggleFlowMenu(e, fluxo)}
                            title="Mais opções"
                            aria-label="Mais opções"
                            style={{ flex: '0 0 auto' }}
                          >
                            ⋯
                          </button>
                        </div>

                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="pcFluxoMenu pcFluxoMenuPanel pcFluxoMenuPanelFlow"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            role="menu"
                          >
                            <button type="button" className="pcFluxoMenuItem" onClick={() => handleRenomearFluxo(fluxo)}>
                              Renomear
                            </button>

                            <button type="button" className="pcFluxoMenuItem" onClick={() => handleCopiarFluxo(fluxo)}>
                              Copiar fluxo…
                            </button>

                            <button type="button" className="pcFluxoMenuItem" onClick={() => handleMoverFluxo(fluxo)}>
                              Mover para…
                            </button>

                            <div className="pcFluxoMenuDivider" />

                            <button
                              type="button"
                              className="pcFluxoMenuItem pcFluxoMenuItemDanger"
                              onClick={() => handleExcluirFluxo(fluxo)}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {!loading && !pastaAtual && pastas.length === 0 && fluxosFiltrados.length === 0 && (
              <div className="pcFluxoPlaceholder">Nenhuma pasta ou fluxo criado ainda</div>
            )}

            {!loading && pastaAtual && fluxosFiltrados.length === 0 && <div className="pcFluxoPlaceholder">Nenhum fluxo nesta pasta ainda</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/fluxo/Fluxo.jsx