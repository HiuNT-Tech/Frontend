import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

vi.mock('@/lib/apis/notification', () => ({ NotificationService: {} }));
vi.mock('@/redux/hooks', () => ({ useAppSelector: () => true }));
vi.mock('@/redux/user/userSlice', () => ({
  selectIsAuthenticated: () => true,
}));

const {
  adjustUnreadCount,
  listAccepts,
  notificationQueryKeys,
  patchNotificationInPages,
  prependNotification,
  removeNotificationFromPages,
  setUnreadCountFromServer,
} = await import('./use-notification');
const { NotificationType } = await import('@/config/enum');
type Notification = import('@/config/interface').Notification;
type Data = import('./use-notification').NotificationInfiniteData;

const makeNotification = (over: Partial<Notification> = {}): Notification =>
  ({
    id: 1,
    type: NotificationType.CARD_ASSIGNED,
    actor: null,
    boardId: 1,
    cardId: 1,
    commentId: null,
    invitationId: null,
    payload: {
      boardTitle: 'B',
      boardCode: 'B',
      cardCode: 'B-1',
      cardTitle: 'Card',
    },
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as Notification;

const makeData = (ids: number[][]): Data => ({
  pageParams: ids.map(() => null),
  pages: ids.map(page => ({
    items: page.map(id => makeNotification({ id })),
    total: ids.flat().length,
    nextCursor: null,
    unreadCount: 0,
  })),
});

describe('notificationQueryKeys', () => {
  it('normalizes equivalent filters to the same key', () => {
    expect(notificationQueryKeys.list({})).toEqual(
      notificationQueryKeys.list({ boardId: undefined, unreadOnly: false })
    );
    expect(notificationQueryKeys.list({ boardId: 2 })).not.toEqual(
      notificationQueryKeys.list({})
    );
    expect(notificationQueryKeys.list({})[1]).toBe('list');
  });
});

describe('listAccepts', () => {
  it('matches board and unread filters', () => {
    const unread = makeNotification({ boardId: 2 });
    const read = makeNotification({ boardId: 2, readAt: '2026-01-01' });
    expect(listAccepts({}, unread)).toBe(true);
    expect(listAccepts({ boardId: 2 }, unread)).toBe(true);
    expect(listAccepts({ boardId: 3 }, unread)).toBe(false);
    expect(listAccepts({ unreadOnly: true }, unread)).toBe(true);
    expect(listAccepts({ unreadOnly: true }, read)).toBe(false);
  });
});

describe('prependNotification', () => {
  it('inserts at the top of page 0 and bumps total', () => {
    const next = prependNotification(
      makeData([[2, 3]]),
      makeNotification({ id: 9 })
    );
    expect(next?.pages[0].items.map(i => i.id)).toEqual([9, 2, 3]);
    expect(next?.pages[0].total).toBe(3);
  });

  it('dedupes by id across pages and no-ops without cache', () => {
    const data = makeData([[2], [3]]);
    expect(prependNotification(data, makeNotification({ id: 3 }))).toBe(data);
    expect(prependNotification(undefined, makeNotification())).toBeUndefined();
  });
});

describe('patch / remove', () => {
  it('patches matching items on every page', () => {
    const next = patchNotificationInPages(
      makeData([[1], [2]]),
      item => item.id === 2,
      { readAt: 'x' }
    );
    expect(next.pages[0].items[0].readAt).toBeNull();
    expect(next.pages[1].items[0].readAt).toBe('x');
  });

  it('removes an item and decrements total without going negative', () => {
    const next = removeNotificationFromPages(makeData([[1, 2]]), 2);
    expect(next.pages[0].items.map(i => i.id)).toEqual([1]);
    expect(next.pages[0].total).toBe(1);
    expect(removeNotificationFromPages(next, 99).pages[0].total).toBe(1);
  });
});

describe('unread count helpers', () => {
  it('adjusts relatively with clamp and only when cached', () => {
    const client = new QueryClient();
    adjustUnreadCount(client, 1);
    expect(
      client.getQueryData(notificationQueryKeys.unreadCount())
    ).toBeUndefined();
    setUnreadCountFromServer(client, 2);
    adjustUnreadCount(client, -5);
    expect(client.getQueryData(notificationQueryKeys.unreadCount())).toEqual({
      unreadCount: 0,
    });
    setUnreadCountFromServer(client, -3);
    expect(client.getQueryData(notificationQueryKeys.unreadCount())).toEqual({
      unreadCount: 0,
    });
  });
});
