// caminho: front/src/pages/app/configuracoes/respostas-rapidas/RespostasRapidas.jsx
import { useMemo, useState } from 'react'
import './respostas-rapidas.css'

function normalize(v) {
  return String(v || '').trim()
}

function lower(v) {
  return normalize(v).toLowerCase()
}

function ModalBase({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div className="pcCfgModalOverlay" onMouseDown={onClose}>
      <div className="pcCfgModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pcCfgModalHeader">
          <h3>{title}</h3>
          <button className="pcCfgIconBtn" onClick={onClose}>✕</button>
        </div>
        <div className="pcCfgModalBody">{children}</div>
      </div>
    </div>
  )
}

export default function RespostasRapidas() {
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'Boas-vindas',
      shortcut: '/boasvindas',
      message: 'Olá {{nome}}, tudo bem? Seja bem-vindo(a)! 😊',
      active: true
    }
  ])

  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const qq = lower(q)
    if (!qq) return items
    return items.filter(
      (i) =>
        lower(i.name).includes(qq) ||
        lower(i.shortcut).includes(qq)
    )
  }, [items, q])

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    shortcut: '',
    message: ''
  })
  const [err, setErr] = useState('')

  function openModal() {
    setForm({ name: '', shortcut: '', message: '' })
    setErr('')
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
  }

  function toggleActive(id) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, active: !i.active } : i
      )
    )
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function onCreate() {
    const name = normalize(form.name)
    const shortcut = normalize(form.shortcut)
    const message = normalize(form.message)

    if (!name || !shortcut || !message) {
      setErr('Preencha todos os campos.')
      return
    }

    if (!shortcut.startsWith('/')) {
      setErr('O atalho deve começar com "/".')
      return
    }

    const exists = items.some(
      (i) => lower(i.shortcut) === lower(shortcut)
    )

    if (exists) {
      setErr('Já existe uma resposta com esse atalho.')
      return
    }

    const nextId =
      Math.max(0, ...items.map((i) => i.id)) + 1

    setItems((prev) => [
      ...prev,
      { id: nextId, name, shortcut, message, active: true }
    ])

    closeModal()
  }

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Respostas Rápidas</h2>
        <p>Mensagens prontas com atalhos para usar no Inbox.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcCfgCardHeaderRow">
            <div>
              <h3>Respostas cadastradas</h3>
              <div className="pcCfgSub">
                Total: <b>{items.length}</b>
              </div>
            </div>

            <div className="pcCfgHeaderActions">
              <input
                className="pcCfgSearch"
                placeholder="Buscar..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="pcCfgBtnPrimary" onClick={openModal}>
                Nova resposta
              </button>
            </div>
          </div>

          <div className="pcCardBody">
            {filtered.map((item) => (
              <div key={item.id} className="pcCfgQuickCard">
                <div className="pcCfgQuickTop">
                  <div>
                    <div className="pcCfgQuickName">
                      {item.name}
                    </div>
                    <div className="pcCfgQuickShortcut">
                      {item.shortcut}
                    </div>
                  </div>

                  <div className="pcCfgQuickActions">
                    <button
                      className={`pcCfgPillBtn${item.active ? ' on' : ''}`}
                      onClick={() => toggleActive(item.id)}
                    >
                      {item.active ? 'Ativa' : 'Inativa'}
                    </button>

                    <button
                      className="pcCfgBtnGhost"
                      onClick={() => removeItem(item.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="pcCfgQuickMessage">
                  {item.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ModalBase open={open} title="Nova Resposta Rápida" onClose={closeModal}>
        <div className="pcCfgForm">
          <label className="pcCfgLabel">
            Nome interno
            <input
              className="pcCfgInput"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
          </label>

          <label className="pcCfgLabel">
            Atalho
            <input
              className="pcCfgInput"
              placeholder="/boasvindas"
              value={form.shortcut}
              onChange={(e) =>
                setForm({ ...form, shortcut: e.target.value })
              }
            />
          </label>

          <label className="pcCfgLabel">
            Mensagem
            <textarea
              className="pcCfgTextarea"
              rows={5}
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
            />
          </label>

          <div className="pcCfgVariablesHint">
            Variáveis disponíveis:
            <br />
            {'{{nome}}'} {'{{telefone}}'} {'{{etiquetas}}'} {'{{data_chegada}}'} {'{{data_saida}}'}
          </div>

          {err && <div className="pcCfgError">{err}</div>}

          <div className="pcCfgFormActions">
            <button className="pcCfgBtnGhost" onClick={closeModal}>
              Cancelar
            </button>
            <button className="pcCfgBtnPrimary" onClick={onCreate}>
              Criar
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/respostas-rapidas/RespostasRapidas.jsx