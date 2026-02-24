// caminho: front/src/pages/app/inbox/Inbox.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import './inbox.css'

import { apiGet, apiPost } from '../../../services/api'
import { getQuickReplies, logEvent } from '../../../services/appStore'

import { safeArr, pickArrayFromPayload, pickObjFromPayload } from './shared/inboxUtils'
import { useInboxSnippets } from './shared/useInboxSnippets'

import InboxLeft from './block1/InboxLeft.jsx'
import InboxCenter from './block2/InboxCenter.jsx'
import InboxRight from './block3/InboxRight.jsx'

export default function Inbox() {
  const clientId = 1

  // ========= API state =========
  const [loadingList, setLoadingList] = useState(false)
  const [listErr, setListErr] = useState('')
  const [conversations, setConversations] = useState([])

  const [selectedId, setSelectedId] = useState(null)
  const selectedConv = useMemo(
    () => conversations.find((c) => Number(c.id) === Number(selectedId)) || null,
    [conversations, selectedId]
  )

  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [msgsErr, setMsgsErr] = useState('')
  const [messages, setMessages] = useState([])

  // ========= UI state =========
  const [rightOpen, setRightOpen] = useState(true)

  // BLOCO 3: modal interno
  const [rightModal, setRightModal] = useState({ open: false, key: null })

  // composer + /atalhos
  const inputRef = useRef(null)
  const [message, setMessage] = useState('')
  const [caret, setCaret] = useState(0)

  const replies = useMemo(() => getQuickReplies(clientId).filter((x) => x?.active), [clientId])

  // logs mock (até plugar conversation_ai_logs)
  const [aiLogs, setAiLogs] = useState([
    {
      id: `log_${Date.now()}`,
      at: new Date(Date.now() - 12 * 60000),
      type: 'info',
      text: 'IA analisou contexto e sugeriu coletar datas.'
    }
  ])

  // controles mock IA / perfil / agressivo (mantidos)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [salesProfile, setSalesProfile] = useState('Consultivo')
  const [aggressiveMode, setAggressiveMode] = useState(false)

  // ========= filtros (bloco 1) =========
  const [search, setSearch] = useState('')
  const [filterKey, setFilterKey] = useState('all') // all | unread | hot | no_reply

  const filteredConversations = useMemo(() => {
    let arr = safeArr(conversations)
    const q = String(search || '').trim().toLowerCase()
    if (q) {
      arr = arr.filter((c) => {
        const name = String(c.lead_name || '').toLowerCase()
        const phone = String(c.lead_phone_e164 || '').toLowerCase()
        return name.includes(q) || phone.includes(q)
      })
    }

    if (filterKey === 'hot') arr = arr.filter((c) => Number(c.score || 0) >= 80)
    if (filterKey === 'no_reply') arr = arr.filter((c) => c.last_inbound_at && !c.last_outbound_at)

    // unread: placeholder (quando criarmos campo unread_count, pluga aqui)
    return arr
  }, [conversations, filterKey, search])

  // ========= proteção anti-corrida =========
  const selectedIdRef = useRef(null)
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const msgsReqSeqRef = useRef(0)

  function pushAiLog(type, text) {
    setAiLogs((arr) => [{ id: `log_${Date.now()}_${Math.random()}`, at: new Date(), type, text }, ...arr])
  }

  function openRightModal(key) {
    setRightModal({ open: true, key })
  }
  function closeRightModal() {
    setRightModal({ open: false, key: null })
  }

  // ========= API calls =========
  async function loadConversations() {
    setLoadingList(true)
    setListErr('')
    try {
      const payload = await apiGet('/inbox/conversations', { clientId })
      const arr = pickArrayFromPayload(payload)
      setConversations(arr)

      if (selectedIdRef.current) {
        const still = arr.some((c) => Number(c.id) === Number(selectedIdRef.current))
        if (!still) {
          setSelectedId(null)
          setMessages([])
          closeRightModal()
        }
      }
    } catch (e) {
      if (e?.payload?.error !== 'aborted') {
        setListErr(e?.payload?.message || e?.payload?.error || e?.message || 'Erro ao carregar conversas.')
      }
      setConversations([])
    } finally {
      setLoadingList(false)
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) return
    const reqId = ++msgsReqSeqRef.current
    setLoadingMsgs(true)
    setMsgsErr('')

    try {
      const payload = await apiGet(`/inbox/conversations/${conversationId}/messages`, { clientId })
      const arr = pickArrayFromPayload(payload)

      if (Number(selectedIdRef.current) !== Number(conversationId)) return
      if (reqId !== msgsReqSeqRef.current) return

      setMessages(arr)
    } catch (e) {
      if (e?.payload?.error !== 'aborted') {
        setMsgsErr(e?.payload?.message || e?.payload?.error || e?.message || 'Erro ao carregar mensagens.')
      }
      if (Number(selectedIdRef.current) === Number(conversationId) && reqId === msgsReqSeqRef.current) {
        setMessages([])
      }
    } finally {
      if (Number(selectedIdRef.current) === Number(conversationId) && reqId === msgsReqSeqRef.current) {
        setLoadingMsgs(false)
      }
    }
  }

  useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const intervalMs = 12000
    const t = setInterval(() => {
      loadConversations()
      if (selectedIdRef.current) loadMessages(selectedIdRef.current)
    }, intervalMs)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ========= snippet (texto real da última mensagem) =========
  const { snippetMap } = useInboxSnippets({
    clientId,
    conversations,
    apiGet
  })

  function onPickConversation(conv) {
    setSelectedId(conv.id)

    logEvent(clientId, {
      module: 'Inbox',
      action: 'Selecionou conversa',
      description: `Abriu conversa com ${conv.lead_name || 'Lead'}.`
    })

    setRightOpen(true)
    setMessages([])
    closeRightModal()
    loadMessages(conv.id)
  }

  async function onSend(txt) {
    if (!selectedConv) return
    const text = String(txt || '').trim()
    if (!text) return

    logEvent(clientId, {
      module: 'Inbox',
      action: 'Enviou mensagem',
      description: `Mensagem enviada para ${selectedConv.lead_name || 'Lead'}.`
    })

    try {
      await apiPost(
        `/inbox/conversations/${selectedConv.id}/messages`,
        { role: 'agent', direction: 'out', text },
        { clientId }
      )

      await loadMessages(selectedConv.id)
      await loadConversations()
    } catch (e) {
      setMsgsErr(e?.payload?.message || e?.payload?.error || e?.message || 'Erro ao enviar mensagem.')
      throw e
    }
  }

  async function onAssumir() {
    if (!selectedConv) return
    pushAiLog('info', 'Atendente assumiu o atendimento.')
    try {
      const payload = await apiPost(
        `/inbox/conversations/${selectedConv.id}/assign`,
        { assigned_user_id: 10 },
        { clientId }
      )
      const next = pickObjFromPayload(payload)
      if (next?.id) setConversations((arr) => arr.map((c) => (c.id === next.id ? next : c)))
      else await loadConversations()
    } catch (e) {
      setMsgsErr(e?.payload?.message || e?.payload?.error || e?.message || 'Erro ao assumir conversa.')
    }
  }

  async function onDevolverIA() {
    if (!selectedConv) return
    pushAiLog('info', 'Atendimento devolvido para IA.')
    try {
      const payload = await apiPost(
        `/inbox/conversations/${selectedConv.id}/return-to-ai`,
        { actor_user_id: 10 },
        { clientId }
      )
      const next = pickObjFromPayload(payload)
      if (next?.id) setConversations((arr) => arr.map((c) => (c.id === next.id ? next : c)))
      else await loadConversations()
    } catch (e) {
      setMsgsErr(e?.payload?.message || e?.payload?.error || e?.message || 'Erro ao devolver para IA.')
    }
  }

  const transferEnabled = false
  function onTransferir() {
    if (!selectedConv) return
    pushAiLog('info', 'Transferência: recurso em breve.')
  }

  const selectedLead = useMemo(() => {
    if (!selectedConv) return null
    const numberLabel = selectedConv.wa_number_id ? `📱${selectedConv.wa_number_id}` : '📱—'
    const empresa = String(selectedConv?.meta?.empresa || selectedConv?.meta?.company || '').trim()
    return {
      id: selectedConv.id,
      nome: selectedConv.lead_name || 'Lead',
      telefone: selectedConv.lead_phone_e164 || '',
      empresa: empresa || '—',
      dept: 'Vendas',
      numberLabel,
      score: Number(selectedConv.score || 0),
      stage: selectedConv.stage || 'lead',
      aiMode: selectedConv.status === 'human' ? 'human' : 'ai',
      owner: selectedConv.assigned_user_id ? `#${selectedConv.assigned_user_id}` : null,
      tags: selectedConv.meta?.tags || [],
      followupAt: null
    }
  }, [selectedConv])

  const layoutClass = `pcInboxLayout${rightOpen && selectedConv ? ' is-right-open' : ''}`

  return (
    <div className="pcInboxPage">
      <div className="pcInboxHeader">
        <div className="pcInboxHeaderLeft">
          <h1>Inbox</h1>
          <p>Atendimento e vendas em um só lugar.</p>
        </div>

        <div className="pcInboxHeaderRight">
          <div className="pcInboxPills">
            <span className="pcInboxPill">Status WhatsApp: <b>Online</b></span>
            <span className="pcInboxPill">Números: <b>—</b></span>
          </div>
        </div>
      </div>

      <div className={layoutClass}>
        {/* BLOCO 1 */}
        <InboxLeft
          loadingList={loadingList}
          listErr={listErr}
          search={search}
          setSearch={setSearch}
          filterKey={filterKey}
          setFilterKey={setFilterKey}
          filteredConversations={filteredConversations}
          selectedId={selectedId}
          onPickConversation={onPickConversation}
          loadConversations={loadConversations}
          snippetMap={snippetMap}
        />

        {/* BLOCO 2 */}
        <InboxCenter
          selectedLead={selectedLead}
          selectedConv={selectedConv}
          rightOpen={rightOpen}
          setRightOpen={(fn) => {
            setRightOpen(fn)
            closeRightModal()
          }}
          loadingMsgs={loadingMsgs}
          msgsErr={msgsErr}
          messages={messages}
          inputRef={inputRef}
          message={message}
          setMessage={setMessage}
          caret={caret}
          setCaret={setCaret}
          replies={replies}
          aiEnabled={aiEnabled}
          setAiEnabled={setAiEnabled}
          salesProfile={salesProfile}
          setSalesProfile={setSalesProfile}
          aggressiveMode={aggressiveMode}
          setAggressiveMode={setAggressiveMode}
          onAssumir={onAssumir}
          onTransferir={onTransferir}
          transferEnabled={transferEnabled}
          onDevolverIA={onDevolverIA}
          pushAiLog={pushAiLog}
          onSend={async (txt) => {
            const prev = message
            setMessage('')
            setCaret(0)
            try {
              await onSend(txt)
            } catch {
              setMessage(prev)
              throw new Error('send_error')
            }
          }}
        />

        {/* BLOCO 3 */}
        {selectedLead && (
          <InboxRight
            rightOpen={rightOpen}
            selectedLead={selectedLead}
            aiEnabled={aiEnabled}
            salesProfile={salesProfile}
            aiLogs={aiLogs}
            rightModal={rightModal}
            openRightModal={openRightModal}
            closeRightModal={closeRightModal}
            pushAiLog={pushAiLog}
          />
        )}
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/Inbox.jsx