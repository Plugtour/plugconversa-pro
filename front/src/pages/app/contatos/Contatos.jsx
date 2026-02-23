// caminho: front/src/pages/app/contatos/Contatos.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiDel, apiGet, apiPost } from '../../../services/api'
import './contatos.css'

function lower(v) {
  return String(v || '').trim().toLowerCase()
}

function safeArr(v) {
  return Array.isArray(v) ? v : []
}

function pickArrayFromPayload(payload) {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (payload.ok && Array.isArray(payload.data)) return payload.data
  if (payload.ok && Array.isArray(payload.items)) return payload.items
  if (payload.ok && Array.isArray(payload.contacts)) return payload.contacts
  if (payload.ok && Array.isArray(payload.tags)) return payload.tags
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.tags)) return payload.tags
  return []
}

function pickOneFromPayload(payload) {
  if (!payload) return null
  if (payload.ok && payload.data && typeof payload.data === 'object') return payload.data
  if (payload.ok && payload.contact && typeof payload.contact === 'object') return payload.contact
  if (payload.data && typeof payload.data === 'object') return payload.data
  if (typeof payload === 'object') return payload
  return null
}

function formatDateBR(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

function formatPhone(v) {
  const s = String(v || '').trim()
  return s || '-'
}

function getInitials(name) {
  const n = String(name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/g).filter(Boolean)
  const a = parts[0]?.[0] || '?'
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ''
  return (a + b).toUpperCase()
}

function normalizeName(v) {
  return String(v || '').trim().replace(/\s+/g, ' ')
}

function normalizePhone(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.replace(/[^\d+]/g, '')
}

function clampUrl(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s
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
      .filter((n) => Number.isFinite(n) && n > 0) ||
    safeArr(c.tagIds)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0) ||
    []

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

function ModalBase({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        zIndex: 9999
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: 640,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
          overflow: 'hidden'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid rgba(0,0,0,0.08)'
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#222' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              appearance: 'none',
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              color: '#333',
              borderRadius: 10,
              padding: '6px 10px',
              cursor: 'pointer',
              fontWeight: 900
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  )
}

export default function Contatos() {
  const navigate = useNavigate()
  const clientId = 1

  const STORAGE_SELECTED_KEY = `pc_contacts_selected_v1:${clientId}`
  const STORAGE_ANCHOR_KEY = `pc_contacts_anchor_v1:${clientId}`

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [contacts, setContacts] = useState([])
  const [tags, setTags] = useState([])

  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_SELECTED_KEY)
      const arr = raw ? JSON.parse(raw) : []
      const ids = Array.isArray(arr) ? arr : []
      return new Set(
        ids
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n) && n > 0)
      )
    } catch {
      return new Set()
    }
  })

  const [anchorId, setAnchorId] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_ANCHOR_KEY)
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : 0
    } catch {
      return 0
    }
  })

  // ✅ hack anti-autofill do Chrome
  const [lockName, setLockName] = useState(true)
  const [lockPhone, setLockPhone] = useState(true)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_SELECTED_KEY, JSON.stringify(Array.from(selectedIds)))
    } catch {
      // ignore
    }
  }, [selectedIds, STORAGE_SELECTED_KEY])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_ANCHOR_KEY, String(anchorId || 0))
    } catch {
      // ignore
    }
  }, [anchorId, STORAGE_ANCHOR_KEY])

  async function fetchAll() {
    setLoading(true)
    setErr('')

    try {
      const [contactsPayload, tagsPayload] = await Promise.all([apiGet('/contacts', { clientId }), apiGet('/tags', { clientId })])

      const contactsArr = pickArrayFromPayload(contactsPayload).map(normalizeContact)
      const tagsArr = pickArrayFromPayload(tagsPayload).map((t) => ({
        id: Number(t?.id),
        name: String(t?.name || '').trim(),
        color: String(t?.color || '#64748B').trim(),
        active: t?.active === undefined ? true : !!t.active
      }))

      setContacts(contactsArr)
      setTags(tagsArr)

      setSelectedIds((prev) => {
        const next = new Set()
        const idsSet = new Set(contactsArr.map((c) => Number(c?.id)).filter((n) => Number.isFinite(n) && n > 0))
        for (const id of prev || []) {
          const n = Number(id)
          if (idsSet.has(n)) next.add(n)
        }
        return next
      })

      setAnchorId((prev) => {
        const idsSet = new Set(contactsArr.map((c) => Number(c?.id)).filter((n) => Number.isFinite(n) && n > 0))
        return prev && idsSet.has(prev) ? prev : 0
      })
    } catch (e) {
      const msg =
        (e?.payload && typeof e.payload === 'object' && (e.payload.message || e.payload.error)) || e?.message || 'erro'
      setErr(String(msg))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    async function load() {
      if (!alive) return
      await fetchAll()
    }
    load()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tagsById = useMemo(() => {
    const m = new Map()
    for (const t of tags) {
      if (Number.isFinite(t?.id) && t.id > 0) m.set(t.id, t)
    }
    return m
  }, [tags])

  const filtered = useMemo(() => {
    const qq = lower(q)
    const tf = Number(tagFilter) || 0

    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null

    return contacts.filter((c) => {
      if (qq) {
        const hay = `${lower(c.name)} ${lower(c.phone)}`
        if (!hay.includes(qq)) return false
      }

      if (tf) {
        const hasId = c.tagIds.includes(tf)
        const hasObj = c.tagsObj.some((t) => Number(t?.id) === tf)
        if (!hasId && !hasObj) return false
      }

      if (fromTs || toTs) {
        const t = c.createdAt ? new Date(c.createdAt).getTime() : NaN
        if (!Number.isFinite(t)) return false
        if (fromTs && t < fromTs) return false
        if (toTs && t > toTs) return false
      }

      return true
    })
  }, [contacts, q, tagFilter, dateFrom, dateTo])

  const filteredIds = useMemo(
    () => filtered.map((c) => Number(c?.id)).filter((n) => Number.isFinite(n) && n > 0),
    [filtered]
  )

  const idToIndex = useMemo(() => {
    const m = new Map()
    filteredIds.forEach((id, idx) => m.set(id, idx))
    return m
  }, [filteredIds])

  function resolveTagsForContact(c) {
    const out = []
    for (const t of c.tagsObj) {
      const id = Number(t?.id)
      out.push({
        id: Number.isFinite(id) && id > 0 ? id : `obj:${t?.name || Math.random()}`,
        name: String(t?.name || '').trim() || 'Etiqueta',
        color: String(t?.color || '#64748B').trim()
      })
    }
    for (const id of c.tagIds) {
      const t = tagsById.get(id)
      if (!t) continue
      if (out.some((x) => Number(x.id) === Number(id))) continue
      out.push({ id: t.id, name: t.name, color: t.color })
    }
    return out
  }

  function onOpenContact(c) {
    const id = c?.id
    if (id === null || id === undefined || id === '') return
    navigate(`/contatos/${id}`)
  }

  const [openNew, setOpenNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPhotoUrl, setFormPhotoUrl] = useState('')
  const [formTagIds, setFormTagIds] = useState([])

  function openNewModal() {
    setFormErr('')
    setFormName('')
    setFormPhone('')
    setFormPhotoUrl('')
    setFormTagIds([])
    setLockName(true)
    setLockPhone(true)
    setOpenNew(true)
  }

  function closeNewModal() {
    if (saving) return
    setOpenNew(false)
  }

  function toggleFormTag(id) {
    const tid = Number(id)
    if (!Number.isFinite(tid) || tid <= 0) return
    setFormTagIds((prev) => {
      const cur = Array.isArray(prev) ? prev : []
      return cur.includes(tid) ? cur.filter((x) => x !== tid) : [...cur, tid]
    })
  }

  async function createContact() {
    const name = normalizeName(formName)
    const phone = normalizePhone(formPhone)
    const photo_url = clampUrl(formPhotoUrl)
    const tag_ids = safeArr(formTagIds)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)

    setFormErr('')

    if (!name) {
      setFormErr('Informe o nome do contato.')
      return
    }

    if (!phone) {
      setFormErr('Informe o telefone (WhatsApp).')
      return
    }

    const phoneExists = contacts.some((c) => normalizePhone(c.phone) && normalizePhone(c.phone) === phone)
    if (phoneExists) {
      setFormErr('Já existe um contato com esse telefone.')
      return
    }

    setSaving(true)
    try {
      const payload = await apiPost(
        '/contacts',
        {
          name,
          phone,
          ...(photo_url ? { photo_url } : {}),
          ...(tag_ids.length ? { tag_ids } : {})
        },
        { clientId }
      )

      const created = pickOneFromPayload(payload)
      if (created && typeof created === 'object') {
        const norm = normalizeContact(created)
        setContacts((prev) => [norm, ...(Array.isArray(prev) ? prev : [])])
      } else {
        await fetchAll()
      }

      setOpenNew(false)
    } catch (e) {
      const msg =
        (e?.payload && typeof e.payload === 'object' && (e.payload.message || e.payload.error)) || e?.message || 'erro'
      setFormErr(String(msg))
    } finally {
      setSaving(false)
    }
  }

  async function deleteOne(contactId) {
    const id = Number(contactId)
    if (!Number.isFinite(id) || id <= 0) return

    const ok = window.confirm('Tem certeza que deseja excluir este contato?')
    if (!ok) return

    try {
      await apiDel(`/contacts/${id}`, { clientId })
      setContacts((prev) => (Array.isArray(prev) ? prev.filter((c) => Number(c?.id) !== id) : []))
      setSelectedIds((prev) => {
        const next = new Set(prev || [])
        next.delete(id)
        return next
      })
    } catch (e) {
      const msg =
        (e?.payload && typeof e.payload === 'object' && (e.payload.message || e.payload.error)) || e?.message || 'erro'
      alert(`Erro ao excluir: ${String(msg)}`)
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds || [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)

    if (ids.length === 0) return

    const ok = window.confirm(`Tem certeza que deseja excluir ${ids.length} contato(s)?`)
    if (!ok) return

    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await apiDel(`/contacts/${id}`, { clientId })
      } catch (e) {
        const msg =
          (e?.payload && typeof e.payload === 'object' && (e.payload.message || e.payload.error)) || e?.message || 'erro'
        alert(`Falhou ao excluir o contato ID ${id}: ${String(msg)}`)
      }
    }

    setContacts((prev) => (Array.isArray(prev) ? prev.filter((c) => !ids.includes(Number(c?.id))) : []))
    setSelectedIds(new Set())
    setAnchorId(0)
  }

  function applyToggleSingle(id) {
    const n = Number(id)
    if (!Number.isFinite(n) || n <= 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev || [])
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
    setAnchorId(n)
  }

  function applyRange(anchor, current, desiredState, additive) {
    const a = Number(anchor)
    const c = Number(current)
    if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(c) || c <= 0) {
      applyToggleSingle(current)
      return
    }

    const ia = idToIndex.get(a)
    const ic = idToIndex.get(c)
    if (!Number.isFinite(ia) || !Number.isFinite(ic)) {
      applyToggleSingle(current)
      return
    }

    const start = Math.min(ia, ic)
    const end = Math.max(ia, ic)
    const rangeIds = filteredIds.slice(start, end + 1).filter((n) => Number.isFinite(n) && n > 0)

    setSelectedIds((prev) => {
      const base = additive ? new Set(prev || []) : new Set()
      for (const id of rangeIds) {
        if (desiredState) base.add(id)
        else base.delete(id)
      }
      return base
    })

    setAnchorId(c)
  }

  function onSelectClick(e, cid) {
    e.preventDefault()
    e.stopPropagation()

    const id = Number(cid)
    if (!Number.isFinite(id) || id <= 0) return

    const isCtrl = e.ctrlKey || e.metaKey
    const isShift = e.shiftKey

    if (isShift) {
      const desiredState = !selectedIds.has(id)
      applyRange(anchorId || id, id, desiredState, isCtrl)
      return
    }

    applyToggleSingle(id)
  }

  const allVisibleIds = useMemo(() => filteredIds, [filteredIds])

  const allVisibleSelected = useMemo(() => {
    if (allVisibleIds.length === 0) return false
    for (const id of allVisibleIds) {
      if (!selectedIds.has(id)) return false
    }
    return true
  }, [allVisibleIds, selectedIds])

  const someVisibleSelected = useMemo(() => {
    for (const id of allVisibleIds) {
      if (selectedIds.has(id)) return true
    }
    return false
  }, [allVisibleIds, selectedIds])

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev || [])
      if (allVisibleSelected) {
        for (const id of allVisibleIds) next.delete(id)
      } else {
        for (const id of allVisibleIds) next.add(id)
      }
      return next
    })

    const last = allVisibleIds[allVisibleIds.length - 1]
    setAnchorId(Number.isFinite(last) ? last : 0)
  }

  const activeTags = useMemo(() => tags.filter((t) => t?.active !== false), [tags])

  function unlockName() {
    if (!lockName) return
    setLockName(false)
    requestAnimationFrame(() => {
      try {
        const el = document.querySelector('input[name="pc_contact_name"]')
        el?.focus?.()
      } catch {
        // ignore
      }
    })
  }

  function unlockPhone() {
    if (!lockPhone) return
    setLockPhone(false)
    requestAnimationFrame(() => {
      try {
        const el = document.querySelector('input[name="pc_contact_phone"]')
        el?.focus?.()
      } catch {
        // ignore
      }
    })
  }

  return (
    <div className="pcPageCard">
      <div
        className="pcPageHeader"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <h1 className="pcPageTitle">Contatos</h1>
          <p className="pcPageSubtitle">Gerencie seus clientes e leads</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selectedIds.size > 0 && (
            <button type="button" className="pcCfgBtnGhost" onClick={deleteSelected} title="Excluir selecionados">
              Excluir selecionados ({selectedIds.size})
            </button>
          )}

          <button type="button" className="pcCfgBtnPrimary" onClick={openNewModal}>
            Novo contato
          </button>
        </div>
      </div>

      <div className="pcPageBody">
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 14
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pcCfgSearch"
            style={{ width: 320, maxWidth: '75vw' }}
          />

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="pcCfgSearch"
            style={{ width: 220 }}
            aria-label="Filtrar por etiqueta"
          >
            <option value="">Todas as etiquetas</option>
            {activeTags
              .slice()
              .sort((a, b) => String(a.name).localeCompare(String(b.name)))
              .map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="pcCfgSearch"
            style={{ width: 170 }}
            aria-label="Data inicial"
            title="Data inicial"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="pcCfgSearch"
            style={{ width: 170 }}
            aria-label="Data final"
            title="Data final"
          />

          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
            Total: <b>{filtered.length}</b>
          </div>
        </div>

        {loading ? (
          <div className="pcTablePlaceholder">Carregando contatos...</div>
        ) : err ? (
          <div className="pcTablePlaceholder" style={{ borderStyle: 'solid', borderColor: 'rgba(239,68,68,.35)' }}>
            Erro ao carregar: <b>{err}</b>
          </div>
        ) : filtered.length === 0 ? (
          <div className="pcTablePlaceholder">Nenhum contato encontrado com os filtros atuais.</div>
        ) : (
          <div
            style={{
              border: '1px solid var(--pc-border)',
              borderRadius: 'var(--pc-radius-md)',
              background: '#fff',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '42px 56px 1.2fr 0.9fr 1.4fr 140px 58px',
                gap: 0,
                padding: '10px 12px',
                borderBottom: '1px solid rgba(0,0,0,.08)',
                background: 'rgba(0,0,0,.02)',
                fontSize: 12,
                fontWeight: 800,
                color: '#444',
                alignItems: 'center'
              }}
            >
              <div className="pcCtSelectCell" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="pcCtSelectHit"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleSelectAllVisible()
                  }}
                  aria-label="Selecionar todos os contatos visíveis"
                  title="Selecionar todos"
                >
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (!el) return
                      el.indeterminate = !allVisibleSelected && someVisibleSelected
                    }}
                    readOnly
                    tabIndex={-1}
                  />
                </button>
              </div>

              {/* ✅ gap 15px antes da foto */}
              <div style={{ paddingLeft: 22 }}>Foto</div>

              <div style={{ paddingLeft: 17 }}>Nome</div>
              <div>Telefone</div>
              <div>Etiquetas</div>
              <div>Criado em</div>
              <div style={{ textAlign: 'right' }}>Ações</div>
            </div>

            {filtered.map((c) => {
              const ctTags = resolveTagsForContact(c)
              const cid = Number(c?.id)
              const checked = Number.isFinite(cid) && cid > 0 ? selectedIds.has(cid) : false

              return (
                <button
                  key={String(c.id ?? c.phone ?? Math.random())}
                  type="button"
                  onClick={() => onOpenContact(c)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '42px 56px 1.2fr 0.9fr 1.4fr 140px 58px',
                      gap: 0,
                      padding: '10px 12px',
                      borderBottom: '1px solid rgba(0,0,0,.06)',
                      alignItems: 'center'
                    }}
                  >
                    <div
                      className="pcCtSelectCell"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="pcCtSelectHit"
                        onClick={(e) => onSelectClick(e, cid)}
                        aria-label={`Selecionar contato ${c.name || c.phone || ''}`}
                        title={'Selecionar\nShift: intervalo\nCtrl: alternar\nCtrl+Shift: intervalo sem perder seleção'}
                      >
                        <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                      </button>
                    </div>

                    {/* ✅ gap 15px antes do círculo */}
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 15 }}>
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={c.name || 'Contato'}
                          style={{
                            width: 36,
                            height: 36,
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
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            background: '#111',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800
                          }}
                          aria-label="Avatar"
                        >
                          {getInitials(c.name)}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0, paddingLeft: 20 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#222',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {c.name || 'Sem nome'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        ID: <b>{c.id ?? '-'}</b>
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{formatPhone(c.phone)}</div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minWidth: 0 }}>
                      {ctTags.length === 0 ? (
                        <span style={{ fontSize: 12, color: '#777' }}>Sem etiqueta</span>
                      ) : (
                        ctTags.map((t) => (
                          <span
                            key={String(t.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              border: '1px solid rgba(0,0,0,.12)',
                              borderRadius: 999,
                              padding: '4px 8px',
                              background: 'rgba(0,0,0,.02)',
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#333',
                              maxWidth: 220
                            }}
                            title={t.name}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: t.color || '#64748B',
                                flex: '0 0 8px'
                              }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.name}
                            </span>
                          </span>
                        ))
                      )}
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>{formatDateBR(c.createdAt)}</div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteOne(cid)
                        }}
                        className="pcCfgBtnGhost"
                        style={{
                          padding: '6px 10px',
                          borderRadius: 10,
                          fontWeight: 500
                        }}
                        title="Excluir contato"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
          Clique em um contato para abrir o relatório completo (próxima etapa: tela <b>/contatos/:id</b> com tickets,
          agente, status e etapa).
        </div>
      </div>

      <ModalBase open={openNew} title="Novo contato" onClose={closeNewModal}>
        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault()
            createContact()
          }}
          style={{ display: 'grid', gap: 12 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 900, color: '#333' }}>
              Nome
              <input
                name="pc_contact_name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Maria Silva"
                autoFocus
                readOnly={lockName}
                onFocus={unlockName}
                onMouseDown={() => {
                  if (lockName) unlockName()
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                style={{
                  border: '1px solid var(--pc-border)',
                  borderRadius: 10,
                  padding: '9px 10px',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 900, color: '#333' }}>
              Telefone (WhatsApp)
              <input
                name="pc_contact_phone"
                type="tel"
                inputMode="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="Ex: +55 82 99999-9999"
                readOnly={lockPhone}
                onFocus={unlockPhone}
                onMouseDown={() => {
                  if (lockPhone) unlockPhone()
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                style={{
                  border: '1px solid var(--pc-border)',
                  borderRadius: 10,
                  padding: '9px 10px',
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 900, color: '#333' }}>
            Foto (URL) — opcional
            <input
              name="pc_contact_photo"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={formPhotoUrl}
              onChange={(e) => setFormPhotoUrl(e.target.value)}
              placeholder="https://..."
              style={{
                border: '1px solid var(--pc-border)',
                borderRadius: 10,
                padding: '9px 10px',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </label>

          <div
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 12,
              padding: 12,
              background: 'rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: '#222', marginBottom: 10 }}>Etiquetas</div>

            {activeTags.length === 0 ? (
              <div style={{ fontSize: 13, color: '#666' }}>Nenhuma etiqueta cadastrada.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflow: 'auto', paddingRight: 6 }}>
                {activeTags
                  .slice()
                  .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                  .map((t) => {
                    const checked = formTagIds.includes(t.id)
                    return (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleFormTag(t.id)} />
                        <span style={{ width: 10, height: 10, borderRadius: 99, background: t.color, display: 'inline-block' }} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#333' }}>{t.name}</span>
                      </label>
                    )
                  })}
              </div>
            )}
          </div>

          {formErr && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.22)',
                color: '#991b1b',
                fontSize: 13,
                fontWeight: 900
              }}
            >
              {formErr}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="pcCfgBtnGhost" onClick={closeNewModal} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="pcCfgBtnPrimary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar contato'}
            </button>
          </div>
        </form>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/contatos/Contatos.jsx