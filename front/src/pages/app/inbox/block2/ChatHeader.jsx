// caminho: front/src/pages/app/inbox/block2/ChatHeader.jsx
import './block2.css'

export default function ChatHeader({
  selectedLead,
  rightOpen,
  setRightOpen,

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

  pushAiLog
}) {
  return (
    <div className="pcInboxChatHeader">
      <div className="pcInboxChatHeaderLeft">
        <div className="pcInboxChatName">{selectedLead.nome}</div>
        <div className="pcInboxChatMeta">
          <span className="pcInboxMetaDot" />
          <span>{selectedLead.telefone || '—'}</span>
          <span className="pcInboxMetaSep">•</span>
          <span>{selectedLead.empresa || '—'}</span>
        </div>
      </div>

      <div className="pcInboxChatHeaderRight">
        <div className="pcInboxHeaderControls">
          <label className="pcInboxSwitch" title="Atendimento automático">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => {
                setAiEnabled(e.target.checked)
                pushAiLog('info', e.target.checked ? 'IA ativada.' : 'IA desativada.')
              }}
            />
            <span className="pcInboxSwitchTrack">
              <span className="pcInboxSwitchThumb" />
            </span>
            <span className="pcInboxSwitchLabel">IA</span>
          </label>

          <select
            className="pcInboxSelect"
            value={salesProfile}
            onChange={(e) => {
              setSalesProfile(e.target.value)
              pushAiLog('info', `Perfil de vendedor: ${e.target.value}.`)
            }}
            title="Perfil de vendedor"
          >
            <option>Consultivo</option>
            <option>Premium</option>
            <option>Direto</option>
          </select>

          <button
            type="button"
            className={`pcInboxBtn${aggressiveMode ? ' pcInboxBtnPrimary' : ''}`}
            onClick={() => {
              setAggressiveMode((v) => !v)
              pushAiLog('info', !aggressiveMode ? 'Modo agressivo ativado.' : 'Modo agressivo desativado.')
            }}
            title="Modo agressivo"
          >
            Agressivo
          </button>

          <button type="button" className="pcInboxBtn" onClick={onAssumir}>
            Assumir
          </button>

          <button
            type="button"
            className="pcInboxBtn"
            onClick={onTransferir}
            disabled={!transferEnabled}
            title={!transferEnabled ? 'Recurso em breve' : 'Transferir conversa'}
          >
            Transferir
          </button>

          <button type="button" className="pcInboxBtn pcInboxBtnPrimary" onClick={onDevolverIA}>
            Devolver IA
          </button>

          <button
            type="button"
            className="pcInboxIconBtn"
            onClick={() => setRightOpen((v) => !v)}
            title={rightOpen ? 'Ocultar painel' : 'Mostrar painel'}
          >
            {rightOpen ? '⟩' : '⟨'}
          </button>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block2/ChatHeader.jsx