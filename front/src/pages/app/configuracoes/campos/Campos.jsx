// caminho: front/src/pages/app/configuracoes/campos/Campos.jsx
import { useEffect, useMemo, useState } from 'react'
import './campos.css'
import { getFields, setFields, logEvent } from '../../../../services/appStore'

const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'phone', label: 'Telefone' },
  { value: 'date', label: 'Data' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção (1 opção)' },
  { value: 'multiselect', label: 'Seleção (múltiplas opções)' },
  { value: 'boolean', label: 'Sim / Não' }
]

function normalizeName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ')
}

function lowerKey(v) {
  return normalizeName(v).toLowerCase()
}

function typeLabel(type) {
  const t = String(type || '').toLowerCase()
  return FIELD_TYPES.find((x) => x.value === t)?.label || '—'
}

function isSelectType(type) {
  const t = String(type || '').toLowerCase()
  return t === 'select' || t === 'multiselect'
}

function ModalBase({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div className="pcCfgModalOverlay" onMouseDown={onClose}>
      <div className="pcCfgModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pcCfgModalHeader">
          <h3>{title}</h3>
          <button type="button" className="pcCfgIconBtn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="pcCfgModalBody">{children}</div>
      </div>
    </div>
  )
}

export default function Campos() {
  const clientId = 1

  const [fields, setFieldsState] = useState(() => getFields(clientId))

  useEffect(() => {
    setFields(clientId, fields)
  }, [clientId, fields])

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const qq = lowerKey(q)
    if (!qq) return fields
    return fields.filter((f) => lowerKey(f.name).includes(qq))
  }, [fields, q])

  const [openNew, setOpenNew] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('text')
  const [formRequired, setFormRequired] = useState(false)
  const [formOptions, setFormOptions] = useState('')

  const [err, setErr] = useState('')

  function resetForm() {
    setFormName('')
    setFormType('text')
    setFormRequired(false)
    setFormOptions('')
    setErr('')
  }

  function openNewModal() {
    resetForm()
    setOpenNew(true)
  }

  function closeNewModal() {
    setOpenNew(false)
  }

  function toggleActive(id) {
    setFieldsState((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
      const cur = prev.find((x) => x.id === id)
      logEvent(clientId, {
        module: 'Configurações',
        action: 'Alterou campo',
        description: `Campo "${cur?.name || id}" alterado (ativo/inativo).`
      })
      return next
    })
  }

  function toggleRequired(id) {
    setFieldsState((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
      const cur = prev.find((x) => x.id === id)
      logEvent(clientId, {
        module: 'Configurações',
        action: 'Alterou campo',
        description: `Campo "${cur?.name || id}" alterado (obrigatório).`
      })
      return next
    })
  }

  function removeField(id) {
    setFieldsState((prev) => {
      const cur = prev.find((x) => x.id === id)
      const next = prev.filter((f) => f.id !== id)
      logEvent(clientId, {
        module: 'Configurações',
        action: 'Removeu campo',
        description: `Campo "${cur?.name || id}" removido.`
      })
      return next
    })
  }

  function onCreate() {
    const name = normalizeName(formName)
    if (!name) {
      setErr('Informe o nome do campo.')
      return
    }

    const exists = fields.some((f) => lowerKey(f.name) === lowerKey(name))
    if (exists) {
      setErr('Já existe um campo com esse nome.')
      return
    }

    const type = String(formType || 'text').toLowerCase()

    let options = []
    if (isSelectType(type)) {
      options = String(formOptions || '')
        .split('\n')
        .map((x) => normalizeName(x))
        .filter(Boolean)

      const uniq = new Set(options.map(lowerKey))
      if (options.length === 0) {
        setErr('Informe pelo menos 1 opção (uma por linha).')
        return
      }
      if (uniq.size !== options.length) {
        setErr('As opções não podem se repetir.')
        return
      }
    }

    const nextId = (Math.max(0, ...fields.map((f) => Number(f.id) || 0)) || 0) + 1

    setFieldsState((prev) => [
      ...prev,
      {
        id: nextId,
        name,
        type,
        required: !!formRequired,
        active: true,
        options
      }
    ])

    logEvent(clientId, {
      module: 'Configurações',
      action: 'Criou campo',
      description: `Campo "${name}" criado (${typeLabel(type)}).`
    })

    closeNewModal()
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Campos</h2>
        <p>Crie e gerencie campos personalizados que aparecerão no CRM.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcCfgCardHeaderRow">
            <div>
              <h3>Campos do CRM</h3>
              <div className="pcCfgSub">
                Total: <b>{fields.length}</b>
              </div>
            </div>

            <div className="pcCfgHeaderActions">
              <input
                className="pcCfgSearch"
                placeholder="Buscar campo..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="button" className="pcCfgBtnPrimary" onClick={openNewModal}>
                Novo campo
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {filtered.length === 0 ? (
              <div className="pcCfgEmpty">Nenhum campo encontrado.</div>
            ) : (
              <div className="pcCfgTable">
                <div className="pcCfgRow pcCfgRowHead">
                  <div>Nome</div>
                  <div>Tipo</div>
                  <div>Obrigatório</div>
                  <div>Status</div>
                  <div className="pcCfgRight">Ações</div>
                </div>

                {filtered.map((f) => (
                  <div key={f.id} className="pcCfgRow">
                    <div className="pcCfgName">
                      <div className="pcCfgNameTop">{f.name}</div>
                      {isSelectType(f.type) && (
                        <div className="pcCfgMeta">{f.options?.length || 0} opções</div>
                      )}
                    </div>

                    <div className="pcCfgType">{typeLabel(f.type)}</div>

                    <div>
                      <button
                        type="button"
                        className={`pcCfgPillBtn${f.required ? ' on' : ''}`}
                        onClick={() => toggleRequired(f.id)}
                        title="Alternar obrigatório"
                      >
                        {f.required ? 'Sim' : 'Não'}
                      </button>
                    </div>

                    <div>
                      <button
                        type="button"
                        className={`pcCfgPillBtn${f.active ? ' on' : ''}`}
                        onClick={() => toggleActive(f.id)}
                        title="Alternar ativo"
                      >
                        {f.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="pcCfgRight">
                      <button type="button" className="pcCfgBtnGhost" onClick={() => removeField(f.id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pcCfgNote">
              ✅ Já integrado: os campos salvos aqui agora ficam disponíveis para o CRM renderizar dinamicamente.
            </div>
          </div>
        </div>
      </div>

      <ModalBase open={openNew} title="Novo campo do CRM" onClose={closeNewModal}>
        <div className="pcCfgForm">
          <label className="pcCfgLabel">
            Nome do campo
            <input
              className="pcCfgInput"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Período, Data da chegada..."
              autoFocus
            />
          </label>

          <div className="pcCfgGrid2">
            <label className="pcCfgLabel">
              Tipo
              <select
                className="pcCfgInput"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="pcCfgCheck">
              <input
                type="checkbox"
                checked={formRequired}
                onChange={(e) => setFormRequired(e.target.checked)}
              />
              Obrigatório
            </label>
          </div>

          {isSelectType(formType) && (
            <label className="pcCfgLabel">
              Opções (uma por linha)
              <textarea
                className="pcCfgTextarea"
                value={formOptions}
                onChange={(e) => setFormOptions(e.target.value)}
                placeholder={'Ex:\nManhã\nTarde\nNoite'}
              />
            </label>
          )}

          {err && <div className="pcCfgError">{err}</div>}

          <div className="pcCfgFormActions">
            <button type="button" className="pcCfgBtnGhost" onClick={closeNewModal}>
              Cancelar
            </button>
            <button type="button" className="pcCfgBtnPrimary" onClick={onCreate}>
              Criar campo
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/campos/Campos.jsx