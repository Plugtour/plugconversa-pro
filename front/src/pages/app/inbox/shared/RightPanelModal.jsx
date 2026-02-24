// caminho: front/src/pages/app/inbox/shared/RightPanelModal.jsx
export default function RightPanelModal({ open, title, onClose, children }) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        padding: 14,
        background: 'rgba(0,0,0,0.18)',
        backdropFilter: 'blur(6px)'
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 14,
          background: '#fff',
          boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '12px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
          <button
            type="button"
            className="pcInboxMiniBtn pcInboxMiniBtnPrimary"
            onClick={onClose}
            title="Fechar"
          >
            Fechar
          </button>
        </div>

        <div style={{ padding: 12, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/inbox/shared/RightPanelModal.jsx