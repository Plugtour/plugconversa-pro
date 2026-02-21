// caminho: front/src/pages/app/configuracoes/etiquetas/Etiquetas.jsx
import { useMemo, useState } from 'react'
import './etiquetas.css'

function normalizeName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ')
}

function lowerKey(v) {
  return normalizeName(v).toLowerCase()
}

function clampHexColor(v) {
  const s = String(v || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase()
  return '#2563EB'
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

export default function Etiquetas() {
  const [tags, setTags] = useState(() => [
    { id: 1, name: 'Lead Frio', color: '#64748B', active: true },
    { id: 2, name: 'Lead Morno', color: '#F59E0B', active: true },
    { id: 3, name: 'Lead Quente', color: '#EF4444', active: true },
    { id: 4, name: 'Comprou no site', color: '#10B981', active: true }
  ])

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const qq = lowerKey(q)
    if (!qq) return tags
    return tags.filter((t) => lowerKey(t.name).includes(qq))
  }, [tags, q])

  const [openNew, setOpenNew] = useState(false)
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#2563EB')
  const [err, setErr] = useState('')

  function resetForm() {
    setFormName('')
    setFormColor('#2563EB')
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
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t)))
  }

  function removeTag(id) {
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  function onCreate() {
    const name = normalizeName(formName)
    const color = clampHexColor(formColor)

    if (!name) {
      setErr('Informe o nome da etiqueta.')
      return
    }

    const exists = tags.some((t) => lowerKey(t.name) === lowerKey(name))
    if (exists) {
      setErr('Já existe uma etiqueta com esse nome.')
      return
    }

    const nextId = (Math.max(0, ...tags.map((t) => Number(t.id) || 0)) || 0) + 1

    setTags((prev) => [
      ...prev,
      { id: nextId, name, color, active: true }
    ])

    closeNewModal()
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Etiquetas</h2>
        <p>Crie etiquetas com cor para usar em contatos e negócios no CRM.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcCfgCardHeaderRow">
            <div>
              <h3>Etiquetas do CRM</h3>
              <div className="pcCfgSub">
                Total: <b>{tags.length}</b>
              </div>
            </div>

            <div className="pcCfgHeaderActions">
              <input
                className="pcCfgSearch"
                placeholder="Buscar etiqueta..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="button" className="pcCfgBtnPrimary" onClick={openNewModal}>
                Nova etiqueta
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {filtered.length === 0 ? (
              <div className="pcCfgEmpty">Nenhuma etiqueta encontrada.</div>
            ) : (
              <div className="pcCfgTagGrid">
                {filtered.map((t) => (
                  <div key={t.id} className="pcCfgTagCard">
                    <div className="pcCfgTagLeft">
                      <span className="pcCfgDot" style={{ background: t.color }} />
                      <div className="pcCfgTagText">
                        <div className="pcCfgTagName">{t.name}</div>
                        <div className="pcCfgTagMeta">
                          <span className={`pcCfgStatus${t.active ? ' on' : ''}`}>
                            {t.active ? 'Ativa' : 'Inativa'}
                          </span>
                          <span className="pcCfgHex">{t.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pcCfgTagActions">
                      <button
                        type="button"
                        className={`pcCfgPillBtn${t.active ? ' on' : ''}`}
                        onClick={() => toggleActive(t.id)}
                        title="Alternar ativo"
                      >
                        {t.active ? 'Ativa' : 'Inativa'}
                      </button>
                      <button
                        type="button"
                        className="pcCfgBtnGhost"
                        onClick={() => removeTag(t.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pcCfgNote">
              Próximo passo: quando você me mandar os arquivos do CRM (CRM.jsx e components),
              eu adiciono UI para selecionar múltiplas etiquetas por contato e por negócio, e conecto na API.
            </div>
          </div>
        </div>
      </div>

      <ModalBase open={openNew} title="Nova etiqueta" onClose={closeNewModal}>
        <div className="pcCfgForm">
          <label className="pcCfgLabel">
            Nome da etiqueta
            <input
              className="pcCfgInput"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Cliente Marcelo, Comprou no site..."
              autoFocus
            />
          </label>

          <div className="pcCfgGrid2 pcCfgGrid2Tag">
            <label className="pcCfgLabel">
              Cor
              <div className="pcCfgColorRow">
                <input
                  type="color"
                  className="pcCfgColor"
                  value={clampHexColor(formColor)}
                  onChange={(e) => setFormColor(e.target.value)}
                  aria-label="Selecionar cor"
                />
                <input
                  className="pcCfgInput pcCfgHexInput"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#2563EB"
                />
              </div>
            </label>

            <div className="pcCfgPreview">
              <div className="pcCfgPreviewLabel">Prévia</div>
              <div className="pcCfgPreviewTag">
                <span className="pcCfgDot" style={{ background: clampHexColor(formColor) }} />
                <span className="pcCfgPreviewText">{normalizeName(formName) || 'Etiqueta'}</span>
              </div>
            </div>
          </div>

          {err && <div className="pcCfgError">{err}</div>}

          <div className="pcCfgFormActions">
            <button type="button" className="pcCfgBtnGhost" onClick={closeNewModal}>
              Cancelar
            </button>
            <button type="button" className="pcCfgBtnPrimary" onClick={onCreate}>
              Criar etiqueta
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/etiquetas/Etiquetas.jsx