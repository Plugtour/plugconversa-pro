// caminho: front/src/pages/app/crm/CRM.jsx
import { memo, useEffect, useMemo, useState } from 'react'
import './crm.css'
import KanbanBoard from './components/KanbanBoard'

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeJsonParse(s, fallback) {
  try {
    const v = JSON.parse(s)
    return v ?? fallback
  } catch {
    return fallback
  }
}

const STORAGE_FIELDS = 'pc_cfg_fields'
const STORAGE_TAGS = 'pc_cfg_tags'
const STORAGE_LOGS = 'pc_logs'

function loadCfgArray(key) {
  const raw = localStorage.getItem(key)
  const parsed = safeJsonParse(raw, [])
  return Array.isArray(parsed) ? parsed : []
}

function pushLog({ module, action, description }) {
  const now = new Date().toISOString()
  const item = {
    id: uid('log'),
    user: 'Sistema',
    module: String(module || 'Sistema'),
    action: String(action || ''),
    description: String(description || ''),
    date: now,
    ip: ''
  }

  const prev = safeJsonParse(localStorage.getItem(STORAGE_LOGS), [])
  const list = Array.isArray(prev) ? prev : []
  const next = [item, ...list].slice(0, 500)
  localStorage.setItem(STORAGE_LOGS, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('pc:logs'))
}

// ✅ evita re-render do board quando só muda modal/campos
const KanbanBoardMemo = memo(KanbanBoard)

function normalizeType(t) {
  return String(t || 'text').toLowerCase()
}

function isSelectType(type) {
  const t = normalizeType(type)
  return t === 'select' || t === 'multiselect'
}

function isMulti(type) {
  return normalizeType(type) === 'multiselect'
}

