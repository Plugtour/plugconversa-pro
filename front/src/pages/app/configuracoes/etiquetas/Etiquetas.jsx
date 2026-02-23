// caminho: front/src/pages/app/configuracoes/etiquetas/Etiquetas.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import './etiquetas.css'
import { apiDel, apiGet, apiPost, apiPut } from '../../../../services/api'

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

function pickArrayFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (payload.ok && Array.isArray(payload.data)) return payload.data
  if (payload.ok && Array.isArray(payload.items)) return payload.items
  if (payload.ok && Array.isArray(payload.tags)) return payload.tags
  if (Array.isArray(payload.data)) return payload.data
  return []
}

function pickOneFromPayload(payload) {
  if (!payload) return null
  if (payload.ok && payload.data && typeof payload.data === 'object') return payload.data
  if (payload.ok && payload.tag && typeof payload.tag === 'object') return payload.tag
  if (payload.data && typeof payload.data === 'object') return payload.data
  if (typeof payload === 'object') return payload
  return null
}

function getErrText(err) {
  const status = err?.status
  const payload = err?.payload
  const msg =
    (payload && typeof payload === 'object' && (payload.message || payload.error)) || err?.message || 'erro'
  return status ? `${msg} (HTTP ${status})` : msg
}

function normalizeTag(raw) {
  const t = raw && typeof raw === 'object' ? raw : {}
  const id = Number(t?.id ?? t?.tag_id ?? t?.tagId)
  return {
    id: Number.isFinite(id) ? id : 0,
    name: normalizeName(t?.name || ''),
    color: clampHexColor(t?.color || '#2563EB'),
    active: t?.active === undefined ? true : !!t.active,
    ai_profile: t?.ai_profile ?? t?.aiProfile ?? null
  }
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
  const clientId = 1

  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')

  const [tags, setTagsState] = useState([])

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
  const [saving, setSaving] = useState(false)

  // trava re-render na carga
  const didLoadRef = useRef(false)

  async function fetchTags() {
    setLoading(true)
    setLoadErr('')
    try {
      const payload = await apiGet('/tags', { clientId })
      const arr = pickArrayFromPayload(payload).map(normalizeTag).filter((t) => t.id > 0)
      // ordena por nome pra ficar previsível
      arr.sort((a, b) => String(a.name).localeCompare(String(b.name)))
      setTagsState(arr)
    } catch (e) {
      setLoadErr(getErrText(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    fetchTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (saving) return
    setOpenNew(false)
  }

  async function toggleActive(t) {
    const id = Number(t?.id)
    if (!Number.isFinite(id) || id <= 0) return

    const nextActive = !t.active

    // otimista
    setTagsState((prev) => prev.map((x) => (x.id === id ? { ...x, active: nextActive } : x)))

    try {
      // preferimos PUT por ser o helper disponível e comum no seu backend
      const payload = await apiPut(`/tags/${id}`, { active: nextActive }, { clientId })
      const updated = pickOneFromPayload(payload)
      if (updated && typeof updated === 'object') {
        const norm = normalizeTag(updated)
        if (norm.id > 0) {
          setTagsState((prev) => prev.map((x) => (x.id === id ? { ...x, ...norm } : x)))
        } else {
          // se não veio tag, recarrega
          await fetchTags()
        }
      }
    } catch (e) {
      // rollback
      setTagsState((prev) => prev.map((x) => (x.id === id ? { ...x, active: !nextActive } : x)))
      alert(`Erro ao alterar etiqueta: ${getErrText(e)}`)
    }
  }

  async function removeTag(t) {
    const id = Number(t?.id)
    if (!Number.isFinite(id) || id <= 0) return

    const ok = window.confirm(`Remover a etiqueta "${t?.name || id}"?`)
    if (!ok) return

    // otimista
    const snapshot = tags
    setTagsState((prev) => prev.filter((x) => x.id !== id))

    try {
      await apiDel(`/tags/${id}`, { clientId })
    } catch (e) {
      // rollback
      setTagsState(snapshot)
      alert(`Erro ao remover etiqueta: ${getErrText(e)}`)
    }
  }

  async function onCreate() {
    const name = normalizeName(formName)
    const color = clampHexColor(formColor)

    setErr('')

    if (!name) {
      setErr('Informe o nome da etiqueta.')
      return
    }

    const exists = tags.some((t) => lowerKey(t.name) === lowerKey(name))
    if (exists) {
      setErr('Já existe uma etiqueta com esse nome.')
      return
    }

    setSaving(true)
    try {
      const payload = await apiPost(
        '/tags',
        {
          name,
          color,
          active: true
        },
        { clientId }
      )

      const created = pickOneFromPayload(payload)
      if (created && typeof created === 'object') {
        const norm = normalizeTag(created)
        if (norm.id > 0) {
          setTagsState((prev) => {
            const next = [...prev, norm]
            next.sort((a, b) => String(a.name).localeCompare(String(b.name)))
            return next
          })
        } else {
          await fetchTags()
        }
      } else {
        await fetchTags()
      }

      closeNewModal()
    } catch (e) {
      setErr(getErrText(e))
    } finally {
      setSaving(false)
    }
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
                disabled={loading}
              />
              <button type="button" className="pcCfgBtnPrimary" onClick={openNewModal} disabled={loading}>
                Nova etiqueta
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {loading ? (
              <div className="pcCfgEmpty">Carregando etiquetas...</div>
            ) : loadErr ? (
              <div className="pcCfgEmpty" style={{ borderStyle: 'solid', borderColor: 'rgba(239,68,68,.35)' }}>
                Erro ao carregar: <b>{loadErr}</b>
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="pcCfgBtnGhost" onClick={fetchTags}>
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
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
                          <span className={`pcCfgStatus${t.active ? ' on' : ''}`}>{t.active ? 'Ativa' : 'Inativa'}</span>
                          <span className="pcCfgHex">{t.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pcCfgTagActions">
                      <button
                        type="button"
                        className={`pcCfgPillBtn${t.active ? ' on' : ''}`}
                        onClick={() => toggleActive(t)}
                        title="Alternar ativo"
                      >
                        {t.active ? 'Ativa' : 'Inativa'}
                      </button>
                      <button type="button" className="pcCfgBtnGhost" onClick={() => removeTag(t)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pcCfgNote">
              ✅ Agora as etiquetas são salvas no banco via <b>/api/tags</b> e ficam disponíveis no filtro de Contatos.
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
              placeholder="Ex: Cliente, Comprou no site..."
              autoFocus
              disabled={saving}
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
                  disabled={saving}
                />
                <input
                  className="pcCfgInput pcCfgHexInput"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#2563EB"
                  disabled={saving}
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
            <button type="button" className="pcCfgBtnGhost" onClick={closeNewModal} disabled={saving}>
              Cancelar
            </button>
            <button type="button" className="pcCfgBtnPrimary" onClick={onCreate} disabled={saving}>
              {saving ? 'Criando...' : 'Criar etiqueta'}
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/etiquetas/Etiquetas.jsx