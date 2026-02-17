// caminho: front/src/pages/app/crm/components/KanbanCard.jsx
import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function KanbanCardComponent({ card }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id
  })

  const hasTransform = !!transform

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,

      // ✅ não reduzir opacidade do card real (isso costuma causar “apagão” em irmãos no Chrome)
      opacity: 1,

      cursor: isDragging ? 'grabbing' : 'grab',

      // ✅ não deixar willChange permanente
      willChange: hasTransform || isDragging ? 'transform' : undefined,

      // ✅ estabiliza renderização durante drag/transform (sem forçar layer o tempo todo)
      backfaceVisibility: hasTransform || isDragging ? 'hidden' : undefined,
      WebkitBackfaceVisibility: hasTransform || isDragging ? 'hidden' : undefined,
      transformStyle: hasTransform || isDragging ? 'preserve-3d' : undefined
    }),
    [hasTransform, transform, transition, isDragging]
  )

  const shortId = useMemo(() => String(card.id || '').replace(/^c-/, ''), [card.id])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pcCrmCard ${isDragging ? 'pcCrmCardOverlay' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="pcCrmCardTop">
        <div className="pcCrmCardTitleWrap">
          <div className="pcCrmCardTitle">{card.title}</div>
          <div className="pcCrmCardSub">{card.subtitle || ''}</div>
        </div>

        <div className="pcCrmCardRight">
          <span className="pcCrmCardId">#{shortId || '1'}</span>
          <button type="button" className="pcCrmDots" aria-label="Menu do card" title="Menu">
            ⋮
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(
  KanbanCardComponent,
  (prev, next) => {
    return (
      prev.card === next.card ||
      (prev.card?.id === next.card?.id &&
        prev.card?.title === next.card?.title &&
        prev.card?.subtitle === next.card?.subtitle)
    )
  }
)
// fim: front/src/pages/app/crm/components/KanbanCard.jsx
