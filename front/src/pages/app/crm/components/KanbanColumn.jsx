// caminho: front/src/pages/app/crm/components/KanbanColumn.jsx
import { memo, useMemo } from 'react'
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  defaultAnimateLayoutChanges
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import KanbanCard from './KanbanCard'

const animateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({
    ...args,
    wasDragging: true
  })

function KanbanColumnComponent({
  column,
  bodyDropId,
  draggingCardId,
  overId,
  isColumnOverlayActive
}) {
  const cardIds = useMemo(() => column.cards.map((c) => c.id), [column.cards])

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    animateLayoutChanges,
    transition: {
      duration: 220,
      easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)'
    }
  })

  const { setNodeRef: setBodyRef, isOver } = useDroppable({ id: bodyDropId })

  const hasTransform = !!transform

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnOverlayActive ? 0 : isDragging ? 0.9 : 1,
    willChange: hasTransform || isDragging ? 'transform' : undefined,
    backfaceVisibility: hasTransform || isDragging ? 'hidden' : undefined,
    WebkitBackfaceVisibility: hasTransform || isDragging ? 'hidden' : undefined,
    transformStyle: hasTransform || isDragging ? 'preserve-3d' : undefined
  }

  const showBodyHighlight = draggingCardId && (isOver || overId === bodyDropId)
  const showEmptyDropPlaceholder = draggingCardId && column.cards.length === 0 && showBodyHighlight

  function onColumnPointerDown(e) {
    if (e.button !== 0) return

    const el = e.target
    if (el?.closest?.('.pcCrmCard')) return
    if (el?.closest?.('button, a, input, textarea, select, label')) return

    listeners?.onPointerDown?.(e)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="pcCrmCol"
      {...attributes}
      onPointerDown={onColumnPointerDown}
    >
      <div className="pcCrmColTopbar" style={{ background: column.color || '#111111' }} />

      <div className="pcCrmColHeader">
        <div className="pcCrmColTitle">
          <strong title={column.title}>{column.title}</strong>
        </div>

        <div className="pcCrmColHeaderRight">
          <span className="pcCrmColBadge">{column.cards.length}</span>

          <button
            type="button"
            className="pcCrmDots"
            aria-label="Menu da coluna"
            title="Menu"
            onPointerDown={(e) => e.stopPropagation()}
          >
            ⋮
          </button>
        </div>
      </div>

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div ref={setBodyRef} className={`pcCrmColBody ${showBodyHighlight ? 'is-over' : ''}`}>
          {column.cards.length === 0 && !draggingCardId && (
            <div className="pcCrmEmpty">Nenhum card nesta coluna.</div>
          )}

          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} onOpenDetails={column.onOpenDetails} />
          ))}

          {showEmptyDropPlaceholder && <div className="pcCrmDropPlaceholder" />}
        </div>
      </SortableContext>
    </div>
  )
}

export default memo(
  KanbanColumnComponent,
  (prev, next) => {
    return (
      prev.column === next.column &&
      prev.draggingCardId === next.draggingCardId &&
      prev.overId === next.overId &&
      prev.isColumnOverlayActive === next.isColumnOverlayActive &&
      prev.bodyDropId === next.bodyDropId
    )
  }
)
// fim: front/src/pages/app/crm/components/KanbanColumn.jsx