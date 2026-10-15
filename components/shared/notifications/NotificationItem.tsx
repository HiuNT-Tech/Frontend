'use client';

import React from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { Check, Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { format } from '@/constant/format';
import type { Notification } from '@/config/interface';
import { cn } from '@/lib/utils';
import {
  getNotificationActorName,
  getNotificationText,
} from './notification-text';

dayjs.extend(relativeTime);

export interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onMarkRead: (notification: Notification) => void;
  onRemove: (notification: Notification) => void;
  compact?: boolean;
  /** Hàng đầu tiên trong thẻ không có hairline phía trên */
  first?: boolean;
}

/**
 * Một hàng thông báo, yên tĩnh: chưa đọc = chấm accent nhỏ + tiêu đề đậm;
 * đã đọc = chữ nhạt hơn. Không tô nền, không vòng tròn icon màu.
 */
export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification: n,
  onOpen,
  onMarkRead,
  onRemove,
  compact = false,
  first = false,
}) => {
  const { t, i18n } = useTranslation();
  // 3 picker đang gọi dayjs.locale('ja') toàn cục → luôn set locale theo instance.
  const lang = i18n.language === 'vi' ? 'vi' : 'en';
  const isUnread = n.readAt === null;
  const actorName = getNotificationActorName(n, t);
  const hasActor = !!(n.actor || n.payload.actorDisplayName);
  const text = getNotificationText(n, t);
  const relative = dayjs(n.createdAt).locale(lang).fromNow();

  return (
    <li
      className={cn(
        'group relative flex items-start gap-3 transition-colors duration-200 ease-soft hover:bg-hover',
        compact ? 'px-3 py-2.5' : 'px-[18px] py-3',
        !first && 'border-t border-line'
      )}
      data-unread={isUnread || undefined}
    >
      {/* Vùng bấm chính là <button> phủ toàn hàng bằng ::after; nút phụ là
          anh em (không lồng button trong button) và nổi lên trên bằng z-index. */}
      <span className="mt-[11px] flex w-2 flex-none justify-center">
        {isUnread && (
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
        )}
      </span>

      <span className="mt-0.5 flex-none">
        {hasActor ? (
          <UserAvatar
            name={actorName}
            src={n.actor?.avatar ?? null}
            size={28}
          />
        ) : (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-fill text-muted shadow-[inset_0_0_0_1px_var(--line)]">
            <Clock aria-hidden="true" className="size-[15px]" />
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={() => onOpen(n)}
        className="min-w-0 flex-1 cursor-pointer text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-[10px] focus-visible:after:outline-2 focus-visible:after:outline-accent focus-visible:after:-outline-offset-2"
      >
        <span
          className={cn(
            'block text-[14px] leading-[1.4] line-clamp-2',
            isUnread ? 'font-semibold text-ink' : 'text-ink-2'
          )}
        >
          {text}
        </span>
        {n.payload.cardTitle && (
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            {n.payload.cardTitle}
          </span>
        )}
        <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
          {n.payload.boardTitle && !compact && (
            <>
              <span className="truncate">{n.payload.boardTitle}</span>
              <span aria-hidden="true" className="text-faint">
                ·
              </span>
            </>
          )}
          <time
            dateTime={n.createdAt}
            title={format.dateTime(n.createdAt)}
            className="shrink-0 tabular-nums"
          >
            {relative}
          </time>
        </span>
      </button>

      {/* Hành động phụ: hiện khi hover trên máy có chuột, luôn hiện trên cảm ứng. */}
      <span className="relative z-[1] -my-1 -mr-1.5 flex flex-none items-center gap-0.5 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
        {isUnread && (
          <IconButton
            size="sm"
            aria-label={t('notifications.markRead')}
            onClick={e => {
              e.stopPropagation();
              onMarkRead(n);
            }}
            className="text-muted"
          >
            <Check aria-hidden="true" />
          </IconButton>
        )}
        <IconButton
          size="sm"
          aria-label={t('notifications.delete')}
          onClick={e => {
            e.stopPropagation();
            onRemove(n);
          }}
          className="text-muted"
        >
          <X aria-hidden="true" />
        </IconButton>
      </span>
    </li>
  );
};
