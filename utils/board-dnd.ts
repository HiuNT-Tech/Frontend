/**
 * Logic thuần cho kéo-thả trên board (không dính React): quy ước id của
 * dnd-kit, index tra cứu cột/thẻ, di chuyển thẻ trong/giữa cột và sensor
 * tuỳ biến. Component `BoardContent` chỉ còn lo state và sự kiện.
 */
import {
  MouseSensor as DndKitMouseSensor,
  TouchSensor as DndKitTouchSensor,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import type {
  Card as CardType,
  Column as ColumnType,
  EntityId,
} from '@/config/interface';
import { sortByPosition, withSequentialPositions } from '@/utils/sorts';

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------

/**
 * Block DnD event propagation
 * if element (or its parents) has `data-no-dnd`
 */
const handler = ({
  nativeEvent,
}: {
  nativeEvent: MouseEvent | TouchEvent;
}): boolean => {
  let cur = nativeEvent.target as HTMLElement | null;

  while (cur) {
    if (cur.dataset?.noDnd !== undefined) {
      return false;
    }
    cur = cur.parentElement;
  }

  return true;
};

export class MouseSensor extends DndKitMouseSensor {
  static activators = [
    {
      eventName: 'onMouseDown' as const,
      handler,
    },
  ];
}

export class TouchSensor extends DndKitTouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler,
    },
  ];
}

// ---------------------------------------------------------------------------
// Id của dnd-kit
// ---------------------------------------------------------------------------

export const CARD_LIST_ID_PREFIX = 'cards-';
export const COLUMN_ID_PREFIX = 'column-';

export const toPositiveEntityId = (
  value?: UniqueIdentifier | string | number | null
): EntityId | undefined => {
  if (value === undefined || value === null || value === '') return undefined;

  const id = typeof value === 'number' ? value : Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
};

export const isCardListDroppableId = (id: UniqueIdentifier): boolean =>
  id.toString().startsWith(CARD_LIST_ID_PREFIX);

export const isColumnDroppableId = (id: UniqueIdentifier): boolean =>
  id.toString().startsWith(COLUMN_ID_PREFIX);

// Helper to resolve a dnd-kit UniqueIdentifier to the real column EntityId
export const resolveColumnId = (id: UniqueIdentifier): EntityId | undefined => {
  const str = id.toString();
  if (str.startsWith(COLUMN_ID_PREFIX)) {
    return toPositiveEntityId(str.replace(COLUMN_ID_PREFIX, ''));
  }
  return undefined;
};

export const resolveCardListColumnId = (
  id: UniqueIdentifier
): EntityId | undefined => {
  const str = id.toString();
  if (str.startsWith(CARD_LIST_ID_PREFIX)) {
    return toPositiveEntityId(str.replace(CARD_LIST_ID_PREFIX, ''));
  }
  return undefined;
};

export const isRealCard = (card: CardType): boolean => !card.FE_PlaceholderCard;

export const normalizeColumnsForDnd = (columns: ColumnType[]): ColumnType[] => {
  return sortByPosition(columns).map(column => ({
    ...column,
    cards: sortByPosition(column.cards?.filter(isRealCard) || []),
  }));
};

export const buildDndIndexes = (columns: ColumnType[]) => {
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

export const haveSameCardPlacement = (
  currentCards: CardType[],
  nextCards: CardType[]
): boolean => {
  if (currentCards.length !== nextCards.length) return false;

  return currentCards.every((card, index) => {
    const nextCard = nextCards[index];
    return card.id === nextCard?.id && card.columnId === nextCard.columnId;
  });
};

export const hasSameBoardPlacement = (
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

export interface MoveCardAcrossColumnsArgs {
  columns: ColumnType[];
  overColumnId: EntityId;
  overCardId: UniqueIdentifier;
  active: DragOverEvent['active'] | DragEndEvent['active'];
  over: DragOverEvent['over'] | DragEndEvent['over'];
  activeCardId: EntityId;
  activeCard: CardType;
}

export const moveCardAcrossColumns = ({
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

export interface ReorderCardWithinColumnArgs {
  columns: ColumnType[];
  columnId: EntityId;
  activeCardId: EntityId;
  overCardId: UniqueIdentifier;
}

// Sắp xếp lại card trong MỘT cột theo đúng ngữ nghĩa mà dnd-kit sortable đang
// preview trong lúc kéo: card active nhảy tới vị trí của card đang được over
// (arrayMove(activeIndex, overIndex)). Nếu `over` không phải là card (vd.
// droppable "cards-<id>") thì sortable cũng không dịch chuyển gì → giữ nguyên.
export const reorderCardWithinColumn = ({
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
export const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD',
} as const;

export type DragItemType =
  | (typeof ACTIVE_DRAG_ITEM_TYPE)[keyof typeof ACTIVE_DRAG_ITEM_TYPE]
  | null;

/** Id sortable của cột (`column-<id>`). */
export const toColumnDndId = (columnId: EntityId): string =>
  `${COLUMN_ID_PREFIX}${columnId}`;

/** Id droppable của danh sách thẻ trong cột (`cards-<id>`), tránh trùng id cột. */
export const toCardListDndId = (columnId: EntityId): string =>
  `${CARD_LIST_ID_PREFIX}${columnId}`;
