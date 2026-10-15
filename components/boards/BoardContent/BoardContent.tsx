'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  closestCorners,
  pointerWithin,
  getFirstCollision,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { MouseSensor, TouchSensor } from '@/customLibraries/DndKitSensors';
import BoardFilters, { type BoardFilterValue } from './BoardFilters';
import ListColumns from './ListColumns/ListColumns';
import { ColumnPreview } from './ListColumns/Column/Column';
import { CardPreview } from './ListColumns/Column/ListCards/Card/Card';
import type {
  Board,
  Column as ColumnType,
  Card as CardType,
  EntityId,
} from '@/config/interface';
import { sortByPosition, withSequentialPositions } from '@/utils/sorts';
import { useBoardRole } from '@/hooks/use-board-role';

const CARD_LIST_ID_PREFIX = 'cards-';
const COLUMN_ID_PREFIX = 'column-';

const toPositiveEntityId = (
  value?: UniqueIdentifier | string | number | null
): EntityId | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const id = typeof value === 'number' ? value : Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const isCardListDroppableId = (id: UniqueIdentifier): boolean =>
  id.toString().startsWith(CARD_LIST_ID_PREFIX);

const isColumnDroppableId = (id: UniqueIdentifier): boolean =>
  id.toString().startsWith(COLUMN_ID_PREFIX);

// Helper to resolve a dnd-kit UniqueIdentifier to the real column EntityId
const resolveColumnId = (id: UniqueIdentifier): EntityId | undefined => {
  const str = id.toString();
  if (str.startsWith(COLUMN_ID_PREFIX)) {
    return toPositiveEntityId(str.replace(COLUMN_ID_PREFIX, ''));
  }
  return undefined;
};

const resolveCardListColumnId = (
  id: UniqueIdentifier
): EntityId | undefined => {
  const str = id.toString();
  if (str.startsWith(CARD_LIST_ID_PREFIX)) {
    return toPositiveEntityId(str.replace(CARD_LIST_ID_PREFIX, ''));
  }
  return undefined;
};

const isRealCard = (card: CardType): boolean => !card.FE_PlaceholderCard;

const normalizeColumnsForDnd = (columns: ColumnType[]): ColumnType[] => {
  return sortByPosition(columns).map(column => ({
    ...column,
    cards: sortByPosition(column.cards?.filter(isRealCard) || []),
  }));
};

const buildDndIndexes = (columns: ColumnType[]) => {
  const columnById = new Map<EntityId, ColumnType>();
  const columnByCardId = new Map<EntityId, ColumnType>();
  const cardIdsByColumnId = new Map<EntityId, Set<EntityId>>();

  for (const column of columns) {
    columnById.set(column.id, column);

    const cardIds = new Set<EntityId>();
    for (const card of column.cards) {
      if (!isRealCard(card)) continue;

      cardIds.add(card.id);
      columnByCardId.set(card.id, column);
    }

    cardIdsByColumnId.set(column.id, cardIds);
  }

  return { columnById, columnByCardId, cardIdsByColumnId };
};

const haveSameCardPlacement = (
  currentCards: CardType[],
  nextCards: CardType[]
): boolean => {
  if (currentCards.length !== nextCards.length) return false;

  return currentCards.every((card, index) => {
    const nextCard = nextCards[index];
    return card.id === nextCard?.id && card.columnId === nextCard.columnId;
  });
};

const hasSameBoardPlacement = (
  currentColumns: ColumnType[],
  nextColumns: ColumnType[]
): boolean => {
  if (currentColumns.length !== nextColumns.length) return false;

  return currentColumns.every((column, index) => {
    const nextColumn = nextColumns[index];
    return (
      column.id === nextColumn?.id &&
      haveSameCardPlacement(column.cards, nextColumn.cards)
    );
  });
};

