import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

import { Column } from './column';
import { activeBoardReducer } from '@/redux/activeBoard/activeBoardSlice';
import { userReducer } from '@/redux/user/userSlice';
import type {
  Board,
  BoardMemberRole,
  Card,
  Column as ColumnType,
  LoginUserResponse,
} from '@/config/interface';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}));
// Popup tạo card không liên quan tới kéo-thả, kéo theo nhiều query.
vi.mock('./add-card-popup', () => ({ AddCardPopup: () => null }));

const USER_ID = 1;
const card = {
  id: 11,
  boardId: 9,
  columnId: 1,
  position: 0,
  title: 'Card',
} as Card;
const column = {
  id: 1,
  boardId: 9,
  title: 'Todo',
  position: 0,
  cards: [card],
} as ColumnType;

const render = (role: BoardMemberRole) => {
  const store = configureStore({
    reducer: { activeBoard: activeBoardReducer, user: userReducer },
    preloadedState: {
      activeBoard: {
        currentActiveBoard: {
          id: 9,
          columns: [column],
          members: [{ userId: USER_ID, role }],
        } as unknown as Board,
      },
      user: {
        currentUser: { id: USER_ID } as LoginUserResponse,
        loading: false,
        error: null,
      },
    },
  });

  return renderToStaticMarkup(
    <Provider store={store}>
      <QueryClientProvider client={new QueryClient()}>
        <DndContext>
          <SortableContext items={[`column-${column.id}`]}>
            <Column column={column} />
          </SortableContext>
        </DndContext>
      </QueryClientProvider>
    </Provider>
  );
};

/** Số phần tử mang thuộc tính sortable của dnd-kit (tay nắm kéo được). */
const countDragHandles = (html: string) =>
  html.match(/aria-roledescription="sortable"/g)?.length ?? 0;

describe('Column drag handle by board role', () => {
  it.each<BoardMemberRole>(['ADMIN', 'PM'])(
    'lets %s drag the column header and the card',
    role => {
      const html = render(role);

      expect(html).toContain('cursor-grab active:cursor-grabbing');
      expect(countDragHandles(html)).toBe(2);
    }
  );

  it('keeps the column header static for MEMBER but the card draggable', () => {
    const html = render('MEMBER');

    // Header cột không còn là tay nắm; chỉ còn tay nắm của card.
    expect(html).not.toMatch(/<div[^>]*aria-roledescription="sortable"/);
    expect(countDragHandles(html)).toBe(1);
    expect(html).toMatch(/<article[^>]*aria-roledescription="sortable"/);
  });
});
