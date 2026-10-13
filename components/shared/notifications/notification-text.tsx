import type { TFunction } from 'i18next';
import type { NotificationType } from '@/config/enum';
import type { Notification } from '@/config/interface';
import { FIELD_LABEL_KEYS } from '@/components/shared/system-comment-diff';
import { getMemberRoleStatusConfig } from '@/constant/data';
import { format } from '@/constant/format';

export const getNotificationTextKey = (
  type: NotificationType | string
): string => `notifications.text.${type}`;

/** actor live (đổi tên vẫn đúng) → snapshot payload → 'Người dùng đã xóa'. */
export const getNotificationActorName = (
  n: Notification,
  t: TFunction
): string =>
  n.actor?.displayName ||
  n.payload.actorDisplayName ||
  t('notifications.unknownActor');

const translateRole = (role: string | undefined, t: TFunction): string => {
  const config = getMemberRoleStatusConfig(role);
  return config ? t(config.labelKey) : t('common.unknown');
};

const translateFields = (fields: string[] | undefined, t: TFunction): string =>
  (fields ?? [])
    .map(field =>
      FIELD_LABEL_KEYS[field] ? t(FIELD_LABEL_KEYS[field]) : field
    )
    .join(', ');

/**
 * Câu chữ theo type + payload (BE không sinh câu). Trả string thuần → React
 * escape khi render, không có HTML/markdown.
 */
export const getNotificationText = (n: Notification, t: TFunction): string => {
  const p = n.payload;
  const values: Record<string, string | number> = {
    actor: getNotificationActorName(n, t),
    boardTitle: p.boardTitle ?? '',
    cardCode: p.cardCode ?? '',
    fromColumn: p.fromColumn ?? '',
    toColumn: p.toColumn ?? '',
    excerpt: p.commentExcerpt ?? '',
    fields: translateFields(p.changedFields, t),
    role: translateRole(p.role, t),
    oldRole: translateRole(p.oldRole, t),
    newRole: translateRole(p.newRole, t),
    dueDate: p.dueDate ? format.date(p.dueDate) : '',
    days: p.daysOverdue ?? 0,
  };

  // Type lạ (BE thêm type FE chưa biết) hoặc key thiếu ở cả vi và en →
  // không hiện key thô, dùng tiêu đề chung.
  return t(getNotificationTextKey(n.type), {
    ...values,
    defaultValue: t('notifications.title'),
  });
};
