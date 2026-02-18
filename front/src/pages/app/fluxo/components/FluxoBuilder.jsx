// caminho: front/src/pages/app/fluxo/components/FluxoBuilder.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiDel, apiGet, apiPost, apiPut } from '../../../../services/api'
import '../fluxo.css'

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'

import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

function formatDateBR(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="pcFluxoModalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="presentation"
    >
      <div className="pcFluxoModal" role="dialog" aria-modal="true" aria-label={title || 'Modal'}>
        <div className="pcFluxoModalHeader">
          <strong className="pcFluxoModalTitle">{title || 'Modal'}</strong>
          <button className="pcBtnMini" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
            ✕
          </button>
        </div>

        <div className="pcFluxoModalBody">{children}</div>
      </div>
    </div>
  )
}

function StepForm({
  mode,
  initial,
  canInteract,
  onCancel,
  onSubmit
}) {
  const [type, setType] = useState(initial?.type || 'message')
  const [title, setTitle] = useState(initial?.title || '')
  const [message, setMessage] = useState(initial?.message || '')

  useEffect(() => {
    setType(initial?.type || 'message')
    setTitle(initial?.title || '')
    setMessage(initial?.message || '')
  }, [initial])

  const disabled = !canInteract

  function submit(e) {
    e.preventDefault()
    const t = String(title || '').trim()
    const m = String(message || '').trim()
    if (!t || !m) return
    onSubmit?.({ type, title: t, message: m })
  }

  return (
    <form onSubmit={submit} className="pcFluxoForm">
      <label className="pcFluxoField">
        <span className="pcFluxoLabel">Tipo</span>
        <select
          className="pcFluxoSelect"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={disabled}
        >
          <option value="message">Mensagem</option>
          <option value="condition" disabled>
            Condição (em breve)
          </option>
          <option value="wait" disabled>
            Espera (em breve)
          </option>
        </select>
      </label>

      <label className="pcFluxoField">
        <span className="pcFluxoLabel">Título</span>
        <input
          className="pcFluxoInput"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Saudação inicial"
          disabled={disabled}
          autoFocus
        />
      </label>

      <label className="pcFluxoField">
        <span className="pcFluxoLabel">Mensagem</span>
        <textarea
          className="pcFluxoTextarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite a mensagem que será enviada..."
          rows={5}
          disabled={disabled}
        />
      </label>

      <div className="pcFluxoModalActions">
        <button className="pcBtnGhost" type="button" onClick={onCancel} disabled={disabled}>
          Cancelar
        </button>
        <button className="pcBtnPrimary" type="submit" disabled={disabled || !String(title).trim() || !String(message).trim()}>
          {mode === 'edit' ? 'Salvar' : 'Criar etapa'}
        </button>
      </div>
    </form>
  )
}

function SortableStepCard({ etapa, index, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: etapa.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1
  }

  return (
    <div ref={setNodeRef} className="pcFluxoStepWrap" style={style}>
      <div className="pcFluxoStepRail" aria-hidden="true">
        <div className="pcFluxoStepDot" />
        {index !== 0 && <div className="pcFluxoStepLineTop" />}
        <div className="pcFluxoStepLineBottom" />
      </div>

      <div className="pcFluxoCard pcFluxoStepCard" title="Arraste para reordenar">
        <div className="pcFluxoStepTop">
          <div className="pcFluxoStepTopLeft">
            <span
              className="pcFluxoDrag"
              {...attributes}
              {...listeners}
              aria-label="Arrastar"
              title="Arrastar"
            >
              ⋮⋮
            </span>

            <div className="pcFluxoStepTitleWrap">
              <div className="pcFluxoStepTitleRow">
                <strong className="pcFluxoStepTitle" title={etapa.title}>
                  {etapa.title}
                </strong>
                <span className="pcFluxoStepBadge" title="Tipo: Mensagem">
                  Mensagem
                </span>
              </div>

              <span className="pcFluxoStepMeta">Etapa {index + 1}</span>
            </div>
          </div>

          <div className="pcFluxoStepActions">
            <button className="pcBtnMini" onClick={() => onEdit(etapa)} title="Editar" type="button">
              ✎
            </button>
            <button className="pcBtnMini" onClick={() => onDelete(etapa)} title="Excluir" type="button">
              ✕
            </button>
          </div>
        </div>

        <div className="pcFluxoStepBody">
          <div className="pcFluxoStepMsg">{etapa.message}</div>
          <div className="pcFluxoStepFooter">Criado em {formatDateBR(etapa.created_at) || '-'}</div>
        </div>
      </div>
    </div>
  )
}

function OverlayStepCard({ etapa }) {
  return (
    <div className="pcFluxoCard pcFluxoCardOverlay pcFluxoStepCard">
      <div className="pcFluxoStepTop">
        <div className="pcFluxoStepTopLeft">
          <span className="pcFluxoDrag" aria-hidden="true">
            ⋮⋮
          </span>

          <div className="pcFluxoStepTitleWrap">
            <div className="pcFluxoStepTitleRow">
              <strong className="pcFluxoStepTitle" title={etapa.title}>
                {etapa.title}
              </strong>
              <span className="pcFluxoStepBadge" title="Tipo: Mensagem">
                Mensagem
              </span>
            </div>

            <span className="pcFluxoStepMeta">Movendo...</span>
          </div>
        </div>

        <div className="pcFluxoStepActions">
          <span className="pcBtnMini" aria-hidden="true">
            ✎
          </span>
          <span className="pcBtnMini" aria-hidden="true">
            ✕
          </span>
        </div>
      </div>

      <div className="pcFluxoStepBody">
        <div className="pcFluxoStepMsg">{etapa.message}</div>
        <div className="pcFluxoStepFooter">Criado em {formatDateBR(etapa.created_at) || '-'}</div>
      </div>
    </div>
  )
}

