// caminho: front/src/pages/app/configuracoes/horarios/Horarios.jsx
import { useMemo, useState } from 'react'
import './horarios.css'

const WEEK_DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
]

function buildInitialWeekly() {
  const base = {}
  WEEK_DAYS.forEach((d, idx) => {
    base[d.key] = {
      enabled: idx < 5, // seg-sex ativo por padrão
      start: '08:00',
      end: '18:00'
    }
  })
  return base
}

function ModalBase({ open, title, children, onClose }) {
  if (!open) return null

  return (
    <div className="pcCfgModalOverlay" onMouseDown={onClose}>
      <div className="pcCfgModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pcCfgModalHeader">
          <h3>{title}</h3>
          <button type="button" className="pcCfgIconBtn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pcCfgModalBody">{children}</div>
      </div>
    </div>
  )
}

export default function Horarios() {
  const [config, setConfig] = useState({
    weekly: buildInitialWeekly(),
    holidays: [],
    afterHours: {
      mode: 'bot', // bot | auto | quick | none
      quickReplyId: null
    }
  })

  const [openHoliday, setOpenHoliday] = useState(false)
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    mode: 'closed',
    start: '08:00',
    end: '12:00'
  })

  function updateWeekly(dayKey, field, value) {
    setConfig((prev) => ({
      ...prev,
      weekly: {
        ...prev.weekly,
        [dayKey]: {
          ...prev.weekly[dayKey],
          [field]: value
        }
      }
    }))
  }

  function addHoliday() {
    if (!holidayForm.name || !holidayForm.date) return

    const id =
      Math.max(0, ...config.holidays.map((h) => Number(h.id) || 0)) + 1

    setConfig((prev) => ({
      ...prev,
      holidays: [...prev.holidays, { ...holidayForm, id }]
    }))

    setHolidayForm({
      name: '',
      date: '',
      mode: 'closed',
      start: '08:00',
      end: '12:00'
    })

    setOpenHoliday(false)
  }

  function removeHoliday(id) {
    setConfig((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((h) => h.id !== id)
    }))
  }

  const afterModeLabel = useMemo(() => {
    switch (config.afterHours.mode) {
      case 'bot':
        return 'Bot ativado'
      case 'auto':
        return 'Resposta automática'
      case 'quick':
        return 'Resposta rápida'
      default:
        return 'Nenhuma ação'
    }
  }, [config.afterHours.mode])

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Horários de Atendimento</h2>
        <p>Configure funcionamento humano e comportamento fora do horário.</p>
      </div>

      {/* ================= SEMANA ================= */}
      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Horário por dia da semana</h3>
          </div>

          <div className="pcCardBody">
            <div className="pcHoursGrid">
              {WEEK_DAYS.map((d) => {
                const day = config.weekly[d.key]
                return (
                  <div key={d.key} className="pcHoursRow">
                    <div className="pcHoursDay">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(e) =>
                          updateWeekly(d.key, 'enabled', e.target.checked)
                        }
                      />
                      <span>{d.label}</span>
                    </div>

                    {day.enabled && (
                      <div className="pcHoursTime">
                        <input
                          type="time"
                          value={day.start}
                          onChange={(e) =>
                            updateWeekly(d.key, 'start', e.target.value)
                          }
                        />
                        <span>até</span>
                        <input
                          type="time"
                          value={day.end}
                          onChange={(e) =>
                            updateWeekly(d.key, 'end', e.target.value)
                          }
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= FERIADOS ================= */}
      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcCfgCardHeaderRow">
            <h3>Feriados</h3>
            <button
              className="pcCfgBtnPrimary"
              onClick={() => setOpenHoliday(true)}
            >
              Novo feriado
            </button>
          </div>

          <div className="pcCardBody">
            {config.holidays.length === 0 ? (
              <div className="pcCfgEmpty">Nenhum feriado cadastrado.</div>
            ) : (
              <div className="pcCfgTable">
                {config.holidays.map((h) => (
                  <div key={h.id} className="pcCfgRow">
                    <div>{h.name}</div>
                    <div>{h.date}</div>
                    <div>
                      {h.mode === 'closed'
                        ? 'Fechado'
                        : `Horário reduzido (${h.start} - ${h.end})`}
                    </div>
                    <div className="pcCfgRight">
                      <button
                        className="pcCfgBtnGhost"
                        onClick={() => removeHoliday(h.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= FORA DO HORÁRIO ================= */}
      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Comportamento fora do horário</h3>
          </div>

          <div className="pcCardBody">
            <div className="pcAfterHoursOptions">
              {['bot', 'auto', 'quick', 'none'].map((mode) => (
                <label key={mode} className="pcAfterOption">
                  <input
                    type="radio"
                    name="afterMode"
                    value={mode}
                    checked={config.afterHours.mode === mode}
                    onChange={() =>
                      setConfig((prev) => ({
                        ...prev,
                        afterHours: { ...prev.afterHours, mode }
                      }))
                    }
                  />
                  <span>
                    {mode === 'bot' && 'Bot ativado'}
                    {mode === 'auto' && 'Resposta automática'}
                    {mode === 'quick' && 'Resposta rápida'}
                    {mode === 'none' && 'Nenhuma ação'}
                  </span>
                </label>
              ))}
            </div>

            <div className="pcCfgNote">
              Modo atual: <b>{afterModeLabel}</b>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL FERIADO ================= */}
      <ModalBase
        open={openHoliday}
        title="Novo feriado"
        onClose={() => setOpenHoliday(false)}
      >
        <div className="pcCfgForm">
          <label className="pcCfgLabel">
            Nome
            <input
              className="pcCfgInput"
              value={holidayForm.name}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, name: e.target.value })
              }
            />
          </label>

          <label className="pcCfgLabel">
            Data
            <input
              type="date"
              className="pcCfgInput"
              value={holidayForm.date}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, date: e.target.value })
              }
            />
          </label>

          <label className="pcCfgLabel">
            Tipo
            <select
              className="pcCfgInput"
              value={holidayForm.mode}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, mode: e.target.value })
              }
            >
              <option value="closed">Fechado</option>
              <option value="custom">Horário reduzido</option>
            </select>
          </label>

          {holidayForm.mode === 'custom' && (
            <div className="pcHoursTime">
              <input
                type="time"
                value={holidayForm.start}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, start: e.target.value })
                }
              />
              <span>até</span>
              <input
                type="time"
                value={holidayForm.end}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, end: e.target.value })
                }
              />
            </div>
          )}

          <div className="pcCfgFormActions">
            <button
              className="pcCfgBtnGhost"
              onClick={() => setOpenHoliday(false)}
            >
              Cancelar
            </button>
            <button className="pcCfgBtnPrimary" onClick={addHoliday}>
              Salvar
            </button>
          </div>
        </div>
      </ModalBase>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/horarios/Horarios.jsx