export default function CRM() {
  const initialColumns = useMemo(
    () => [
      {
        id: 'col-lead-morno',
        title: 'Lead Morno',
        color: '#111111',
        cards: []
      },
      {
        id: 'col-perdido',
        title: 'Perdido',
        color: '#111111',
        cards: [
          { id: 'c-444', title: '444444', tagIds: [], fields: {} },
          { id: 'c-555', title: '555555555', tagIds: [], fields: {} }
        ]
      },
      {
        id: 'col-lead-frio',
        title: 'Lead Frio',
        color: '#d63b3b',
        cards: [{ id: 'c-1111', title: '1111', tagIds: [], fields: {} }]
      },
      {
        id: 'col-cliente-f',
        title: 'Cliente F',
        color: '#1f7a6e',
        cards: []
      },
      {
        id: 'col-lead-quente',
        title: 'Lead Quente',
        color: '#111111',
        cards: []
      }
    ],
    []
  )

  const [columns, setColumns] = useState(initialColumns)

  const [newColOpen, setNewColOpen] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState('#111111')

  const [cfgFields, setCfgFields] = useState([])
  const [cfgTags, setCfgTags] = useState([])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsCardId, setDetailsCardId] = useState(null)

  const detailsCard = useMemo(() => {
    if (!detailsCardId) return null
    for (const col of columns) {
      const found = col.cards.find((c) => c.id === detailsCardId)
      if (found) return found
    }
    return null
  }, [columns, detailsCardId])

  const activeFields = useMemo(() => cfgFields.filter((f) => f?.active !== false), [cfgFields])
  const activeTags = useMemo(() => cfgTags.filter((t) => t?.active !== false), [cfgTags])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const sync = () => {
      setCfgFields(loadCfgArray(STORAGE_FIELDS))
      setCfgTags(loadCfgArray(STORAGE_TAGS))
    }

    sync()

    const onCfg = (e) => {
      const k = e?.detail?.key
      if (!k || k === STORAGE_FIELDS || k === STORAGE_TAGS) sync()
    }

    const onStorage = (e) => {
      if (e?.key === STORAGE_FIELDS || e?.key === STORAGE_TAGS) sync()
    }

    window.addEventListener('pc:cfg-changed', onCfg)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('pc:cfg-changed', onCfg)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  function openNewColumn() {
    setNewColName('')
    setNewColColor('#111111')
    setNewColOpen(true)
  }

  function closeNewColumn() {
    setNewColOpen(false)
  }

  function createColumn() {
    const name = String(newColName || '').trim()
    if (!name) return

    setColumns((prev) => [
      ...prev,
      {
        id: uid('col'),
        title: name,
        color: newColColor || '#111111',
        cards: []
      }
    ])

    setNewColOpen(false)
  }

  function refreshBoard() {
    setColumns((prev) => [...prev])
  }

  function openCardDetails(card) {
    if (!card?.id) return
    setDetailsCardId(card.id)
    setDetailsOpen(true)
  }

  function closeCardDetails() {
    setDetailsOpen(false)
    setDetailsCardId(null)
  }

  function updateCardById(cardId, patch) {
    setColumns((prev) =>
      prev.map((col) => {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx < 0) return col
        const nextCards = [...col.cards]
        nextCards[idx] = { ...nextCards[idx], ...patch }
        return { ...col, cards: nextCards }
      })
    )
  }

  function toggleTag(cardId, tagId) {
    const card = detailsCard
    if (!card) return
    const current = Array.isArray(card.tagIds) ? card.tagIds : []
    const exists = current.includes(tagId)
    const next = exists ? current.filter((x) => x !== tagId) : [...current, tagId]
    updateCardById(cardId, { tagIds: next })
    pushLog({
      module: 'CRM',
      action: 'Aplicou etiqueta',
      description: `${exists ? 'Removeu' : 'Aplicou'} etiqueta #${tagId} no card ${cardId}`
    })
  }

  function setFieldValue(cardId, fieldId, value) {
    const card = detailsCard
    if (!card) return
    const prevFields = card.fields && typeof card.fields === 'object' ? card.fields : {}
    const nextFields = { ...prevFields, [String(fieldId)]: value }
    updateCardById(cardId, { fields: nextFields })
    pushLog({
      module: 'CRM',
      action: 'Alterou contato',
      description: `Atualizou campo ${fieldId} no card ${cardId}`
    })
  }

  const columnsWithHandlers = useMemo(() => {
    // ✅ injeta callback no column (sem mexer na estrutura do board)
    return columns.map((c) => ({
      ...c,
      onOpenDetails: openCardDetails,
      cards: (c.cards || []).map((card) => {
        const ids = Array.isArray(card.tagIds) ? card.tagIds : []
        const names = ids
          .map((id) => cfgTags.find((t) => t.id === id)?.name)
          .filter(Boolean)
        return { ...card, tagNames: names }
      })
    }))
  }, [columns, cfgTags])

  function onCardMoved({ cardId, fromColumnId, toColumnId }) {
    const from = columns.find((c) => c.id === fromColumnId)?.title || fromColumnId
    const to = columns.find((c) => c.id === toColumnId)?.title || toColumnId
    pushLog({
      module: 'CRM',
      action: 'Mudança de etapa no CRM',
      description: `Card ${cardId} movido de "${from}" para "${to}".`
    })
  }

  return (
    <div className="pcCrmPage">
      <div className="pcCrmHeader">
        <div>
          <h1>CRM Kanban</h1>
          <p>Gestão de oportunidades e funil</p>
        </div>

        <div className="pcCrmActions">
          <button type="button" onClick={openNewColumn}>
            Nova coluna
          </button>
          <button type="button" className="pcBtnPrimary" onClick={refreshBoard}>
            Atualizar
          </button>
        </div>
      </div>

      <div className="pcCrmBoardWrapper">
        <KanbanBoardMemo columns={columnsWithHandlers} setColumns={setColumns} onCardMoved={onCardMoved} />
      </div>

      {newColOpen && (
        <div
          className="pcCrmModalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeNewColumn()
          }}
        >
          <div
            className="pcCrmModal"
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeNewColumn()
              if (e.key === 'Enter') createColumn()
            }}
          >
            <div className="pcCrmModalHeader">
              <strong>Nova coluna</strong>
              <button type="button" className="pcCrmModalX" onClick={closeNewColumn}>
                ✕
              </button>
            </div>

            <div className="pcCrmModalBody">
              <div className="pcCrmColPreview">
                <div className="pcCrmColTopbar" style={{ background: newColColor || '#111111' }} />
                <div className="pcCrmColPreviewTitle">
                  {newColName?.trim() ? newColName.trim() : 'Prévia da coluna'}
                </div>
              </div>

              <label className="pcCrmField">
                <span>Nome da coluna</span>
                <input
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Ex: Proposta enviada"
                  autoFocus
                />
              </label>

              <label className="pcCrmField">
                <span>Cor da barra</span>
                <div className="pcCrmColorRow">
                  <input
                    type="color"
                    value={newColColor}
                    onChange={(e) => setNewColColor(e.target.value)}
                    aria-label="Selecionar cor"
                  />
                  <input
                    value={newColColor}
                    onChange={(e) => setNewColColor(e.target.value)}
                    placeholder="#111111"
                  />
                </div>
              </label>

              <div className="pcCrmModalActions">
                <button type="button" onClick={closeNewColumn}>
                  Cancelar
                </button>
                <button type="button" className="pcBtnPrimary" onClick={createColumn}>
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailsOpen && detailsCard && (
        <div
          className="pcCrmModalBackdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCardDetails()
          }}
        >
          <div className="pcCrmModal">
            <div className="pcCrmModalHeader">
              <strong>Detalhes</strong>
              <button type="button" className="pcCrmModalX" onClick={closeCardDetails}>
                ✕
              </button>
            </div>

            <div className="pcCrmModalBody">
              <div className="pcCrmField">
                <span>Título</span>
                <input
                  value={detailsCard.title || ''}
                  onChange={(e) => {
                    updateCardById(detailsCard.id, { title: e.target.value })
                    pushLog({
                      module: 'CRM',
                      action: 'Alterou contato',
                      description: `Atualizou título do card ${detailsCard.id}`
                    })
                  }}
                />
              </div>

              <div className="pcCrmField">
                <span>Etiquetas</span>
                <div style={{ display: 'grid', gap: 8 }}>
                  {activeTags.length === 0 ? (
                    <div style={{ color: '#777', fontSize: 13 }}>Nenhuma etiqueta cadastrada.</div>
                  ) : (
                    activeTags.map((t) => {
                      const checked = Array.isArray(detailsCard.tagIds) && detailsCard.tagIds.includes(t.id)
                      return (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTag(detailsCard.id, t.id)}
                          />
                          <span style={{ width: 10, height: 10, borderRadius: 99, background: t.color, display: 'inline-block' }} />
                          <span style={{ fontSize: 13 }}>{t.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="pcCrmField">
                <span>Campos personalizados</span>

                <div style={{ display: 'grid', gap: 10 }}>
                  {activeFields.length === 0 ? (
                    <div style={{ color: '#777', fontSize: 13 }}>Nenhum campo cadastrado.</div>
                  ) : (
                    activeFields.map((f) => {
                      const fid = String(f.id)
                      const type = normalizeType(f.type)
                      const value = detailsCard.fields?.[fid]

                      if (type === 'boolean') {
                        return (
                          <label key={fid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input
                              type="checkbox"
                              checked={!!value}
                              onChange={(e) => setFieldValue(detailsCard.id, fid, e.target.checked)}
                            />
                            <span style={{ fontSize: 13 }}>{f.name}</span>
                          </label>
                        )
                      }

                      if (isSelectType(type)) {
                        const opts = Array.isArray(f.options) ? f.options : []
                        if (isMulti(type)) {
                          const arr = Array.isArray(value) ? value : []
                          return (
                            <div key={fid} style={{ display: 'grid', gap: 6 }}>
                              <div style={{ fontSize: 13, color: '#444' }}>{f.name}</div>
                              <div style={{ display: 'grid', gap: 6 }}>
                                {opts.map((op) => {
                                  const checked = arr.includes(op)
                                  return (
                                    <label key={op} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          const next = checked ? arr.filter((x) => x !== op) : [...arr, op]
                                          setFieldValue(detailsCard.id, fid, next)
                                        }}
                                      />
                                      <span style={{ fontSize: 13 }}>{op}</span>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <label key={fid} className="pcCrmField">
                            <span>{f.name}</span>
                            <select
                              value={value || ''}
                              onChange={(e) => setFieldValue(detailsCard.id, fid, e.target.value)}
                            >
                              <option value="">Selecione...</option>
                              {opts.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                          </label>
                        )
                      }

                      const inputType = type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'

                      return (
                        <label key={fid} className="pcCrmField">
                          <span>
                            {f.name}
                            {f.required ? ' *' : ''}
                          </span>
                          <input
                            type={inputType}
                            value={value ?? ''}
                            onChange={(e) => setFieldValue(detailsCard.id, fid, e.target.value)}
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="pcCrmModalActions">
                <button type="button" onClick={closeCardDetails}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// fim: front/src/pages/app/crm/CRM.jsx