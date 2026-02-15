// caminho: front/src/pages/app/crm/CRM.jsx
import './crm.css'

export default function CRM() {
  return (
    <div className="pcPage">

      <div className="pcPageHeader">
        <h1>CRM Kanban</h1>
        <p>Gestão de oportunidades e funil de vendas</p>
      </div>

      <div className="pcBlock">
        <div className="pcCard">
          <div className="pcCardHeader">
            <h3>Quadro de Negócios</h3>
          </div>

          <div className="pcCardBody">
            <div className="pcKanban">

              <div className="pcKanbanColumn">
                <div className="pcKanbanColumnHeader">Novos Leads</div>
                <div className="pcKanbanEmpty">Nenhum lead</div>
              </div>

              <div className="pcKanbanColumn">
                <div className="pcKanbanColumnHeader">Em Atendimento</div>
                <div className="pcKanbanEmpty">Nenhum negócio</div>
              </div>

              <div className="pcKanbanColumn">
                <div className="pcKanbanColumnHeader">Proposta Enviada</div>
                <div className="pcKanbanEmpty">Nenhuma proposta</div>
              </div>

              <div className="pcKanbanColumn">
                <div className="pcKanbanColumnHeader">Fechado</div>
                <div className="pcKanbanEmpty">Nenhuma venda</div>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
// fim: front/src/pages/app/crm/CRM.jsx
