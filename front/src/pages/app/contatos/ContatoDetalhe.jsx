// caminho: front/src/pages/app/contatos/ContatoDetalhe.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../../../services/api'
import './contatos.css'

function safeArr(v) {
  return Array.isArray(v) ? v : []
}

function pickOneFromPayload(payload) {
  if (!payload) return null
  if (payload.ok && payload.data && typeof payload.data === 'object') return payload.data
  if (payload.ok && payload.contact && typeof payload.contact === 'object') return payload.contact
  if (payload.data && typeof payload.data === 'object') return payload.data
  if (typeof payload === 'object') return payload
  return null
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

function formatDateBR(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

function getInitials(name) {
  const n = String(name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/g).filter(Boolean)
  const a = parts[0]?.[0] || '?'
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (a + b).toUpperCase()
}

function normalizeContact(raw) {
  const c = raw && typeof raw === 'object' ? raw : {}
  const id = c.id ?? c.contact_id ?? c.contactId ?? c._id ?? null
  const name = c.name ?? c.nome ?? c.full_name ?? c.fullName ?? c.display_name ?? c.displayName ?? ''
  const phone = c.phone ?? c.telefone ?? c.number ?? c.msisdn ?? c.wa_number ?? c.whatsapp ?? ''
  const createdAt = c.created_at ?? c.createdAt ?? c.created ?? c.created_on ?? null

  const avatar =
    c.photo_url ??
    c.photoUrl ??
    c.avatar_url ??
    c.avatarUrl ??
    c.picture ??
    c.profile_pic ??
    c.profilePic ??
    null

  const tagsObj = safeArr(c.tags).filter((t) => t && typeof t === 'object' && (t.id || t.name))
  const tagIdsFromTagsObj = tagsObj.map((t) => Number(t.id)).filter((n) => Number.isFinite(n) && n > 0)

  const tagIds =
    safeArr(c.tag_ids)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0) || []

  const tagsNumericArray =
    safeArr(c.tags)
      .map((x) => (typeof x === 'number' || /^\d+$/.test(String(x)) ? Number(x) : null))
      .filter((n) => Number.isFinite(n) && n > 0) || []

  const contactTagsIds =
    safeArr(c.contact_tags)
      .map((x) => Number(x?.tag_id ?? x?.tagId))
      .filter((n) => Number.isFinite(n) && n > 0) || []

  const mergedTagIds = Array.from(
    new Set([...tagIdsFromTagsObj, ...tagIds, ...tagsNumericArray, ...contactTagsIds].filter(Boolean))
  )

  return {
    raw: c,
    id,
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    createdAt,
    avatar,
    tagsObj,
    tagIds: mergedTagIds
  }
}

export default function ContatoDetalhe() {
  const navigate = useNavigate()
  const { id } = useParams()
  const clientId = 1

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [contact, setContact] = useState(null)
  const [tags, setTags] = useState([])

  useEffect(() => {
    let alive = true

    async function load() {
      setLoading(true)
      setErr('')

      try {
        const [contactPayload, tagsPayload] = await Promise.all([
          apiGet(`/contacts/${id}`, { clientId }),
          apiGet('/tags', { clientId })
        ])

        if (!alive) return

        const c = normalizeContact(pickOneFromPayload(contactPayload))
        const t = pickArrayFromPayload(tagsPayload).map((x) => ({
          id: Number(x?.id),
          name: String(x?.name || '').trim(),
          color: String(x?.color || '#64748B').trim(),
          active: x?.active === undefined ? true : !!x.active
        }))

        setContact(c)
        setTags(t)
      } catch (e) {
        if (!alive) return
        const msg =
          (e?.payload && typeof e.payload === 'object' && (e.payload.message || e.payload.error)) ||
          e?.message ||
          'erro'
        setErr(String(msg))
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    if (id) load()
    else {
      setLoading(false)
      setErr('Contato inválido.')
    }

    return () => {
      alive = false
    }
  }, [id])

  const tagsById = useMemo(() => {
    const m = new Map()
    for (const t of tags) {
      if (Number.isFinite(t?.id) && t.id > 0) m.set(t.id, t)
    }
    return m
  }, [tags])

  const resolvedTags = useMemo(() => {
    if (!contact) return []
    const out = []

    for (const t of contact.tagsObj) {
      const tid = Number(t?.id)
      out.push({
        id: Number.isFinite(tid) && tid > 0 ? tid : `obj:${t?.name || Math.random()}`,
        name: String(t?.name || '').trim() || 'Etiqueta',
        color: String(t?.color || '#64748B').trim()
      })
    }

    for (const tid of contact.tagIds) {
      const t = tagsById.get(tid)
      if (!t) continue
      if (out.some((x) => Number(x.id) === Number(tid))) continue
      out.push({ id: t.id, name: t.name, color: t.color })
    }

    return out
  }, [contact, tagsById])

  return (
    <div className="pcPageCard">
      <div className="pcPageHeader" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="pcPageTitle">Contato</h1>
          <p className="pcPageSubtitle">Relatório completo do contato</p>
        </div>

        <button
          type="button"
          className="pcCfgBtnGhost"
          onClick={() => navigate('/contatos')}
          title="Voltar"
        >
          Voltar
        </button>
      </div>

      <div className="pcPageBody">
        {loading ? (
          <div className="pcTablePlaceholder">Carregando contato...</div>
        ) : err ? (
          <div className="pcTablePlaceholder" style={{ borderStyle: 'solid', borderColor: 'rgba(239,68,68,.35)' }}>
            Erro ao carregar: <b>{err}</b>
          </div>
        ) : !contact ? (
          <div className="pcTablePlaceholder">Contato não encontrado.</div>
        ) : (
          <>
            {/* Cabeçalho do contato */}
            <div
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                padding: 14,
                background: '#fff',
                border: '1px solid var(--pc-border)',
                borderRadius: 'var(--pc-radius-md)',
                marginBottom: 12
              }}
            >
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.name || 'Contato'}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 999,
                    objectFit: 'cover',
                    border: '1px solid rgba(0,0,0,.12)'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 999,
                    background: '#111',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 900
                  }}
                >
                  {getInitials(contact.name)}
                </div>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contact.name || 'Sem nome'}
                </div>
                <div style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#555' }}>
                  <span>
                    Telefone: <b style={{ color: '#222' }}>{contact.phone || '-'}</b>
                  </span>
                  <span>
                    Criado em: <b style={{ color: '#222' }}>{formatDateBR(contact.createdAt) || '-'}</b>
                  </span>
                  <span>
                    ID: <b style={{ color: '#222' }}>{contact.id ?? '-'}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Blocos do relatório */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12, alignItems: 'start' }}>
              {/* Coluna esquerda */}
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--pc-border)',
                    borderRadius: 'var(--pc-radius-md)',
                    padding: 14
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#222', marginBottom: 10 }}>Tickets / Conversas</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Estrutura pronta para listar tickets assim que existir o endpoint (ex: <b>/api/tickets?contact_id=</b>).
                  </div>

                  <div style={{ marginTop: 10, border: '1px dashed rgba(0,0,0,0.18)', borderRadius: 10, padding: 12, background: 'rgba(0,0,0,0.02)', color: '#666', fontSize: 13 }}>
                    Nenhum ticket carregado.
                  </div>
                </div>

                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--pc-border)',
                    borderRadius: 'var(--pc-radius-md)',
                    padding: 14
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#222', marginBottom: 10 }}>Etapa no CRM</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Quando o CRM tiver vínculo com contato (ex: card com <b>contactId</b>), vamos mostrar aqui a coluna atual e o histórico de mudanças.
                  </div>

                  <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid rgba(0,0,0,.12)',
                        borderRadius: 999,
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,.02)',
                        fontSize: 12,
                        fontWeight: 900,
                        color: '#333'
                      }}
                    >
                      Etapa: <span style={{ color: '#666' }}>—</span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid rgba(0,0,0,.12)',
                        borderRadius: 999,
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,.02)',
                        fontSize: 12,
                        fontWeight: 900,
                        color: '#333'
                      }}
                    >
                      Status: <span style={{ color: '#666' }}>—</span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        border: '1px solid rgba(0,0,0,.12)',
                        borderRadius: 999,
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,.02)',
                        fontSize: 12,
                        fontWeight: 900,
                        color: '#333'
                      }}
                    >
                      Agente: <span style={{ color: '#666' }}>—</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Coluna direita */}
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--pc-border)',
                    borderRadius: 'var(--pc-radius-md)',
                    padding: 14
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#222', marginBottom: 10 }}>Etiquetas</div>

                  {resolvedTags.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#666' }}>Sem etiqueta.</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {resolvedTags.map((t) => (
                        <span
                          key={String(t.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            border: '1px solid rgba(0,0,0,.12)',
                            borderRadius: 999,
                            padding: '6px 10px',
                            background: 'rgba(0,0,0,.02)',
                            fontSize: 12,
                            fontWeight: 900,
                            color: '#333'
                          }}
                          title={t.name}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color || '#64748B' }} />
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--pc-border)',
                    borderRadius: 'var(--pc-radius-md)',
                    padding: 14
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#222', marginBottom: 10 }}>Dados adicionais</div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    Espaço preparado para campos extras (ex: email, origem, empresa, observações) conforme a API de contatos evoluir.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
// fim: front/src/pages/app/contatos/ContatoDetalhe.jsx