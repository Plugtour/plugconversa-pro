// caminho: front/src/pages/app/crm/CRM.jsx
import { memo, useMemo, useState } from 'react'
import './crm.css'
import KanbanBoard from './components/KanbanBoard'

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// ✅ evita re-render do board quando só muda modal/campos
const KanbanBoardMemo = memo(KanbanBoard)

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
          { id: 'c-444', title: '444444' },
          { id: 'c-555', title: '555555555' }
        ]
      },
      {
        id: 'col-lead-frio',
        title: 'Lead Frio',
        color: '#d63b3b',
        cards: [{ id: 'c-1111', title: '1111' }]
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
          <button
            type="button"
            className="pcBtnPrimary"
            onClick={refreshBoard}
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="pcCrmBoardWrapper">
        <KanbanBoardMemo columns={columns} setColumns={setColumns} />
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
              <button
                type="button"
                className="pcCrmModalX"
                onClick={closeNewColumn}
              >
                ✕
              </button>
            </div>

            <div className="pcCrmModalBody">
              <div className="pcCrmColPreview">
                <div
                  className="pcCrmColTopbar"
                  style={{ background: newColColor || '#111111' }}
                />
                <div className="pcCrmColPreviewTitle">
                  {newColName?.trim()
                    ? newColName.trim()
                    : 'Prévia da coluna'}
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
                <button
                  type="button"
                  className="pcBtnPrimary"
                  onClick={createColumn}
                >
                  Criar
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
