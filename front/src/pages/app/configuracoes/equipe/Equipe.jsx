// caminho: front/src/pages/app/configuracoes/equipe/Equipe.jsx
import { useMemo, useState } from 'react'
import './equipe.css'

function normalize(v) {
  return String(v || '').trim().replace(/\s+/g, ' ')
}

function lower(v) {
  return normalize(v).toLowerCase()
}

function isEmail(v) {
  const s = String(v || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
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

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'atendente', label: 'Atendente' }
]

function roleLabel(v) {
  return ROLES.find((r) => r.value === v)?.label || '—'
}

export default function Equipe() {
  const [members, setMembers] = useState(() => [
    { id: 1, name: 'Marcelo', email: 'marcelo@empresa.com', role: 'admin', active: true },
    { id: 2, name: 'Atendente 01', email: 'atendente01@empresa.com', role: 'atendente', active: true }
  ])

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const qq = lower(q)
    if (!qq) return members
    return members.filter(
      (m) => lower(m.name).includes(qq) || lower(m.email).includes(qq) || lower(roleLabel(m.role)).includes(qq)
    )
  }, [members, q])

  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState('atendente')

  function resetForm() {
    setFormName('')
    setFormEmail('')
    setFormRole('atendente')
    setErr('')
  }

  function openModal() {
    resetForm()
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  function toggleActive(id) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m)))
  }

  function removeMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  function onCreate() {
    const name = normalize(formName)
    const email = lower(formEmail)
    const role = String(formRole || 'atendente')

    if (!name) {
      setErr('Informe o nome.')
      return
    }
    if (!email || !isEmail(email)) {
      setErr('Informe um e-mail válido.')
      return
    }

    const exists = members.some((m) => lower(m.email) === email)
    if (exists) {
      setErr('Já existe um membro com esse e-mail.')
      return
    }

    const nextId = (Math.max(0, ...members.map((m) => Number(m.id) || 0)) || 0) + 1

    setMembers((prev) => [...prev, { id: nextId, name, email, role, active: true }])
    closeModal()
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Equipe</h2>
        <p>Gerencie membros, perfis e acesso ao sistema.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcCfgCardHeaderRow">
            <div>
              <h3>Membros</h3>
              <div className="pcCfgSub">
                Total: <b>{members.length}</b>
              </div>
            </div>

            <div className="pcCfgHeaderActions">
              <input
                className="pcCfgSearch"
                placeholder="Buscar membro..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="button" className="pcCfgBtnPrimary" onClick={openModal}>
                Novo membro
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {filtered.length === 0 ? (
              <div className="pcCfgEmpty">Nenhum membro encontrado.</div>
            ) : (
              <div className="pcCfgTable">
                <div className="pcCfgRow pcCfgRowHead">
                  <div>Nome</div>
                  <div>E-mail</div>
                  <div>Perfil</div>
                  <div>Status</div>
                  <div className="pcCfgRight">Ações</div>
                </div>

                {filtered.map((m) => (
                  <div key={m.id} className="pcCfgRow">
                    <div className="pcCfgName">
                      <div className="pcCfgNameTop">{m.name}</div>
                    </div>

                    <div className="pcCfgEmail">{m.email}</div>

                    <div className="pcCfgType">{roleLabel(m.role)}</div>

                    <div>
                      <button
                        type="button"
                        className={`pcCfgPillBtn${m.active ? ' on' : ''}`}
                        onClick={() => toggleActive(m.id)}
                        title="Alternar ativo"
                      >
                        {m.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>

                    <div className="pcCfgRight">
                      <button type="button" className="pcCfgBtnGhost" onClick={() => removeMember(m.id)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pcCfgNote">
              Próximo passo: ligar essa tela na API (convite por e-mail, permissões por módulo e auditoria).
            </div>
          </div>
        </div>
      </div>

      <ModalBase open={open} title="Novo membro" onClose={closeModal}>
        <div className="pcCfgForm">
          <label className="pcCfgLabel">
            Nome
            <input className="pcCfgInput" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus />
          </label>

          <label className="pcCfgLabel">
            E-mail
            <input
              className="pcCfgInput"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="nome@empresa.com"
            />
          </label>

          <label className="pcCfgLabel">
            Perfil
            <select className="pcCfgInput" value={formRole} onChange={(e) => setFormRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {err && <div className="pcCfgError">{err}</div>}

          <div className="pcCfgFormActions">
            <button type="button" className="pcCfgBtnGhost" onClick={closeModal}>
              Cancelar
            </button>
            <button type="button" className="pcCfgBtnPrimary" onClick={onCreate}>
              Criar
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/equipe/Equipe.jsx