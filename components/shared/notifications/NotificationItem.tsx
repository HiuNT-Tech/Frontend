'use client';

import React from 'react';
import Image from 'next/image';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useTranslation } from 'react-i18next';

import Icons from '@/assets/icons';
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
}

const iconButtonClassName =
  'rounded-md p-1 text-theme-neutral-7 hover:bg-theme-neutral-3 hover:text-theme-neutral-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-main';

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification: n,
  onOpen,
  onMarkRead,
  onRemove,
  compact = false,
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
        'group relative border-b border-theme-neutral-4 last:border-b-0',
        isUnread ? 'bg-theme-main-1/60' : 'bg-theme-neutral-1'
      )}
      data-unread={isUnread || undefined}
    >
      {/* Vùng bấm chính là <button>; nút phụ đặt là anh em (không lồng button trong button). */}
      <button
        type="button"
        onClick={() => onOpen(n)}
        className="flex w-full items-start gap-3 px-4 py-3 pr-16 text-left hover:bg-theme-neutral-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-main"
      >
        <span className="relative mt-0.5 shrink-0">
          {hasActor ? (
            <UserAvatar
              name={actorName}
              src={n.actor?.avatar ?? null}
              size={32}
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-theme-main-1">
              <Image
                src={Icons.Clock}
                alt=""
                width={16}
                height={16}
                className="h-4 w-4"
                style={{ filter: 'var(--theme-filter-main)' }}
              />
            </span>
          )}
          {isUnread && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-theme-neutral-1 bg-theme-main"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm text-theme-neutral-11 line-clamp-2',
              isUnread && 'font-semibold'
            )}
          >
            {text}
          </span>
          {n.payload.cardTitle && (
            <span className="mt-0.5 block truncate text-xs text-theme-neutral-8">
              {n.payload.cardTitle}
            </span>
          )}
          <span className="mt-1 flex items-center gap-2 text-xs text-theme-neutral-7">
            {n.payload.boardTitle && !compact && (
              <span className="truncate">{n.payload.boardTitle}</span>
            )}
            <time
              dateTime={n.createdAt}
              title={format.dateTime(n.createdAt)}
              className="shrink-0"
            >
              {relative}
            </time>
          </span>
        </span>
      </button>

      <span className="absolute right-2 top-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 focus-within:opacity-100">
        {isUnread && (
          <button
            type="button"
            aria-label={t('notifications.markRead')}
            title={t('notifications.markRead')}
            onClick={e => {
              e.stopPropagation();
              onMarkRead(n);
            }}
            className={iconButtonClassName}
          >
            <Image
              src={Icons.Check}
              alt=""
              width={14}
              height={14}
              className="h-3.5 w-3.5"
            />
          </button>
        )}
        <button
          type="button"
          aria-label={t('notifications.delete')}
          title={t('notifications.delete')}
          onClick={e => {
            e.stopPropagation();
            onRemove(n);
          }}
          className={iconButtonClassName}
        >
          <Image
            src={Icons.X}
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5"
          />
        </button>
      </span>
    </li>
  );
};
