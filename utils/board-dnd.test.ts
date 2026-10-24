import { describe, expect, it } from 'vitest';

import type { Card, Column } from '@/config/interface';
import {
  moveCardAcrossColumns,
  normalizeColumnsForDnd,
  reorderCardWithinColumn,
  resolveCardListColumnId,
  restoreColumnPositions,
  resolveColumnId,
  toCardListDndId,
  toColumnDndId,
  toPositiveEntityId,
} from './board-dnd';

const card = (id: number, columnId: number, position = id): Card =>
  ({ id, columnId, position, subject: `Card ${id}` }) as unknown as Card;

const column = (id: number, cards: Card[], position = id): Column =>
  ({ id, position, cards, title: `Column ${id}` }) as unknown as Column;

const ids = (columns: Column[], columnId: number) =>
  columns.find(c => c.id === columnId)!.cards.map(c => c.id);

/** Rect giả cho `active`/`over`: chỉ cần `top`/`height` để tính "thả bên dưới". */
const dragRects = (activeTop: number, overTop: number, overHeight = 40) => ({
  active: { rect: { current: { translated: { top: activeTop } } } },
  over: { rect: { top: overTop, height: overHeight } },
});

describe('dnd ids', () => {
  it('round-trips column and card-list ids', () => {
    expect(resolveColumnId(toColumnDndId(7))).toBe(7);
    expect(resolveCardListColumnId(toCardListDndId(7))).toBe(7);
    expect(resolveColumnId(toCardListDndId(7))).toBeUndefined();
    expect(resolveCardListColumnId(toColumnDndId(7))).toBeUndefined();
  });

  it('only accepts positive integer entity ids', () => {
    expect(toPositiveEntityId('12')).toBe(12);
    expect(toPositiveEntityId(3)).toBe(3);
    expect(toPositiveEntityId('0')).toBeUndefined();
    expect(toPositiveEntityId('abc')).toBeUndefined();
    expect(toPositiveEntityId('')).toBeUndefined();
    expect(toPositiveEntityId(null)).toBeUndefined();
  });
});

describe('normalizeColumnsForDnd', () => {
  it('sorts columns and cards by position and drops placeholder cards', () => {
    const placeholder = {
      ...card(99, 1),
      FE_PlaceholderCard: true,
    } as Card;
    const columns = [
      column(2, [card(4, 2, 2), card(3, 2, 1)], 2),
      column(1, [placeholder, card(1, 1)], 1),
    ];

    const result = normalizeColumnsForDnd(columns);

    expect(result.map(c => c.id)).toEqual([1, 2]);
    expect(ids(result, 1)).toEqual([1]);
    expect(ids(result, 2)).toEqual([3, 4]);
  });
});

describe('reorderCardWithinColumn', () => {
  const columns = () => [
    column(1, [card(1, 1), card(2, 1), card(3, 1)]),
    column(2, [card(4, 2)]),
  ];

  it('moves the active card to the position of the over card', () => {
    const result = reorderCardWithinColumn({
      columns: columns(),
      columnId: 1,
      activeCardId: 1,
      overCardId: 3,
    });

    expect(ids(result, 1)).toEqual([2, 3, 1]);
    expect(result[0].cards.map(c => c.position)).toEqual([0, 1, 2]);
    expect(ids(result, 2)).toEqual([4]);
  });

  it('returns the same array when over is not a card or nothing changes', () => {
    const input = columns();

    expect(
      reorderCardWithinColumn({
        columns: input,
        columnId: 1,
        activeCardId: 1,
        overCardId: toCardListDndId(1),
      })
    ).toBe(input);
    expect(
      reorderCardWithinColumn({
        columns: input,
        columnId: 1,
        activeCardId: 2,
        overCardId: 2,
      })
    ).toBe(input);
  });
});

describe('moveCardAcrossColumns', () => {
  const columns = () => [
    column(1, [card(1, 1), card(2, 1)]),
    column(2, [card(3, 2), card(4, 2)]),
  ];

  it('inserts above the over card when dragging from above', () => {
    const result = moveCardAcrossColumns({
      columns: columns(),
      overColumnId: 2,
      overCardId: 4,
      activeCardId: 1,
      activeCard: card(1, 1),
      ...dragRects(0, 100),
    } as Parameters<typeof moveCardAcrossColumns>[0]);

    expect(ids(result, 1)).toEqual([2]);
    expect(ids(result, 2)).toEqual([3, 1, 4]);
    expect(result[1].cards[1].columnId).toBe(2);
    expect(result[1].cards.map(c => c.position)).toEqual([0, 1, 2]);
  });

  it('inserts below the over card when dragging from below', () => {
    const result = moveCardAcrossColumns({
      columns: columns(),
      overColumnId: 2,
      overCardId: 4,
      activeCardId: 1,
      activeCard: card(1, 1),
      ...dragRects(500, 100),
    } as Parameters<typeof moveCardAcrossColumns>[0]);

    expect(ids(result, 2)).toEqual([3, 4, 1]);
  });

  it('appends to the end when dropped on the empty card list', () => {
    const result = moveCardAcrossColumns({
      columns: [column(1, [card(1, 1)]), column(2, [])],
      overColumnId: 2,
      overCardId: toCardListDndId(2),
      activeCardId: 1,
      activeCard: card(1, 1),
      ...dragRects(0, 0),
    } as Parameters<typeof moveCardAcrossColumns>[0]);

    expect(ids(result, 1)).toEqual([]);
    expect(ids(result, 2)).toEqual([1]);
  });
});

describe('restoreColumnPositions', () => {
  const previous = () => [
    column(1, [card(1, 1)], 0),
    column(2, [card(2, 2)], 1),
    column(3, [], 2),
  ];

  it('puts columns back in their previous order and positions', () => {
    const moved = [
      column(3, [], 0),
      column(1, [card(1, 1)], 1),
      column(2, [card(2, 2)], 2),
    ];

    const result = restoreColumnPositions(moved, previous());

    expect(result.map(c => c.id)).toEqual([1, 2, 3]);
    expect(result.map(c => c.position)).toEqual([0, 1, 2]);
  });

  it('keeps the current cards of each column', () => {
    const moved = [
      column(2, [card(2, 2), card(1, 2)], 0),
      column(1, [], 1),
      column(3, [], 2),
    ];

    const result = restoreColumnPositions(moved, previous());

    expect(ids(result, 1)).toEqual([]);
    expect(ids(result, 2)).toEqual([2, 1]);
    expect(result.map(c => c.id)).toEqual([1, 2, 3]);
  });

  it('leaves columns missing from the snapshot at their current position', () => {
    const moved = [
      column(2, [], 0),
      column(1, [], 1),
      column(3, [], 2),
      column(4, [], 3),
    ];

    const result = restoreColumnPositions(moved, previous());

    expect(result.map(c => c.id)).toEqual([1, 2, 3, 4]);
    expect(result.find(c => c.id === 4)?.position).toBe(3);
  });
});
