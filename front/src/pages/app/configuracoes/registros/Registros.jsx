// caminho: front/src/pages/app/configuracoes/registros/Registros.jsx
import { useMemo, useState } from 'react'
import './registros.css'
import { getLogs } from '../../../../services/appStore'

function formatDate(d) {
  const dt = new Date(d)
  return dt.toLocaleString()
}

export default function Registros() {
  const clientId = 1

  // ✅ lê do store (eventos reais do sistema)
  const [logs] = useState(() => getLogs(clientId))

  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const s = String(search || '').toLowerCase()

      const matchSearch =
        !s ||
        String(log.user || '').toLowerCase().includes(s) ||
        String(log.module || '').toLowerCase().includes(s) ||
        String(log.action || '').toLowerCase().includes(s) ||
        String(log.description || '').toLowerCase().includes(s)

      const matchModule = !moduleFilter || log.module === moduleFilter

      return matchSearch && matchModule
    })
  }, [logs, search, moduleFilter])

  const modules = [...new Set(logs.map((l) => l.module).filter(Boolean))]

  return (
    <div className="pcCfgPage">
      <div className="pcCfgHeader">
        <h2>Registros do Sistema</h2>
        <p>Auditoria de ações realizadas pelos usuários.</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader pcLogsHeader">
            <div className="pcLogsFilters">
              <input
                className="pcCfgInput"
                placeholder="Buscar usuário, módulo, ação ou texto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="pcCfgInput"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="">Todos módulos</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pcCardBody">
            {filteredLogs.length === 0 ? (
              <div className="pcCfgEmpty">Nenhum registro encontrado.</div>
            ) : (
              <div className="pcLogsTable">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="pcLogsRow">
                    <div className="pcLogsUser">
                      <strong>{log.user}</strong>
                      <span className="pcLogsIP">{log.ip}</span>
                    </div>

                    <div className="pcLogsModule">{log.module}</div>

                    <div className="pcLogsAction">
                      <strong>{log.action}</strong>
                      <div className="pcLogsDesc">{log.description}</div>
                    </div>

                    <div className="pcLogsDate">{formatDate(log.date)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
// fim: front/src/pages/app/configuracoes/registros/Registros.jsx