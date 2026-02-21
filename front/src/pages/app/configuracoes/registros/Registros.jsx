// caminho: front/src/pages/app/configuracoes/registros/Registros.jsx
import { useMemo, useState } from 'react'
import './registros.css'

function formatDate(d) {
  const dt = new Date(d)
  return dt.toLocaleString()
}

export default function Registros() {
  const [logs] = useState([
    {
      id: 1,
      user: 'Marcelo',
      module: 'CRM',
      action: 'Criou negócio',
      description: 'Novo negócio criado na coluna Leads',
      date: new Date(),
      ip: '192.168.0.10'
    },
    {
      id: 2,
      user: 'Atendente 01',
      module: 'Campanhas',
      action: 'Enviou campanha',
      description: 'Campanha Black Friday enviada',
      date: new Date(),
      ip: '192.168.0.12'
    }
  ])

  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search ||
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.module.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase())

      const matchModule =
        !moduleFilter || log.module === moduleFilter

      return matchSearch && matchModule
    })
  }, [logs, search, moduleFilter])

  const modules = [...new Set(logs.map((l) => l.module))]

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
                placeholder="Buscar usuário, módulo ou ação..."
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
              <div className="pcCfgEmpty">
                Nenhum registro encontrado.
              </div>
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
                      <div className="pcLogsDesc">
                        {log.description}
                      </div>
                    </div>

                    <div className="pcLogsDate">
                      {formatDate(log.date)}
                    </div>
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