// caminho: front/src/pages/app/fluxo/components/FlowActionModal.jsx
import { useEffect, useMemo, useState } from 'react'

function normalizeName(v) {
  return String(v || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function lowerKey(v) {
  return normalizeName(v).toLowerCase()
}

function pickUniqueCopyName(baseName, existingNames) {
  const base = normalizeName(baseName)
  const existing = new Set((existingNames || []).map(lowerKey))

  // regra: se vazio, usa "Nome (copia)"
  const first = `${base} (copia)`
  if (!existing.has(lowerKey(first))) return first

  // se já existe, incrementa: "Nome (copia 2)", "Nome (copia 3)"...
  let i = 2
  while (i < 9999) {
    const candidate = `${base} (copia ${i})`
    if (!existing.has(lowerKey(candidate))) return candidate
    i++
  }
  // fallback extremo
  return `${base} (copia ${Date.now()})`
}

function ModalBase({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="pcFluxoModalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="presentation"
    >
      <div className="pcFluxoModal" role="dialog" aria-modal="true" aria-label={title || 'Modal'}>
        <div className="pcFluxoModalHeader">
          <strong className="pcFluxoModalTitle">{title || 'Modal'}</strong>

          <button className="pcFluxoModalClose" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
            ✕
          </button>
        </div>

        <div className="pcFluxoModalBody">{children}</div>
      </div>
    </div>
  )
}

export default function FlowActionModal({
  open,
  mode, // 'rename' | 'confirm' | 'select-folder'
  title,

  // rename
  inputLabel,
  inputPlaceholder,
  initialValue,
  confirmText,

  // ✅ opcional: validação de nome em rename
  existingNames, // também usado no copiar / criar (select-folder)
  renameConflictText, // msg custom (opcional)

  // confirm
  description,
  danger,

  // select-folder
  folders,
  showRootOption,
  rootLabel,
  selectedFolderId,
  onSelectFolder,

  // ✅ nome (select-folder)
  enableName,
  nameLabel,
  namePlaceholder,
  baseCopyName,

  // ✅ NOVO: exigir nome e controlar auto-geração
  nameRequired, // boolean
  nameAutoGenerate, // boolean (default true)

  // common
  busy,
  onCancel,
  onConfirm
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const [copyName, setCopyName] = useState('')

  useEffect(() => {
    setValue(initialValue ?? '')
  }, [initialValue, open, mode])

  useEffect(() => {
    if (!open) return
    if (mode !== 'select-folder') return
    setCopyName('')
  }, [open, mode])

  const existingSet = useMemo(() => new Set((existingNames || []).map(lowerKey)), [existingNames])

  // ===== rename validation =====
  const renameNorm = useMemo(() => normalizeName(value), [value])
  const renameInitialKey = useMemo(() => lowerKey(initialValue ?? ''), [initialValue])

  const renameConflict = useMemo(() => {
    if (mode !== 'rename') return false
    const k = lowerKey(renameNorm)
    if (!k) return false
    // não conflita com ele mesmo (nome atual)
    if (k === renameInitialKey) return false
    return existingSet.has(k)
  }, [mode, renameNorm, renameInitialKey, existingSet])

  // ===== select-folder name validation =====
  const nameNorm = useMemo(() => normalizeName(copyName), [copyName])

  const isNameRequired = !!(mode === 'select-folder' && enableName && nameRequired)
  const allowAutoGenerate = mode === 'select-folder' && enableName ? nameAutoGenerate !== false : true

  const nameMissing = useMemo(() => {
    if (!isNameRequired) return false
    return !nameNorm
  }, [isNameRequired, nameNorm])

  const copyNameConflict = useMemo(() => {
    if (!(mode === 'select-folder' && enableName)) return false
    if (!nameNorm) return false // vazio pode ser permitido dependendo de nameRequired
    return existingSet.has(lowerKey(nameNorm))
  }, [mode, enableName, nameNorm, existingSet])

  const canConfirmRename = useMemo(() => {
    if (mode !== 'rename') return true
    const v = String(value || '').trim()
    return v.length > 0
  }, [mode, value])

  const canConfirmSelectFolder = useMemo(() => {
    if (mode !== 'select-folder') return true
    if (showRootOption && selectedFolderId === null) return true
    return Number.isFinite(Number(selectedFolderId)) && Number(selectedFolderId) > 0
  }, [mode, selectedFolderId, showRootOption])

  const canConfirm =
    !busy &&
    canConfirmRename &&
    canConfirmSelectFolder &&
    !renameConflict &&
    !copyNameConflict &&
    !nameMissing

  function handleConfirm() {
    if (!canConfirm) return

    if (mode === 'rename') {
      const v = String(value || '').trim()
      if (!v) return
      onConfirm?.({ value: v })
      return
    }

    if (mode === 'select-folder') {
      const fid = showRootOption && selectedFolderId === null ? null : Number(selectedFolderId)

      let finalName = undefined
      if (enableName) {
        if (nameNorm) {
          finalName = nameNorm
        } else {
          // se não informou nome:
          // - se for obrigatório, canConfirm já bloqueou antes
          // - se auto-geração estiver desligada, não gera nada
          // - caso contrário, gera nome padrão (copia)
          if (allowAutoGenerate) {
            finalName = pickUniqueCopyName(baseCopyName || '', existingNames || [])
          }
        }
      }

      onConfirm?.({ folder_id: fid, name: finalName })
      return
    }

    onConfirm?.()
  }

  const confirmBtnClass = danger ? 'pcBtnDanger' : 'pcBtnPrimary'

  return (
    <ModalBase open={open} title={title} onClose={() => (!busy ? onCancel?.() : null)}>
      {mode === 'rename' && (
        <div className="pcFluxoForm" style={{ gap: 12 }}>
          <label className="pcFluxoField">
            <span className="pcFluxoLabel">{inputLabel || 'Nome'}</span>
            <input
              className="pcFluxoInput"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputPlaceholder || ''}
              disabled={busy}
              autoFocus
            />
          </label>

          {renameConflict && (
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: -6 }}>
              {renameConflictText || 'Já existe um item com esse nome. Escolha outro.'}
            </div>
          )}

          <div className="pcFluxoModalActions">
            <button className="pcBtnGhost" type="button" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button className="pcBtnPrimary" type="button" onClick={handleConfirm} disabled={!canConfirm}>
              {confirmText || 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {mode === 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="pcFluxoModalDesc">{description || ''}</div>

          <div className="pcFluxoModalActions">
            <button className="pcBtnGhost" type="button" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button className={confirmBtnClass} type="button" onClick={handleConfirm} disabled={!canConfirm}>
              {confirmText || (danger ? 'Excluir' : 'Confirmar')}
            </button>
          </div>
        </div>
      )}

      {mode === 'select-folder' && (
        <div className="pcFluxoFolderPicker">
          {enableName && (
            <div className="pcFluxoForm" style={{ gap: 10, marginBottom: 10 }}>
              <label className="pcFluxoField">
                <span className="pcFluxoLabel">{nameLabel || 'Nome (opcional)'}</span>
                <input
                  className="pcFluxoInput"
                  value={copyName}
                  onChange={(e) => setCopyName(e.target.value)}
                  placeholder={namePlaceholder || (allowAutoGenerate ? 'Se não informar, será usado: Nome (copia)' : '')}
                  disabled={busy}
                  autoFocus
                />
              </label>

              {nameMissing && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: -4 }}>Informe um nome para continuar.</div>
              )}

              {copyNameConflict && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: -4 }}>
                  Já existe um fluxo com esse nome nesta pasta. Escolha outro.
                </div>
              )}
            </div>
          )}

          <div className="pcFluxoFolderPickerHint">Selecione a pasta desejada:</div>

          <div className="pcFluxoFolderList" role="list">
            {showRootOption && (
              <button
                type="button"
                className={[
                  'pcFluxoFolderOption',
                  'pcFluxoFolderOptionRoot',
                  selectedFolderId === null ? 'pcFluxoFolderOptionSelected' : ''
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelectFolder?.(null)}
                disabled={busy}
                aria-pressed={selectedFolderId === null}
              >
                <span className="pcFluxoFolderOptionIcon" aria-hidden="true">
                  📁
                </span>

                <span className="pcFluxoFolderOptionMain">
                  <span className="pcFluxoFolderOptionTitle">{rootLabel || 'Raiz (sem pasta)'}</span>
                  <span className="pcFluxoFolderOptionSub">Salvar na raiz</span>
                </span>

                <span className="pcFluxoFolderOptionCheck" aria-hidden="true" />
              </button>
            )}

            {(folders || []).map((p) => {
              const isSelected = Number(selectedFolderId) === Number(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={['pcFluxoFolderOption', isSelected ? 'pcFluxoFolderOptionSelected' : ''].filter(Boolean).join(' ')}
                  onClick={() => onSelectFolder?.(Number(p.id))}
                  disabled={busy}
                  aria-pressed={isSelected}
                >
                  <span className="pcFluxoFolderOptionIcon" aria-hidden="true">
                    📁
                  </span>

                  <span className="pcFluxoFolderOptionMain">
                    <span className="pcFluxoFolderOptionTitle" title={p.name}>
                      {p.name}
                    </span>
                    <span className="pcFluxoFolderOptionSub">Selecionar esta pasta</span>
                  </span>

                  <span className="pcFluxoFolderOptionCheck" aria-hidden="true" />
                </button>
              )
            })}
          </div>

          <div className="pcFluxoModalActions">
            <button className="pcBtnGhost" type="button" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button className="pcBtnPrimary" type="button" onClick={handleConfirm} disabled={!canConfirm}>
              {confirmText || 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </ModalBase>
  )
}
// fim: front/src/pages/app/fluxo/components/FlowActionModal.jsx