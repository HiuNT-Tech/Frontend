import { describe, expect, it } from 'vitest';
import { NotificationType } from '@/config/enum';
import type { Notification } from '@/config/interface';
import { getNotificationHref, isViewingCard } from './notification-link';

const n = (over: Partial<Notification>): Notification =>
  ({
    id: 1,
    actor: null,
    boardId: 7,
    cardId: 42,
    commentId: null,
    invitationId: null,
    payload: { boardTitle: 'B', boardCode: 'B' },
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    type: NotificationType.CARD_ASSIGNED,
    ...over,
  }) as Notification;

describe('getNotificationHref', () => {
  it.each([
    NotificationType.CARD_ASSIGNED,
    NotificationType.CARD_UPDATED,
    NotificationType.CARD_STATUS_CHANGED,
    NotificationType.CARD_COMMENTED,
    NotificationType.COMMENT_MENTIONED,
    NotificationType.CARD_DUE_SOON,
    NotificationType.CARD_OVERDUE,
  ])('%s → card route', type => {
    expect(getNotificationHref(n({ type }))).toBe('/project/7/issues/42');
    expect(getNotificationHref(n({ type, cardId: null }))).toBe(
      '/project/7/issues'
    );
    expect(getNotificationHref(n({ type, boardId: null }))).toBeNull();
  });

  it('BOARD_INVITED → invitation page by token, else dashboard', () => {
    expect(
      getNotificationHref(
        n({
          type: NotificationType.BOARD_INVITED,
          payload: { boardTitle: 'B', boardCode: 'B', invitationToken: 'a b' },
        })
      )
    ).toBe('/invitations/a%20b');
    expect(
      getNotificationHref(n({ type: NotificationType.BOARD_INVITED }))
    ).toBe('/dashboard');
  });

  it.each([
    NotificationType.INVITATION_ACCEPTED,
    NotificationType.MEMBER_ROLE_CHANGED,
  ])('%s → board route or dashboard', type => {
    expect(getNotificationHref(n({ type }))).toBe('/project/7/issues');
    expect(getNotificationHref(n({ type, boardId: null }))).toBe('/dashboard');
  });
});

describe('isViewingCard', () => {
  it('matches only the exact card route', () => {
    expect(isViewingCard('/project/7/issues/42', 42)).toBe(true);
    expect(isViewingCard('/project/7/issues/42/', 42)).toBe(true);
    expect(isViewingCard('/project/7/issues/420', 42)).toBe(false);
    expect(isViewingCard('/project/7/issues', 42)).toBe(false);
    expect(isViewingCard('/project/7/issues/42', null)).toBe(false);
  });
});
