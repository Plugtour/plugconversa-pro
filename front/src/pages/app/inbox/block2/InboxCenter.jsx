// caminho: front/src/pages/app/inbox/block2/InboxCenter.jsx
import './block2.css'
import ChatHeader from './ChatHeader.jsx'
import ChatBody from './ChatBody.jsx'
import Composer from './Composer.jsx'

export default function InboxCenter(props) {
  const {
    selectedLead,
    selectedConv,
    rightOpen,
    setRightOpen,

    loadingMsgs,
    msgsErr,
    messages,

    inputRef,
    message,
    setMessage,
    caret,
    setCaret,
    replies,

    aiEnabled,
    setAiEnabled,
    salesProfile,
    setSalesProfile,
    aggressiveMode,
    setAggressiveMode,

    onAssumir,
    onTransferir,
    transferEnabled,
    onDevolverIA,

    pushAiLog,
    onSend
  } = props

  const centerWrapStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 520
  }

  return (
    <section className="pcInboxCenter" style={centerWrapStyle}>
      {!selectedLead ? (
        <div className="pcInboxEmpty" style={{ flex: 1 }}>
          <div className="pcInboxEmptyCard">
            <div className="pcInboxEmptyIcon">💬</div>
            <div className="pcInboxEmptyTitle">Selecione um lead para abrir a conversa</div>
            <div className="pcInboxEmptyText">
              A lista de conversas fica sempre visível à esquerda. Ao abrir um lead, o painel de informações aparece à direita.
            </div>
          </div>
        </div>
      ) : (
        <>
          <ChatHeader
            selectedLead={selectedLead}
            rightOpen={rightOpen}
            setRightOpen={setRightOpen}
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
          />

          <ChatBody
            msgsErr={msgsErr}
            loadingMsgs={loadingMsgs}
            messages={messages}
          />

          <Composer
            selectedLead={selectedLead}
            selectedConv={selectedConv}
            inputRef={inputRef}
            message={message}
            setMessage={setMessage}
            caret={caret}
            setCaret={setCaret}
            replies={replies}
            pushAiLog={pushAiLog}
            onSend={onSend}
          />
        </>
      )}
    </section>
  )
}
// fim: front/src/pages/app/inbox/block2/InboxCenter.jsx