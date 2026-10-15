'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { NotificationListSkeleton } from '@/components/ui/skeletons';
import { StateMessage } from '@/components/ui/state-message';
import type { EntityId, Notification } from '@/config/interface';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useRemoveNotification,
  useUnreadCount,
} from '@/hooks/use-notification';
import { cn } from '@/lib/utils';
import { NotificationItem } from './NotificationItem';
import { getNotificationHref } from './notification-link';

export type NotificationTab = 'all' | 'unread';
const RELATIVE_TIME_TICK_MS = 60_000;
const BADGE_OVERFLOW = 99;

export interface NotificationListProps {
  variant: 'popover' | 'page';
  tab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
  /** chỉ trang /notifications */
  boardId?: EntityId;
  /** popover: đóng trước khi push */
  onNavigate?: () => void;
  /** false khi trang cha đã đặt segmented all/unread ở toolbar của Pane */
  showTabs?: boolean;
  className?: string;
}

export const formatUnreadBadge = (count: number): string =>
  count > BADGE_OVERFLOW ? `${BADGE_OVERFLOW}+` : String(count);

export const NotificationList: React.FC<NotificationListProps> = ({
  variant,
  tab,
  onTabChange,
  boardId,
  onNavigate,
  showTabs = true,
  className,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const isPopover = variant === 'popover';

  const {
    notifications,
    isNotificationsLoading,
    isFetchingNextNotifications,
    isFetchNextNotificationsError,
    hasNextNotifications,
    fetchNextNotifications,
    notificationsError,
    refetchNotifications,
  } = useNotifications({ unreadOnly: tab === 'unread', boardId });
  const { unreadCount } = useUnreadCount();
  const { markRead } = useMarkRead();
  const { markAllRead, isMarkAllReadPending } = useMarkAllRead();
  const { removeNotification } = useRemoveNotification();

  // Re-render mỗi phút để "2 phút trước" tự nhích.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Infinite scroll: sentinel cuối danh sách.
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canObserve = typeof IntersectionObserver !== 'undefined';
  const itemCount = notifications.length;
  useEffect(() => {
    if (
      !canObserve ||
      !hasNextNotifications ||
      isFetchingNextNotifications ||
      isFetchNextNotificationsError
    ) {
      return;
    }
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) void fetchNextNotifications();
      },
      { root: isPopover ? scrollRef.current : null, rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    canObserve,
    hasNextNotifications,
    isFetchingNextNotifications,
    isFetchNextNotificationsError,
    fetchNextNotifications,
    isPopover,
    itemCount,
  ]);

  // Đổi tab/board → cuộn về đầu (query key đổi, danh sách khác).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab, boardId]);

  const handleOpen = useCallback(
    (n: Notification) => {
      const href = getNotificationHref(n);
      if (n.readAt === null) {
        // markRead TRƯỚC, push SAU (README 4.8). Không await để điều hướng tức thì;
        // 06 đã optimistic + rollback, lỗi đã được authorizeAxios toast.
        void markRead(n.id).catch(() => undefined);
      }
      onNavigate?.();
      if (href) router.push(href);
    },
    [markRead, onNavigate, router]
  );

  const handleMarkRead = useCallback(
    (n: Notification) => {
      if (n.readAt === null) void markRead(n.id).catch(() => undefined);
    },
    [markRead]
  );

  const handleRemove = useCallback(
    (n: Notification) => {
      void removeNotification(n.id).catch(() => undefined);
    },
    [removeNotification]
  );

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || isMarkAllReadPending) return;
    void markAllRead(boardId).catch(() => undefined);
  };

  const isInitialLoading = isNotificationsLoading && itemCount === 0;
  const isInitialError = !!notificationsError && itemCount === 0;
  const isEmpty = !isInitialLoading && !isInitialError && itemCount === 0;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {/* Thanh công cụ yên tĩnh: segmented bên trái (hoặc số chưa đọc), hành động dạng chữ bên phải */}
      <div
        className={cn(
          'flex flex-none flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-line',
          isPopover ? 'px-3 py-2' : 'px-[18px] py-2.5'
        )}
      >
        {showTabs ? (
          <Segmented<NotificationTab>
            size="sm"
            label={t('notifications.title')}
            value={tab}
            onChange={onTabChange}
            options={[
              { value: 'all', label: t('notifications.tabs.all') },
              {
                value: 'unread',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    {t('notifications.tabs.unread')}
                    {unreadCount > 0 && (
                      <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent tabular-nums">
                        {formatUnreadBadge(unreadCount)}
                      </span>
                    )}
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <span
            className="text-[13px] font-semibold text-muted tabular-nums"
            aria-live="polite"
          >
            {unreadCount > 0
              ? t('notifications.unreadCount', { count: unreadCount })
              : t('notifications.allRead')}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-mr-1.5 text-accent hover:text-accent-hover disabled:text-faint"
          disabled={unreadCount === 0 || isMarkAllReadPending}
          aria-busy={isMarkAllReadPending || undefined}
          onClick={handleMarkAllRead}
        >
          {t('notifications.markAllRead')}
        </Button>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          'min-h-0',
          isPopover ? 'max-h-[min(420px,60dvh)] overflow-y-auto' : 'max-h-none'
        )}
        aria-busy={isInitialLoading || undefined}
      >
        {isInitialLoading && <NotificationListSkeleton rows={4} />}

        {isInitialError && (
          <EmptyState
            className="py-8"
            title={t('notifications.loadError')}
            description={t('notifications.loadErrorHint')}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetchNotifications()}
              >
                {t('common.retry')}
              </Button>
            }
          />
        )}

        {isEmpty && (
          <EmptyState
            className={isPopover ? 'py-8' : 'py-12'}
            title={
              tab === 'unread'
                ? t('notifications.emptyUnread')
                : t('notifications.empty')
            }
            description={
              tab === 'unread'
                ? t('notifications.emptyUnreadHint')
                : t('notifications.emptyHint')
            }
          />
        )}

        {itemCount > 0 && (
          <ul role="list" className="m-0 list-none p-0">
            {notifications.map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                compact={isPopover}
                first={i === 0}
                onOpen={handleOpen}
                onMarkRead={handleMarkRead}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}

        {/* Sentinel + trạng thái tải thêm */}
        {itemCount > 0 && hasNextNotifications && (
          <div
            ref={sentinelRef}
            className="flex justify-center border-t border-line py-3"
          >
            {isFetchingNextNotifications && (
              <StateMessage
                variant="inline"
                spinner
                spinnerClassName="size-4"
                className="flex items-center gap-2 text-[13px]"
                i18nKey="notifications.loadMore"
              />
            )}
            {(isFetchNextNotificationsError || !canObserve) &&
              !isFetchingNextNotifications && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchNextNotifications()}
                >
                  {isFetchNextNotificationsError
                    ? t('common.retry')
                    : t('notifications.loadMore')}
                </Button>
              )}
          </div>
        )}
      </div>

      {isPopover && (
        <div className="flex-none border-t border-line p-1.5">
          <Link
            href="/notifications"
            onClick={onNavigate}
            className="press flex h-9 items-center justify-center rounded-[10px] text-[13.5px] font-semibold text-accent transition-colors duration-200 ease-soft hover:bg-hover hover:text-accent-hover"
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
};