interface MoveCardAcrossColumnsArgs {
  columns: ColumnType[];
  overColumnId: EntityId;
  overCardId: UniqueIdentifier;
  active: DragOverEvent['active'] | DragEndEvent['active'];
  over: DragOverEvent['over'] | DragEndEvent['over'];
  activeCardId: EntityId;
  activeCard: CardType;
}

const moveCardAcrossColumns = ({
  columns,
  overColumnId,
  overCardId,
  active,
  over,
  activeCardId,
  activeCard,
}: MoveCardAcrossColumnsArgs): ColumnType[] => {
  const currentTargetColumn = columns.find(
    column => column.id === overColumnId
  );
  const activeIndexInTarget =
    currentTargetColumn?.cards
      .filter(isRealCard)
      .findIndex(card => card.id === activeCardId) ?? -1;
  const columnsWithoutActiveCard = columns.map(column => {
    const realCards = column.cards.filter(isRealCard);
    const nextCards = realCards.filter(card => card.id !== activeCardId);

    if (
      nextCards.length === realCards.length &&
      realCards.length === column.cards.length
    ) {
      return column;
    }

    return {
      ...column,
      cards: withSequentialPositions(nextCards),
    };
  });

  const targetColumn = columnsWithoutActiveCard.find(
    column => column.id === overColumnId
  );

  if (!targetColumn) return columns;

  const overCardEntityId = toPositiveEntityId(overCardId);
  const isOverActiveCard = overCardEntityId === activeCardId;
  const overCardIndex =
    overCardEntityId && isOverActiveCard
      ? activeIndexInTarget
      : overCardEntityId
        ? targetColumn.cards.findIndex(card => card.id === overCardEntityId)
        : -1;
  const isBelowOverItem = Boolean(
    active.rect.current.translated &&
    over &&
    active.rect.current.translated.top > over.rect.top + over.rect.height
  );
  const modifier = isBelowOverItem && !isOverActiveCard ? 1 : 0;
  const newCardIndex =
    overCardIndex >= 0
      ? Math.min(overCardIndex + modifier, targetColumn.cards.length)
      : targetColumn.cards.length;
  const movedCard: CardType = {
    ...activeCard,
    id: activeCardId,
    columnId: overColumnId,
  };
  const targetCards = withSequentialPositions(
    targetColumn.cards.toSpliced(newCardIndex, 0, movedCard)
  );
  const nextColumns = columnsWithoutActiveCard.map(column =>
    column.id === overColumnId ? { ...column, cards: targetCards } : column
  );

  return hasSameBoardPlacement(columns, nextColumns) ? columns : nextColumns;
};

interface ReorderCardWithinColumnArgs {
  columns: ColumnType[];
  columnId: EntityId;
  activeCardId: EntityId;
  overCardId: UniqueIdentifier;
}

// Sắp xếp lại card trong MỘT cột theo đúng ngữ nghĩa mà dnd-kit sortable đang
// preview trong lúc kéo: card active nhảy tới vị trí của card đang được over
// (arrayMove(activeIndex, overIndex)). Nếu `over` không phải là card (vd.
// droppable "cards-<id>") thì sortable cũng không dịch chuyển gì → giữ nguyên.
const reorderCardWithinColumn = ({
  columns,
  columnId,
  activeCardId,
  overCardId,
}: ReorderCardWithinColumnArgs): ColumnType[] => {
  const column = columns.find(item => item.id === columnId);
  if (!column) return columns;

  const realCards = column.cards.filter(isRealCard);
  const oldCardIndex = realCards.findIndex(card => card.id === activeCardId);
  const overCardEntityId = toPositiveEntityId(overCardId);
  const newCardIndex = overCardEntityId
    ? realCards.findIndex(card => card.id === overCardEntityId)
    : -1;

  if (oldCardIndex < 0 || newCardIndex < 0 || oldCardIndex === newCardIndex) {
    return columns;
  }

  const reorderedCards = withSequentialPositions(
    arrayMove(realCards, oldCardIndex, newCardIndex)
  );

  return columns.map(item =>
    item.id === columnId ? { ...item, cards: reorderedCards } : item
  );
};