export default function FluxoBuilder({ fluxo, onVoltar }) {
  const flowId = useMemo(() => Number(fluxo?.id || 0), [fluxo])
  const [etapas, setEtapas] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [modalEtapa, setModalEtapa] = useState(null)
  const [saving, setSaving] = useState(false)

  const etapasRef = useRef([])
  useEffect(() => {
    etapasRef.current = etapas
  }, [etapas])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function carregarEtapas() {
    if (!flowId) return
    try {
      setLoading(true)
      const res = await apiGet(`/flow/${flowId}/steps`)
      setEtapas(res?.data || [])
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar etapas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEtapas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId])

  function abrirCriar() {
    setModalMode('create')
    setModalEtapa(null)
    setModalOpen(true)
  }

  function abrirEditar(etapa) {
    setModalMode('edit')
    setModalEtapa(etapa)
    setModalOpen(true)
  }

  function fecharModal() {
    if (saving) return
    setModalOpen(false)
    setModalEtapa(null)
  }

  async function submitModal(payload) {
    if (!flowId) return

    try {
      setSaving(true)

      if (modalMode === 'create') {
        const pos = etapasRef.current.length
        // por enquanto o backend não tem campo "type" — mantemos só no UI
        await apiPost(`/flow/${flowId}/steps`, { title: payload.title, message: payload.message, position: pos })
      } else {
        if (!modalEtapa?.id) return
        await apiPut(`/flow/steps/${modalEtapa.id}`, { title: payload.title, message: payload.message })
      }

      await carregarEtapas()
      setModalOpen(false)
      setModalEtapa(null)
    } catch (err) {
      console.error(err)
      alert(modalMode === 'create' ? 'Erro ao criar etapa' : 'Erro ao editar etapa')
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluirEtapa(etapa) {
    const ok = confirm(`Excluir a etapa "${etapa.title}"?`)
    if (!ok) return

    try {
      await apiDel(`/flow/steps/${etapa.id}`)
      await carregarEtapas()
    } catch (err) {
      console.error(err)
      alert('Erro ao excluir etapa')
    }
  }

  function onDragStart(event) {
    setActiveId(event?.active?.id ?? null)
    document.body.style.cursor = 'grabbing'
  }

  function onDragCancel() {
    setActiveId(null)
    document.body.style.cursor = ''
  }

  async function persistPositions(nextList) {
    const updates = []
    for (let i = 0; i < nextList.length; i++) {
      const s = nextList[i]
      if (Number(s.position) !== i) updates.push({ id: s.id, position: i })
    }

    if (updates.length === 0) return

    try {
      await Promise.all(updates.map((u) => apiPut(`/flow/steps/${u.id}`, { position: u.position })))
    } catch (err) {
      console.error(err)
      await carregarEtapas()
      alert('Erro ao salvar nova ordem')
    }
  }

  async function onDragEnd(event) {
    setActiveId(null)
    document.body.style.cursor = ''

    const active = event?.active?.id
    const over = event?.over?.id
    if (!active || !over || active === over) return

    const current = etapasRef.current
    const oldIndex = current.findIndex((x) => x.id === active)
    const newIndex = current.findIndex((x) => x.id === over)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(current, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      position: idx
    }))

    setEtapas(next)
    await persistPositions(next)
  }

  const activeStep = useMemo(() => etapas.find((e) => e.id === activeId) || null, [activeId, etapas])

  return (
    <div className="pcFluxoBuilder">
      <div className="pcFluxoBuilderTop">
        <button className="pcBtnPrimary" onClick={onVoltar} type="button">
          Voltar
        </button>

        <button className="pcBtnPrimary" onClick={abrirCriar} type="button">
          Nova Etapa
        </button>
      </div>

      <div className="pcFluxoBuilderMeta">
        Fluxo: <strong className="pcFluxoBuilderMetaStrong">{fluxo?.name || '-'}</strong>
      </div>

      {loading && <div className="pcFluxoPlaceholder">Carregando...</div>}

      {!loading && etapas.length === 0 && <div className="pcFluxoPlaceholder">Nenhuma etapa criada ainda</div>}

      {!loading && etapas.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={etapas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="pcFluxoTimeline">
              {etapas.map((etapa, idx) => (
                <SortableStepCard
                  key={etapa.id}
                  etapa={etapa}
                  index={idx}
                  onEdit={abrirEditar}
                  onDelete={handleExcluirEtapa}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay adjustScale={false}>{activeStep ? <OverlayStepCard etapa={activeStep} /> : null}</DragOverlay>
        </DndContext>
      )}

      <Modal
        open={modalOpen}
        title={modalMode === 'edit' ? 'Editar etapa' : 'Nova etapa'}
        onClose={fecharModal}
      >
        <StepForm
          mode={modalMode}
          initial={
            modalMode === 'edit'
              ? { type: 'message', title: modalEtapa?.title || '', message: modalEtapa?.message || '' }
              : { type: 'message', title: '', message: '' }
          }
          canInteract={!saving}
          onCancel={fecharModal}
          onSubmit={submitModal}
        />
      </Modal>
    </div>
  )
}
// fim: front/src/pages/app/fluxo/components/FluxoBuilder.jsx
