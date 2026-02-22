// caminho: front/src/pages/app/crm/components/KanbanBoard.jsx
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'

import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'

import KanbanColumn from './KanbanColumn'

const dropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.65' }
    }
  })
}

const OVERLAY_MAX_CARDS = 8

const OverlayStaticCard = memo(function OverlayStaticCard({ card }) {
  const shortId = String(card.id || '').replace(/^c-/, '')
  return (
    <div className="pcCrmCard pcCrmCardOverlay">
      <div className="pcCrmCardTop">
        <div className="pcCrmCardTitleWrap">
          <div className="pcCrmCardTitle">{card.title}</div>
          <div className="pcCrmCardSub">{card.subtitle || ''}</div>
        </div>

        <div className="pcCrmCardRight">
          <span className="pcCrmCardId">#{shortId || '1'}</span>
          <button type="button" className="pcCrmDots">
            ⋮
          </button>
        </div>
      </div>
    </div>
  )
})

export default function KanbanBoard({ columns, setColumns, onCardMoved }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }
    })
  )

  const [activeItem, setActiveItem] = useState(null)
  const [overId, setOverId] = useState(null)

  const overIdRef = useRef(null)
  const rafRef = useRef(0)

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns])

  const findColumnByCard = useCallback(
    (cardId) =>
      columns.find((col) => col.cards.some((card) => card.id === cardId)),
    [columns]
  )

  const bodyId = useCallback((colId) => `col:${colId}:body`, [])
  const isBodyDropzone = useCallback(
    (id) =>
      typeof id === 'string' && id.startsWith('col:') && id.endsWith(':body'),
    []
  )

  const bodyToColId = useCallback(
    (id) => {
      if (!isBodyDropzone(id)) return null
      return id.slice(4, -5)
    },
    [isBodyDropzone]
  )

  const clearRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const handleDragStart = useCallback(
    (event) => {
      const { active } = event
      const id = active.id

      clearRaf()
      overIdRef.current = null
      setOverId(null)
      document.body.style.cursor = 'grabbing'

      if (columnIds.includes(id)) {
        const col = columns.find((c) => c.id === id)
        setActiveItem({ type: 'column', data: col })
        return
      }

      const col = findColumnByCard(id)
      if (!col) return

      const card = col.cards.find((c) => c.id === id)
      setActiveItem({ type: 'card', data: card })
    },
    [clearRaf, columnIds, columns, findColumnByCard]
  )

  const handleDragOver = useCallback(
    (event) => {
      const next = event?.over?.id ?? null
      if (overIdRef.current === next) return
      overIdRef.current = next

      clearRaf()
      rafRef.current = requestAnimationFrame(() => {
        setOverId(overIdRef.current)
      })
    },
    [clearRaf]
  )

  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    overIdRef.current = null
    setOverId(null)
    clearRaf()
    document.body.style.cursor = ''
  }, [clearRaf])

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event

      setActiveItem(null)
      overIdRef.current = null
      setOverId(null)
      clearRaf()
      document.body.style.cursor = ''

      if (!over) return

      const activeId = active.id
      const rawOverId = over.id

      if (columnIds.includes(activeId)) {
        const oldIndex = columnIds.indexOf(activeId)
        const newIndex = columnIds.indexOf(rawOverId)
        if (oldIndex !== newIndex) {
          setColumns((prev) => arrayMove(prev, oldIndex, newIndex))
        }
        return
      }

      const activeColumn = findColumnByCard(activeId)
      if (!activeColumn) return

      const overColIdFromBody = bodyToColId(rawOverId)
      const overColumn =
        (overColIdFromBody
          ? columns.find((c) => c.id === overColIdFromBody)
          : null) ||
        columns.find((c) => c.id === rawOverId) ||
        findColumnByCard(rawOverId)

      if (!overColumn) return

      // mesmo col
      if (activeColumn.id === overColumn.id) {
        const oldIndex = activeColumn.cards.findIndex((c) => c.id === activeId)
        const newIndex = overColIdFromBody
          ? activeColumn.cards.length - 1
          : overColumn.cards.findIndex((c) => c.id === rawOverId)

        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
          const updatedCards = arrayMove(activeColumn.cards, oldIndex, newIndex)
          setColumns((prev) =>
            prev.map((col) =>
              col.id === activeColumn.id ? { ...col, cards: updatedCards } : col
            )
          )
        }
        return
      }

      // move col -> col
      const activeCard = activeColumn.cards.find((c) => c.id === activeId)
      if (!activeCard) return

      const fromColId = activeColumn.id
      const toColId = overColumn.id

      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === activeColumn.id) {
            return { ...col, cards: col.cards.filter((c) => c.id !== activeId) }
          }

          if (col.id === overColumn.id) {
            if (overColIdFromBody) {
              return { ...col, cards: [...col.cards, activeCard] }
            }

            const idx = col.cards.findIndex((c) => c.id === rawOverId)
            if (idx >= 0) {
              const next = [...col.cards]
              next.splice(idx, 0, activeCard)
              return { ...col, cards: next }
            }

            return { ...col, cards: [...col.cards, activeCard] }
          }

          return col
        })
      )

      // ✅ callback opcional para registrar log
      onCardMoved?.({
        cardId: activeCard.id,
        fromColumnId: fromColId,
        toColumnId: toColId
      })
    },
    [bodyToColId, clearRaf, columnIds, columns, findColumnByCard, onCardMoved, setColumns]
  )

  const draggingCardId =
    activeItem?.type === 'card' ? activeItem.data?.id : null

  const overlayColumn =
    activeItem?.type === 'column'
      ? columns.find((c) => c.id === activeItem.data?.id) || activeItem.data
      : null

  const overlayCards = useMemo(() => {
    const cards = overlayColumn?.cards || []
    const list = cards.slice(0, OVERLAY_MAX_CARDS)
    return { list, rest: Math.max(0, cards.length - list.length) }
  }, [overlayColumn?.id, overlayColumn?.cards])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="pcCrmBoard">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              bodyDropId={bodyId(column.id)}
              draggingCardId={draggingCardId}
              overId={overId}
              isColumnOverlayActive={
                activeItem?.type === 'column' && activeItem.data?.id === column.id
              }
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={dropAnimation} zIndex={99999} adjustScale={false}>
        <div
          style={{
            pointerEvents: 'none',
            transformOrigin: 'top left',
            isolation: 'isolate'
          }}
        >
          {activeItem?.type === 'card' && <OverlayStaticCard card={activeItem.data} />}

          {activeItem?.type === 'column' && overlayColumn && (
            <div
              className="pcCrmCol pcCrmColOverlay"
              style={{
                opacity: 0.98,
                boxShadow: '0 18px 48px rgba(0,0,0,0.20)',
                cursor: 'grabbing'
              }}
            >
              <div
                className="pcCrmColTopbar"
                style={{ background: overlayColumn.color || '#111111' }}
              />

              <div className="pcCrmColHeader">
                <div className="pcCrmColTitle">
                  <strong>{overlayColumn.title}</strong>
                </div>

                <div className="pcCrmColHeaderRight">
                  <span className="pcCrmColBadge">{overlayColumn.cards?.length ?? 0}</span>
                  <button type="button" className="pcCrmDots">
                    ⋮
                  </button>
                </div>
              </div>

              <div className="pcCrmColBody">
                {overlayCards.list.map((card) => (
                  <OverlayStaticCard key={card.id} card={card} />
                ))}
                {overlayCards.rest > 0 && <div className="pcCrmEmpty">+{overlayCards.rest} card(s)…</div>}
              </div>
            </div>
          )}
        </div>
      </DragOverlay>
    </DndContext>
  )
}
// fim: front/src/pages/app/crm/components/KanbanBoard.jsx