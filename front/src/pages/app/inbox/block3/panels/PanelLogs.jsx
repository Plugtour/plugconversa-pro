// caminho: front/src/pages/app/inbox/block3/panels/PanelLogs.jsx
import { fmtTime } from '../../shared/inboxUtils'

export default function PanelLogs({ aiLogs, pushAiLog }) {
  return (
    <div>
      <div className="pcInboxLogs">
        {aiLogs.map((l) => (
          <div key={l.id} className={`pcInboxLog pcInboxLog--${l.type}`}>
            <div className="pcInboxLogTop">
              <b>{String(l.type || '').toUpperCase()}</b>
              <span>{fmtTime(l.at)}</span>
            </div>
            <div className="pcInboxLogText">{l.text}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="pcInboxMiniBtn"
        onClick={() => pushAiLog('warn', 'IA sinalizou ambiguidade (mock).')}
      >
        Simular alerta
      </button>
    </div>
  )
}
// fim: front/src/pages/app/inbox/block3/panels/PanelLogs.jsx