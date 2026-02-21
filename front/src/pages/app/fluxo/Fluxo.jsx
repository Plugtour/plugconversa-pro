// caminho: front/src/pages/app/fluxo/Fluxo.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiDel, apiGet, apiPost, apiPut } from '../../../services/api'
import FluxoBuilder from './components/FluxoBuilder.jsx'
import FlowActionModal from './components/FlowActionModal.jsx'
import './fluxo.css'

import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

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

/**
 * Card de pasta com "drop zone" (apenas quando drag de fluxo raiz estiver ativo)
 */
function FolderDropCard({
  pasta,
  dLabel,
  flowsCount = 0,
  isMenuOpen,
  onEnter,
  onToggleMenu,
  menuRef,
  children,
  dragEnabled
}) {
  const droppableId = `folder:${pasta.id}`

  const { isOver, setNodeRef, active } = useDroppable({
    id: droppableId,
    disabled: !dragEnabled
  })

  const canHighlight = dragEnabled && !!active
  const cls = [
    'pcFluxoCard',
    'pcFluxoFolderCard',
    canHighlight ? 'pcFluxoDropTarget' : '',
    canHighlight && isOver ? 'pcFluxoDropTargetOver' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const count = Math.max(0, Number(flowsCount) || 0)

  return (
    <div ref={setNodeRef} className={cls} onClick={onEnter} style={{ position: 'relative' }}>
      <div className="pcFluxoFolderTopRow">
        <strong title={pasta.name} className="pcFluxoFolderName">
          {pasta.name}
        </strong>

        <button className="pcBtnMini" type="button" onClick={onToggleMenu} title="Mais opções" aria-label="Mais opções">
          ⋮
        </button>
      </div>

      <div className="pcFluxoFolderCountRow">
        <span className="pcFluxoFolderCountLabel">Quantidade de Fluxos</span>
        <span className="pcFluxoCountBadge" title={`${count} fluxo(s)`}>
          {count}
        </span>
      </div>

      <div className="pcFluxoFolderFooter">
        <span>{dLabel ? `Criado em ${dLabel}` : ''}</span>
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
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Card de fluxo raiz com "draggable" (handle em toda altura na lateral esquerda)
 */
function FlowDraggableCard({
  fluxo,
  dLabel,
  folderLabel,
  isMenuOpen,
  onOpen,
  onToggleMenu,
  menuRef,
  children,
  dragEnabled
}) {
  const dragId = `flow:${fluxo.id}`

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled: !dragEnabled
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1
  }

  const cls = ['pcFluxoCard', 'pcFluxoFlowCard', dragEnabled ? 'pcFluxoFlowCardDraggable' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={setNodeRef} className={cls} onClick={onOpen} style={{ position: 'relative', ...style }}>
      {dragEnabled && (
        <span
          className="pcFluxoDragBar"
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          title="Arrastar para uma pasta"
          aria-label="Arrastar para uma pasta"
        >
          ⋮⋮
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong title={fluxo.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fluxo.name}
          </strong>

          <span>
            {dLabel ? `Criado em ${dLabel}` : ''}
            {folderLabel ? ` • ${folderLabel}` : ''}
          </span>
        </div>

        <button
          className="pcBtnMini"
          type="button"
          onClick={onToggleMenu}
          title="Mais opções"
          aria-label="Mais opções"
          style={{ flex: '0 0 auto' }}
        >
          ⋮
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
          {children}
        </div>
      )}
    </div>
  )
}

export default function Fluxo() {
  const [pastas, setPastas] = useState([])
  const [fluxos, setFluxos] = useState([])
  const [loading, setLoading] = useState(false)
  const [pastaAtual, setPastaAtual] = useState(null)
  const [fluxoAtual, setFluxoAtual] = useState(null)

  const [menu, setMenu] = useState({ open: false, type: null, id: null })
  const menuRef = useRef(null)

  const didInitRef = useRef(false)
  const mountedRef = useRef(false)

  const [dragBusy, setDragBusy] = useState(false)
  const dragBusyRef = useRef(false)

  // ✅ modal criar pasta (NOVO)
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false)
  const [createFolderBusy, setCreateFolderBusy] = useState(false)

  // ✅ modal criar fluxo (NOVO)
  const [createFlowModalOpen, setCreateFlowModalOpen] = useState(false)
  const [createFlowSelectedFolderId, setCreateFlowSelectedFolderId] = useState(null)
  const [createFlowBusy, setCreateFlowBusy] = useState(false)

  // ✅ modal copiar
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copyFlow, setCopyFlow] = useState(null)
  const [copySelectedFolderId, setCopySelectedFolderId] = useState(null)
  const [copyBusy, setCopyBusy] = useState(false)

  // ✅ modal mover (novo)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveFlow, setMoveFlow] = useState(null)
  const [moveSelectedFolderId, setMoveSelectedFolderId] = useState(null)
  const [moveBusy, setMoveBusy] = useState(false)

  // ✅ modais padrão (renomear/copiar/excluir pasta, renomear/excluir fluxo)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState(null) // { type: 'folder'|'flow', item }
  const [renameBusy, setRenameBusy] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { type: 'folder'|'flow', item }
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [copyFolderModalOpen, setCopyFolderModalOpen] = useState(false)
  const [copyFolderTarget, setCopyFolderTarget] = useState(null) // pasta
  const [copyFolderBusy, setCopyFolderBusy] = useState(false)

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

      if (pastasRes.status === 'fulfilled') setPastas(pastasRes.value?.data || [])
      else {
        console.error(pastasRes.reason)
        if (!silent) alert(`Erro ao carregar pastas: ${getErrText(pastasRes.reason)}`)
        setPastas([])
      }

      if (fluxosRes.status === 'fulfilled') setFluxos(fluxosRes.value?.data || [])
      else {
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
      const fluxosRes = await apiGet('/flow', { query: { folder_id: folderId } })
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
    if (!didInitRef.current) {
      didInitRef.current = true
      carregarDados()
    }
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // =========================
  // ✅ CRIAR PASTA (NOVO modal)
  // =========================
  const existingFolderNames = useMemo(
    () =>
      (pastas || [])
        .map((p) => String(p?.name || '').trim())
        .filter(Boolean),
    [pastas]
  )

  function abrirModalCriarPasta() {
    closeMenu()
    setCreateFolderModalOpen(true)
  }

  function fecharModalCriarPasta() {
    if (createFolderBusy) return
    setCreateFolderModalOpen(false)
  }

  async function confirmarModalCriarPasta(payload) {
    const nome = String(payload?.value || '').trim()
    if (!nome) return

    try {
      setCreateFolderBusy(true)
      await apiPost('/flow/folders', { name: nome })
      await carregarDados({ silent: true })
      setCreateFolderModalOpen(false)
    } catch (err) {
      console.error(err)
      alert(`Erro ao criar pasta: ${getErrText(err)}`)
    } finally {
      setCreateFolderBusy(false)
    }
  }

  // =========================
  // ✅ CRIAR FLUXO (NOVO modal)
  // =========================
  function abrirModalCriarFluxo() {
    closeMenu()

    // default: se estiver dentro de uma pasta, já pré-seleciona ela
    const fid = pastaAtual?.id ? Number(pastaAtual.id) : null
    setCreateFlowSelectedFolderId(Number.isFinite(fid) && fid > 0 ? fid : null)

    setCreateFlowModalOpen(true)
  }

  function fecharModalCriarFluxo() {
    if (createFlowBusy) return
    setCreateFlowModalOpen(false)
  }

  const existingNamesForCreateFlowTarget = useMemo(() => {
    // ⚠️ no modo "dentro da pasta", o state fluxos normalmente está filtrado pela pasta atual.
    // Então validamos nomes apenas quando o destino selecionado é a pasta atual (ou raiz quando pastaAtual é null).
    const fid = createFlowSelectedFolderId === null ? null : Number(createFlowSelectedFolderId)

    const list = Array.isArray(fluxos) ? fluxos : []

    // quando NÃO estou em pasta, "fluxos" é a lista geral => valida corretamente para qualquer folder_id
    if (!pastaAtual) {
      return list
        .filter((f) => {
          const ff = f?.folder_id ? Number(f.folder_id) : null
          if (fid === null) return !ff
          return Number(ff) === Number(fid)
        })
        .map((f) => String(f?.name || '').trim())
        .filter(Boolean)
    }

    // quando estou em pasta, "fluxos" tende a ser apenas da pastaAtual
    // então só validamos se o destino selecionado for a pastaAtual
    const currentFolderId = pastaAtual?.id ? Number(pastaAtual.id) : null
    if ((fid ?? null) !== (currentFolderId ?? null)) return []
    return list.map((f) => String(f?.name || '').trim()).filter(Boolean)
  }, [fluxos, createFlowSelectedFolderId, pastaAtual])

  async function confirmarModalCriarFluxo(payload) {
    const folderId = payload?.folder_id ?? null
    const nome = String(payload?.name || '').trim()
    if (!nome) return

    try {
      setCreateFlowBusy(true)
      await apiPost('/flow', { name: nome, folder_id: folderId })
      await refreshList({ silent: true })
      setCreateFlowModalOpen(false)
    } catch (err) {
      console.error(err)
      alert(`Erro ao criar fluxo: ${getErrText(err)}`)
    } finally {
      setCreateFlowBusy(false)
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

  // =========================
  // ✅ RENOMEAR (modal padrão)
  // =========================
  function abrirModalRenomearFolder(pasta) {
    closeMenu()
    setRenameTarget({ type: 'folder', item: pasta })
    setRenameModalOpen(true)
  }

  function abrirModalRenomearFlow(fluxo) {
    closeMenu()
    setRenameTarget({ type: 'flow', item: fluxo })
    setRenameModalOpen(true)
  }

  function fecharModalRenomear() {
    if (renameBusy) return
    setRenameModalOpen(false)
    setRenameTarget(null)
  }

  async function confirmarModalRenomear(payload) {
    const t = renameTarget
    if (!t?.item?.id) return
    const next = String(payload?.value || '').trim()
    if (!next) return

    try {
      setRenameBusy(true)

      if (t.type === 'folder') {
        if (next === String(t.item?.name || '')) {
          fecharModalRenomear()
          return
        }
        await apiPut(`/flow/folders/${t.item.id}`, { name: next })
        await carregarDados({ silent: true })
      } else {
        if (next === String(t.item?.name || '')) {
          fecharModalRenomear()
          return
        }
        await apiPut(`/flow/${t.item.id}`, { name: next })
        await refreshList({ silent: true })
      }

      setRenameModalOpen(false)
      setRenameTarget(null)
    } catch (err) {
      console.error(err)
      alert(`Erro ao renomear: ${getErrText(err)}`)
    } finally {
      setRenameBusy(false)
    }
  }

  // =========================
  // ✅ COPIAR PASTA (modal padrão)
  // =========================
  function abrirModalCopiarPasta(pasta) {
    closeMenu()
    setCopyFolderTarget(pasta)
    setCopyFolderModalOpen(true)
  }

  function fecharModalCopiarPasta() {
    if (copyFolderBusy) return
    setCopyFolderModalOpen(false)
    setCopyFolderTarget(null)
  }

  async function confirmarModalCopiarPasta(payload) {
    if (!copyFolderTarget?.id) return

    const name = String(payload?.value || '').trim()
    const body = {}
    if (name) body.name = name

    try {
      setCopyFolderBusy(true)
      await apiPost(`/flow/folders/${copyFolderTarget.id}/copy`, body)
      await carregarDados({ silent: true })

      setCopyFolderModalOpen(false)
      setCopyFolderTarget(null)
    } catch (err) {
      console.error(err)
      alert(`Erro ao copiar pasta: ${getErrText(err)}`)
    } finally {
      setCopyFolderBusy(false)
    }
  }

  // =========================
  // ✅ EXCLUIR (modal padrão)
  // =========================
  function abrirModalExcluirFolder(pasta) {
    closeMenu()
    setDeleteTarget({ type: 'folder', item: pasta })
    setDeleteModalOpen(true)
  }

  function abrirModalExcluirFlow(fluxo) {
    closeMenu()
    setDeleteTarget({ type: 'flow', item: fluxo })
    setDeleteModalOpen(true)
  }

  function fecharModalExcluir() {
    if (deleteBusy) return
    setDeleteModalOpen(false)
    setDeleteTarget(null)
  }

  async function confirmarModalExcluir() {
    const t = deleteTarget
    if (!t?.item?.id) return

    try {
      setDeleteBusy(true)

      if (t.type === 'folder') {
        await apiDel(`/flow/folders/${t.item.id}`)
        await carregarDados({ silent: true })
      } else {
        await apiDel(`/flow/${t.item.id}`)
        await refreshList({ silent: true })
      }

      setDeleteModalOpen(false)
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)

      const code = err?.payload?.error
      if (t?.type === 'folder' && code === 'folder_not_empty') {
        const n = err?.payload?.data?.flows_count
        alert(`Essa pasta não está vazia. (${n || 0} fluxo(s) dentro)`)
        return
      }

      alert(`Erro ao excluir: ${getErrText(err)}`)
    } finally {
      setDeleteBusy(false)
    }
  }

  // =========================
  // ✅ COPIAR (modal)
  // =========================
  function abrirModalCopiarFluxo(fluxo) {
    closeMenu()
    setCopyFlow(fluxo)
    const fid = fluxo?.folder_id ? Number(fluxo.folder_id) : null
    setCopySelectedFolderId(Number.isFinite(fid) && fid > 0 ? fid : null)
    setCopyModalOpen(true)
  }

  function fecharModalCopiarFluxo() {
    if (copyBusy) return
    setCopyModalOpen(false)
    setCopyFlow(null)
  }

  const existingNamesForCopyTarget = useMemo(() => {
    const fid = copySelectedFolderId === null ? null : Number(copySelectedFolderId)
    const list = Array.isArray(fluxos) ? fluxos : []
    return list
      .filter((f) => {
        const ff = f?.folder_id ? Number(f.folder_id) : null
        if (fid === null) return !ff
        return Number(ff) === Number(fid)
      })
      .map((f) => String(f?.name || '').trim())
      .filter(Boolean)
  }, [fluxos, copySelectedFolderId])

  async function confirmarModalCopiarFluxo(payload) {
    if (!copyFlow?.id) return

    const folderId = payload?.folder_id ?? null
    const name = String(payload?.name || '').trim()

    try {
      setCopyBusy(true)
      const body = { folder_id: folderId }
      if (name) body.name = name

      await apiPost(`/flow/${copyFlow.id}/copy`, body)
      await refreshList({ silent: true })

      setCopyModalOpen(false)
      setCopyFlow(null)
    } catch (err) {
      console.error(err)
      alert(`Erro ao copiar fluxo: ${getErrText(err)}`)
    } finally {
      setCopyBusy(false)
    }
  }

  // =========================
  // ✅ MOVER (modal - novo)
  // =========================
  function abrirModalMoverFluxo(fluxo) {
    closeMenu()
    setMoveFlow(fluxo)

    // seleciona pasta atual do fluxo (ou raiz)
    const fid = fluxo?.folder_id ? Number(fluxo.folder_id) : null
    setMoveSelectedFolderId(Number.isFinite(fid) && fid > 0 ? fid : null)

    setMoveModalOpen(true)
  }

  function fecharModalMoverFluxo() {
    if (moveBusy) return
    setMoveModalOpen(false)
    setMoveFlow(null)
  }

  async function confirmarModalMoverFluxo(payload) {
    if (!moveFlow?.id) return

    const folderId = payload?.folder_id ?? null
    const current = moveFlow?.folder_id ? Number(moveFlow.folder_id) : null

    // se não mudou nada, fecha
    if ((folderId ?? null) === (current ?? null)) {
      setMoveModalOpen(false)
      setMoveFlow(null)
      return
    }

    try {
      setMoveBusy(true)
      await apiPut(`/flow/${moveFlow.id}`, { folder_id: folderId })
      await refreshList({ silent: true })

      setMoveModalOpen(false)
      setMoveFlow(null)
    } catch (err) {
      console.error(err)
      alert(`Erro ao mover fluxo: ${getErrText(err)}`)
      await refreshList({ silent: true })
    } finally {
      setMoveBusy(false)
    }
  }

  const fluxosFiltrados = pastaAtual ? fluxos : fluxos.filter((f) => !f.folder_id)

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

  const flowsCountByFolderId = useMemo(() => {
    const map = new Map()
    for (const f of fluxos || []) {
      const fid = f?.folder_id ? Number(f.folder_id) : null
      if (!fid) continue
      map.set(fid, (map.get(fid) || 0) + 1)
    }
    return map
  }, [fluxos])

  // ✅ não mostrar pasta atual (em mover/copy) — mantém tudo validado e só filtra a lista
  const pastasForMove = useMemo(() => {
    const currentId = moveFlow?.folder_id ? Number(moveFlow.folder_id) : null
    if (!currentId) return pastas
    return (pastas || []).filter((p) => Number(p?.id) !== Number(currentId))
  }, [pastas, moveFlow])

  const pastasForCopy = useMemo(() => {
    const currentId = copyFlow?.folder_id ? Number(copyFlow.folder_id) : null
    if (!currentId) return pastas
    return (pastas || []).filter((p) => Number(p?.id) !== Number(currentId))
  }, [pastas, copyFlow])

  const dragEnabled = !pastaAtual && !fluxoAtual && !loading && (pastas?.length || 0) > 0 && !dragBusy
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function onDragStartDnd() {
    closeMenu()
    document.body.style.cursor = 'grabbing'
  }

  function onDragCancelDnd() {
    document.body.style.cursor = ''
  }

  async function onDragEndDnd(event) {
    document.body.style.cursor = ''

    const activeId = event?.active?.id
    const overId = event?.over?.id
    if (!activeId || !overId) return

    const a = String(activeId)
    const o = String(overId)

    if (!a.startsWith('flow:')) return
    if (!o.startsWith('folder:')) return

    const flowId = Number(a.replace('flow:', ''))
    const folderId = Number(o.replace('folder:', ''))

    if (!Number.isFinite(flowId) || flowId <= 0) return
    if (!Number.isFinite(folderId) || folderId <= 0) return

    const flowObj = (fluxos || []).find((f) => Number(f.id) === Number(flowId))
    if (!flowObj) return
    if (flowObj.folder_id) return

    if (dragBusyRef.current) return
    dragBusyRef.current = true
    setDragBusy(true)

    try {
      await apiPut(`/flow/${flowId}`, { folder_id: folderId })
      await refreshList({ silent: true })
    } catch (err) {
      console.error(err)
      alert(`Erro ao mover fluxo: ${getErrText(err)}`)
      await refreshList({ silent: true })
    } finally {
      dragBusyRef.current = false
      if (mountedRef.current) setDragBusy(false)
    }
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

  const renameTitle =
    renameTarget?.type === 'folder'
      ? 'Renomear pasta'
      : renameTarget?.type === 'flow'
      ? 'Renomear fluxo'
      : 'Renomear'

  const renameLabel = renameTarget?.type === 'folder' ? 'Nome da pasta' : 'Nome do fluxo'

  const deleteTitle =
    deleteTarget?.type === 'folder' ? 'Excluir pasta' : deleteTarget?.type === 'flow' ? 'Excluir fluxo' : 'Excluir'

  const deleteDesc =
    deleteTarget?.type === 'folder'
      ? `Excluir a pasta "${deleteTarget?.item?.name || ''}"?\n\nAtenção: só é possível excluir se estiver vazia.`
      : `Excluir o fluxo "${deleteTarget?.item?.name || ''}"?\n\nAtenção: as etapas dele serão apagadas também.`

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
                <button className="pcBtnPrimary" onClick={abrirModalCriarPasta}>
                  Criar Pasta
                </button>
              )}

              <button className="pcBtnPrimary" onClick={abrirModalCriarFluxo}>
                Criar Novo Fluxo
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {loading && <div className="pcFluxoPlaceholder">Carregando...</div>}

            {/* ✅ modal criar pasta (NOVO) */}
            <FlowActionModal
              open={createFolderModalOpen}
              mode="rename"
              title="Criar pasta"
              inputLabel="Nome da pasta"
              inputPlaceholder="Digite o nome da pasta"
              initialValue=""
              confirmText="Criar pasta"
              existingNames={existingFolderNames}
              renameConflictText="Já existe uma pasta com esse nome. Escolha outro."
              busy={createFolderBusy}
              onCancel={fecharModalCriarPasta}
              onConfirm={confirmarModalCriarPasta}
            />

            {/* ✅ modal criar fluxo (NOVO) */}
            <FlowActionModal
              open={createFlowModalOpen}
              mode="select-folder"
              title="Criar novo fluxo"
              confirmText="Criar fluxo"
              busy={createFlowBusy}
              folders={pastas}
              showRootOption={true}
              rootLabel="Raiz (sem pasta)"
              selectedFolderId={createFlowSelectedFolderId}
              onSelectFolder={setCreateFlowSelectedFolderId}
              enableName={true}
              nameLabel="Nome do fluxo"
              namePlaceholder="Digite o nome do fluxo"
              baseCopyName=""
              existingNames={existingNamesForCreateFlowTarget}
              nameRequired={true}
              nameAutoGenerate={false}
              onCancel={fecharModalCriarFluxo}
              onConfirm={confirmarModalCriarFluxo}
            />

            {/* ✅ modal renomear (pasta/fluxo) */}
            <FlowActionModal
              open={renameModalOpen}
              mode="rename"
              title={renameTitle}
              inputLabel={renameLabel}
              inputPlaceholder="Digite o novo nome"
              initialValue={renameTarget?.item?.name || ''}
              confirmText="Salvar"
              busy={renameBusy}
              onCancel={fecharModalRenomear}
              onConfirm={confirmarModalRenomear}
            />

            {/* ✅ modal copiar pasta */}
            <FlowActionModal
              open={copyFolderModalOpen}
              mode="rename"
              title="Copiar pasta"
              inputLabel="Nome da cópia (opcional)"
              inputPlaceholder="Se não informar, será criada uma cópia com nome padrão"
              initialValue=""
              confirmText="Copiar"
              busy={copyFolderBusy}
              onCancel={fecharModalCopiarPasta}
              onConfirm={confirmarModalCopiarPasta}
            />

            {/* ✅ modal excluir (pasta/fluxo) */}
            <FlowActionModal
              open={deleteModalOpen}
              mode="confirm"
              title={deleteTitle}
              description={deleteDesc}
              danger={true}
              confirmText="Excluir"
              busy={deleteBusy}
              onCancel={fecharModalExcluir}
              onConfirm={confirmarModalExcluir}
            />

            {/* ✅ modal copiar fluxo */}
            <FlowActionModal
              open={copyModalOpen}
              mode="select-folder"
              title="Copiar fluxo"
              confirmText="Copiar aqui"
              busy={copyBusy}
              folders={pastasForCopy}
              showRootOption={true}
              rootLabel="Raiz (sem pasta)"
              selectedFolderId={copySelectedFolderId}
              onSelectFolder={setCopySelectedFolderId}
              enableName={true}
              nameLabel="Nome da cópia (opcional)"
              namePlaceholder="Se não informar, será usado: Nome (copia)"
              baseCopyName={copyFlow?.name || ''}
              existingNames={existingNamesForCopyTarget}
              onCancel={fecharModalCopiarFluxo}
              onConfirm={confirmarModalCopiarFluxo}
            />

            {/* ✅ modal mover fluxo */}
            <FlowActionModal
              open={moveModalOpen}
              mode="select-folder"
              title="Mover fluxo"
              confirmText="Mover aqui"
              busy={moveBusy}
              folders={pastasForMove}
              showRootOption={true}
              rootLabel="Raiz (sem pasta)"
              selectedFolderId={moveSelectedFolderId}
              onSelectFolder={setMoveSelectedFolderId}
              enableName={false}
              onCancel={fecharModalMoverFluxo}
              onConfirm={confirmarModalMoverFluxo}
            />

            {!loading && !pastaAtual && pastas.length > 0 && (
              <DndContext sensors={sensors} onDragStart={onDragStartDnd} onDragCancel={onDragCancelDnd} onDragEnd={onDragEndDnd}>
                <>
                  <h4 style={{ marginBottom: 10 }}>Pastas</h4>
                  <div className="pcFluxoGrid">
                    {pastas.map((pasta) => {
                      const d = formatDateBR(pasta.created_at)
                      const isMenuOpen = menu.open && menu.type === 'folder' && menu.id === pasta.id
                      const count = flowsCountByFolderId.get(Number(pasta.id)) || 0

                      return (
                        <FolderDropCard
                          key={pasta.id}
                          pasta={pasta}
                          dLabel={d}
                          flowsCount={count}
                          isMenuOpen={isMenuOpen}
                          onEnter={() => entrarNaPasta(pasta)}
                          onToggleMenu={(e) => toggleFolderMenu(e, pasta)}
                          menuRef={menuRef}
                          dragEnabled={dragEnabled}
                        >
                          <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalRenomearFolder(pasta)}>
                            Renomear
                          </button>

                          <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalCopiarPasta(pasta)}>
                            Copiar pasta
                          </button>

                          <div className="pcFluxoMenuDivider" />

                          <button
                            type="button"
                            className="pcFluxoMenuItem pcFluxoMenuItemDanger"
                            onClick={() => abrirModalExcluirFolder(pasta)}
                          >
                            Excluir
                          </button>
                        </FolderDropCard>
                      )
                    })}
                  </div>

                  {!loading && fluxosFiltrados.length > 0 && (
                    <>
                      <h4 style={{ marginTop: 25, marginBottom: 10 }}>Fluxos</h4>

                      <div className="pcFluxoGrid">
                        {fluxosFiltrados.map((fluxo) => {
                          const d = formatDateBR(fluxo.created_at)
                          const isMenuOpen = menu.open && menu.type === 'flow' && menu.id === fluxo.id

                          return (
                            <FlowDraggableCard
                              key={fluxo.id}
                              fluxo={fluxo}
                              dLabel={d}
                              folderLabel={` ${getFlowFolderLabel(fluxo)}`}
                              isMenuOpen={isMenuOpen}
                              onOpen={() => abrirFluxo(fluxo)}
                              onToggleMenu={(e) => toggleFlowMenu(e, fluxo)}
                              menuRef={menuRef}
                              dragEnabled={dragEnabled}
                            >
                              <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalRenomearFlow(fluxo)}>
                                Renomear
                              </button>

                              <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalCopiarFluxo(fluxo)}>
                                Copiar fluxo…
                              </button>

                              <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalMoverFluxo(fluxo)}>
                                Mover para…
                              </button>

                              <div className="pcFluxoMenuDivider" />

                              <button
                                type="button"
                                className="pcFluxoMenuItem pcFluxoMenuItemDanger"
                                onClick={() => abrirModalExcluirFlow(fluxo)}
                              >
                                Excluir
                              </button>
                            </FlowDraggableCard>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {!loading && !pastaAtual && pastas.length === 0 && fluxosFiltrados.length === 0 && (
                    <div className="pcFluxoPlaceholder">Nenhuma pasta ou fluxo criado ainda</div>
                  )}
                </>
              </DndContext>
            )}

            {!loading && pastaAtual && fluxosFiltrados.length > 0 && (
              <>
                <h4 style={{ marginTop: 25, marginBottom: 10 }}>Fluxos da Pasta</h4>

                <div className="pcFluxoGrid">
                  {fluxosFiltrados.map((fluxo) => {
                    const d = formatDateBR(fluxo.created_at)
                    const isMenuOpen = menu.open && menu.type === 'flow' && menu.id === fluxo.id

                    return (
                      <div key={fluxo.id} className="pcFluxoCard" onClick={() => abrirFluxo(fluxo)} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ minWidth: 0, flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <strong title={fluxo.name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {fluxo.name}
                            </strong>

                            <span>{d ? `Criado em ${d}` : ''}</span>
                          </div>

                          <button
                            className="pcBtnMini"
                            type="button"
                            onClick={(e) => toggleFlowMenu(e, fluxo)}
                            title="Mais opções"
                            aria-label="Mais opções"
                            style={{ flex: '0 0 auto' }}
                          >
                            ⋮
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
                            <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalRenomearFlow(fluxo)}>
                              Renomear
                            </button>

                            <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalCopiarFluxo(fluxo)}>
                              Copiar fluxo…
                            </button>

                            <button type="button" className="pcFluxoMenuItem" onClick={() => abrirModalMoverFluxo(fluxo)}>
                              Mover para…
                            </button>

                            <div className="pcFluxoMenuDivider" />

                            <button
                              type="button"
                              className="pcFluxoMenuItem pcFluxoMenuItemDanger"
                              onClick={() => abrirModalExcluirFlow(fluxo)}
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

            {!loading && pastaAtual && fluxosFiltrados.length === 0 && <div className="pcFluxoPlaceholder">Nenhum fluxo nesta pasta ainda</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/fluxo/Fluxo.jsx