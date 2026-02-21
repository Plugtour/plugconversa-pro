// caminho: front/src/pages/app/configuracoes/campos/Campos.jsx
import { useMemo, useState } from 'react'
import './campos.css'

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
  const [fields, setFields] = useState(() => [
    { id: 1, name: 'Nome', type: 'text', required: true, active: true, options: [] },
    { id: 2, name: 'Telefone', type: 'phone', required: false, active: true, options: [] },
    { id: 3, name: 'Data da chegada', type: 'date', required: false, active: true, options: [] },
    { id: 4, name: 'Data da saída', type: 'date', required: false, active: true, options: [] }
  ])

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
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    )
  }

  function toggleRequired(id) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    )
  }

  function removeField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id))
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

    setFields((prev) => [
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
              <div className="pcCfgEmpty">
                Nenhum campo encontrado.
              </div>
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
                        <div className="pcCfgMeta">
                          {f.options?.length || 0} opções
                        </div>
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
                      <button
                        type="button"
                        className="pcCfgBtnGhost"
                        onClick={() => removeField(f.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pcCfgNote">
              Próximo passo: quando você me mandar os arquivos do CRM (CRM.jsx e components), eu faço os
              campos criados aqui aparecerem no CRM (card e/ou painel de detalhes), e conecto na API.
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