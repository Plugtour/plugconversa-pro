// caminho: front/src/pages/app/crm/components/KanbanCard.jsx
import { memo, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function KanbanCardComponent({ card, onOpenDetails }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id
  })

  const hasTransform = !!transform

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: 1,
      cursor: isDragging ? 'grabbing' : 'grab',
      willChange: hasTransform || isDragging ? 'transform' : undefined,
      backfaceVisibility: hasTransform || isDragging ? 'hidden' : undefined,
      WebkitBackfaceVisibility: hasTransform || isDragging ? 'hidden' : undefined,
      transformStyle: hasTransform || isDragging ? 'preserve-3d' : undefined
    }),
    [hasTransform, transform, transition, isDragging]
  )

  const shortId = useMemo(() => String(card.id || '').replace(/^c-/, ''), [card.id])

  const tagsPreview = useMemo(() => {
    const names = Array.isArray(card.tagNames) ? card.tagNames : []
    if (names.length === 0) return ''
    const first = names.slice(0, 2).join(', ')
    const rest = Math.max(0, names.length - 2)
    return rest > 0 ? `${first} +${rest}` : first
  }, [card.tagNames])

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
          {!!tagsPreview && <div className="pcCrmCardSub">{tagsPreview}</div>}
        </div>

        <div className="pcCrmCardRight">
          <span className="pcCrmCardId">#{shortId || '1'}</span>
          <button
            type="button"
            className="pcCrmDots"
            aria-label="Menu do card"
            title="Detalhes"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetails?.(card)
            }}
          >
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
        prev.card?.subtitle === next.card?.subtitle &&
        String(prev.card?.tagNames || '') === String(next.card?.tagNames || '') &&
        prev.onOpenDetails === next.onOpenDetails)
    )
  }
)
// fim: front/src/pages/app/crm/components/KanbanCard.jsx