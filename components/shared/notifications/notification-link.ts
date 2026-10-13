import { NotificationType } from '@/config/enum';
import type { EntityId, Notification } from '@/config/interface';

/** Route detail card thật của FE: app/(main)/project/[projectId]/issues/[id]/page.tsx */
export const CARD_ROUTE_REGEX = /^\/project\/(\d+)\/issues\/(\d+)(?:\/|$)/;

const boardHref = (boardId: EntityId | null): string | null =>
  boardId ? `/project/${boardId}/issues` : null;

const cardHref = (n: Notification): string | null => {
  if (!n.boardId) return null;
  if (!n.cardId) return boardHref(n.boardId);
  return `/project/${n.boardId}/issues/${n.cardId}`;
};

/** Điều hướng theo type (README 4.8). Chỉ sinh path nội bộ, không nhận URL từ payload. */
export const getNotificationHref = (n: Notification): string | null => {
  switch (n.type) {
    case NotificationType.CARD_ASSIGNED:
    case NotificationType.CARD_UPDATED:
    case NotificationType.CARD_STATUS_CHANGED:
    case NotificationType.CARD_COMMENTED:
    case NotificationType.COMMENT_MENTIONED:
    case NotificationType.CARD_DUE_SOON:
    case NotificationType.CARD_OVERDUE:
      return cardHref(n);
    case NotificationType.BOARD_INVITED:
      return n.payload.invitationToken
        ? `/invitations/${encodeURIComponent(n.payload.invitationToken)}`
        : '/dashboard';
    case NotificationType.INVITATION_ACCEPTED:
    case NotificationType.MEMBER_ROLE_CHANGED:
      return boardHref(n.boardId) ?? '/dashboard';
    default: {
      // Type mới FE chưa biết: cố gắng về board, không crash.
      const exhaustive: never = n.type;
      void exhaustive;
      return boardHref(n.boardId);
    }
  }
};

/** Đang mở đúng card này (so cardId với pathname) → không toast. */
export const isViewingCard = (
  pathname: string,
  cardId: EntityId | null
): boolean => {
  if (!cardId) return false;
  const match = CARD_ROUTE_REGEX.exec(pathname);
  return !!match && Number(match[2]) === cardId;
};