// Drag item type constants
const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD',
} as const;

type DragItemType =
  | (typeof ACTIVE_DRAG_ITEM_TYPE)[keyof typeof ACTIVE_DRAG_ITEM_TYPE]
  | null;

interface BoardContentProps {
  board: Board;
  filters: BoardFilterValue;
  onFiltersChange: (value: BoardFilterValue) => void;
  totalCards: number;
  moveColumns?: (columns: ColumnType[]) => void;
  moveCardInTheSameColumn?: (cards: CardType[], columnId: EntityId) => void;
  moveCardToDifferentColumn?: (
    cardId: EntityId,
    oldColumnId: EntityId,
    newColumnId: EntityId,
    columns: ColumnType[]
  ) => void;
}

function BoardContent({
  board,
  filters,
  onFiltersChange,
  totalCards,
  moveColumns,
  moveCardInTheSameColumn,
  moveCardToDifferentColumn,
}: BoardContentProps) {
  // Sensors configuration
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 10 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 500 },
  });
  const allSensors = useSensors(mouseSensor, touchSensor);
  // GUEST chỉ đọc → không cho kéo-thả card/column (BE cũng chỉ cho Contributor
  // move card). Truyền mảng sensor rỗng để vô hiệu hoá drag.
  const { isContributor } = useBoardRole(board?.id);
  const sensors = isContributor ? allSensors : [];

  const [orderedColumns, setOrderedColumns] = useState<ColumnType[]>([]);
  const [activeDragItemType, setActiveDragItemType] =
    useState<DragItemType>(null);
  const [activeDragItemData, setActiveDragItemData] = useState<
    ColumnType | CardType | null
  >(null);
  const [oldColumnWhenDraggingCard, setOldColumnWhenDraggingCard] =
    useState<ColumnType | null>(null);

  const lastOverId = useRef<UniqueIdentifier | null>(null);

  useEffect(() => {
    setOrderedColumns(normalizeColumnsForDnd(board.columns));
  }, [board]);

  const dndIndexes = useMemo(
    () => buildDndIndexes(orderedColumns),
    [orderedColumns]
  );

  // Cards are filtered on the server, so the columns we render already reflect
  // the active filters. The visible count is simply what's currently loaded.
  const visibleCardCount = useMemo(
    () =>
      orderedColumns.reduce(
        (total, column) => total + column.cards.filter(isRealCard).length,
        0
      ),
    [orderedColumns]
  );

  const findOrderedColumnByCardId = useCallback(
    (cardId: UniqueIdentifier): ColumnType | undefined => {
      const realCardId = toPositiveEntityId(cardId);
      return realCardId ? dndIndexes.columnByCardId.get(realCardId) : undefined;
    },
    [dndIndexes]
  );

  const findOrderedColumnByDroppableId = useCallback(
    (id: UniqueIdentifier): ColumnType | undefined => {
      const columnByCard = findOrderedColumnByCardId(id);
      if (columnByCard) return columnByCard;

      const cardListColumnId = resolveCardListColumnId(id);
      if (cardListColumnId) return dndIndexes.columnById.get(cardListColumnId);

      const sortableColumnId = resolveColumnId(id);
      if (sortableColumnId) return dndIndexes.columnById.get(sortableColumnId);

      const rawColumnId = toPositiveEntityId(id);
      return rawColumnId ? dndIndexes.columnById.get(rawColumnId) : undefined;
    },
    [dndIndexes, findOrderedColumnByCardId]
  );

  const resetDragState = useCallback(() => {
    lastOverId.current = null;
    setActiveDragItemType(null);
    setActiveDragItemData(null);
    setOldColumnWhenDraggingCard(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      lastOverId.current = null;

      setActiveDragItemType(
        event?.active?.data?.current?.columnId
          ? ACTIVE_DRAG_ITEM_TYPE.CARD
          : ACTIVE_DRAG_ITEM_TYPE.COLUMN
      );
      setActiveDragItemData(
        event?.active?.data?.current as ColumnType | CardType
      );

      if (event?.active?.data?.current?.columnId) {
        setOldColumnWhenDraggingCard(
          findOrderedColumnByCardId(event?.active?.id) || null
        );
      }
    },
    [findOrderedColumnByCardId]
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return;

      const { active, over } = event;

      if (!active || !over) return;

      const {
        id: activeDraggingCardId,
        data: { current: activeDraggingCardData },
      } = active;
      const { id: overCardId } = over;
      const activeCardId = toPositiveEntityId(activeDraggingCardId);

      const activeColumn = findOrderedColumnByCardId(activeDraggingCardId);
      const overColumn = findOrderedColumnByDroppableId(overCardId);

      if (
        !activeCardId ||
        !activeDraggingCardData ||
        !activeColumn ||
        !overColumn
      ) {
        return;
      }

      if (activeColumn.id !== overColumn.id) {
        setOrderedColumns(prevColumns =>
          moveCardAcrossColumns({
            columns: prevColumns,
            overColumnId: overColumn.id,
            overCardId,
            active,
            over,
            activeCardId,
            activeCard: activeDraggingCardData as CardType,
          })
        );
      }
    },
    [
      activeDragItemType,
      findOrderedColumnByCardId,
      findOrderedColumnByDroppableId,
    ]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!active || !over) {
        resetDragState();
        return;
      }

      try {
        // Handle card drag and drop
        if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
          const {
            id: activeDraggingCardId,
            data: { current: activeDraggingCardData },
          } = active;
          const { id: overCardId } = over;

          const activeCardId = toPositiveEntityId(activeDraggingCardId);
          // Cột HIỆN TẠI đang chứa card trong `orderedColumns` (handleDragOver
          // đã di chuyển card sang cột đích ngay khi con trỏ đi vào cột đó),
          // khác với `oldColumnWhenDraggingCard` là cột lúc bắt đầu kéo.
          const activeColumn = findOrderedColumnByCardId(activeDraggingCardId);
          const overColumn = findOrderedColumnByDroppableId(overCardId);
          const oldColumn = oldColumnWhenDraggingCard;

          if (
            !activeCardId ||
            !activeDraggingCardData ||
            !activeColumn ||
            !overColumn ||
            !oldColumn
          ) {
            return;
          }

          // Nếu card đã nằm trong cột được thả (trường hợp thường gặp, kể cả khi
          // kéo sang cột khác vì handleDragOver đã chèn sẵn), dnd-kit đang
          // preview thứ tự bằng arrayMove(activeIndex, overIndex) → commit đúng
          // như preview. Không được chạy lại moveCardAcrossColumns ở đây: nó
          // chèn theo toạ độ overlay so với rect của card over (đã bị đẩy xuống
          // vì card active được chèn phía trên), khiến card bị "tụt" lên vị trí
          // gần cuối khi thả vào cuối cột khác.
          const nextColumns =
            activeColumn.id !== overColumn.id
              ? moveCardAcrossColumns({
                  columns: orderedColumns,
                  overColumnId: overColumn.id,
                  overCardId,
                  active,
                  over,
                  activeCardId,
                  activeCard: activeDraggingCardData as CardType,
                })
              : reorderCardWithinColumn({
                  columns: orderedColumns,
                  columnId: overColumn.id,
                  activeCardId,
                  overCardId,
                });

          setOrderedColumns(nextColumns);

          if (oldColumn.id !== overColumn.id) {
            moveCardToDifferentColumn?.(
              activeCardId,
              oldColumn.id,
              overColumn.id,
              nextColumns
            );
          } else {
            // Card kết thúc ở đúng cột ban đầu (có thể đã đi qua cột khác rồi
            // quay lại). So với snapshot lúc bắt đầu kéo để biết thứ tự có thực
            // sự đổi không; chỉ gọi API khi có thay đổi.
            const originalCards = oldColumn.cards.filter(isRealCard);
            const finalCards =
              nextColumns
                .find(column => column.id === overColumn.id)
                ?.cards.filter(isRealCard) ?? [];

            if (!haveSameCardPlacement(originalCards, finalCards)) {
              moveCardInTheSameColumn?.(finalCards, oldColumn.id);
            }
          }
        }

        // Handle column drag and drop
        if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
          if (active.id !== over.id) {
            const activeColId = resolveColumnId(active.id);
            const overColId = resolveColumnId(over.id);
            if (!activeColId || !overColId) return;

            const oldColumnIndex = orderedColumns.findIndex(
              c => c.id === activeColId
            );
            const newColumnIndex = orderedColumns.findIndex(
              c => c.id === overColId
            );
            if (oldColumnIndex < 0 || newColumnIndex < 0) return;

            const dndOrderedColumns = arrayMove(
              orderedColumns,
              oldColumnIndex,
              newColumnIndex
            );
            const positionedColumns =
              withSequentialPositions(dndOrderedColumns);

            setOrderedColumns(positionedColumns);
            moveColumns?.(positionedColumns);
          }
        }
      } finally {
        resetDragState();
      }
    },
    [
      activeDragItemType,
      findOrderedColumnByCardId,
      findOrderedColumnByDroppableId,
      moveCardInTheSameColumn,
      moveCardToDifferentColumn,
      moveColumns,
      oldColumnWhenDraggingCard,
      orderedColumns,
      resetDragState,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setOrderedColumns(normalizeColumnsForDnd(board.columns));
    resetDragState();
  }, [board.columns, resetDragState]);

  // Drop animation config
  const customDropAnimation = useMemo<DropAnimation>(
    () => ({
      sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: '0.5' } },
      }),
    }),
    []
  );

  // Collision detection strategy
  const collisionDetectionStrategy = useCallback(
    (args: Parameters<typeof closestCorners>[0]) => {
      if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) {
        return closestCorners({ ...args });
      }

      const pointerIntersections = pointerWithin(args);

      if (!pointerIntersections?.length) {
        return lastOverId.current ? [{ id: lastOverId.current }] : [];
      }

      let overId = getFirstCollision(pointerIntersections, 'id');

      if (overId) {
        const isColumnTarget =
          isCardListDroppableId(overId) || isColumnDroppableId(overId);
        const checkColumn = isColumnTarget
          ? findOrderedColumnByDroppableId(overId)
          : undefined;

        if (checkColumn) {
          const checkColumnCardIds = dndIndexes.cardIdsByColumnId.get(
            checkColumn.id
          );
          const filteredContainers = args.droppableContainers.filter(
            container => {
              const cardId = toPositiveEntityId(container.id);

              return cardId !== undefined && checkColumnCardIds?.has(cardId);
            }
          );

          // If column has real cards, find closest. Otherwise keep droppable ID as target.
          if (filteredContainers.length > 0) {
            overId = closestCorners({
              ...args,
              droppableContainers: filteredContainers,
            })[0]?.id;
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeDragItemType, dndIndexes, findOrderedColumnByDroppableId]
  );

  return (
    <div className="animate-pop flex h-full min-h-0 w-full min-w-0 flex-col">
      <BoardFilters
        boardId={board.id}
        value={filters}
        totalCards={totalCards}
        visibleCards={visibleCardCount}
        onChange={onFiltersChange}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="min-h-0 min-w-0 flex-1">
          <ListColumns columns={orderedColumns} />
        </div>
        <DragOverlay dropAnimation={customDropAnimation}>
          {!activeDragItemType && null}
          {activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN && (
            <ColumnPreview column={activeDragItemData as ColumnType} />
          )}
          {activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD && (
            <CardPreview card={activeDragItemData as CardType} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default BoardContent;
