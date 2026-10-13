'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
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
  className?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  variant,
  tab,
  onTabChange,
  boardId,
  onNavigate,
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
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between border-b border-theme-neutral-4 px-3">
        <Tabs
          size="small"
          activeKey={tab}
          onChange={key => onTabChange(key as NotificationTab)}
          items={[
            { key: 'all', label: t('notifications.tabs.all') },
            {
              key: 'unread',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {t('notifications.tabs.unread')}
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-theme-main px-1.5 text-[11px] font-semibold leading-4 text-theme-neutral-1">
                      {unreadCount > BADGE_OVERFLOW
                        ? `${BADGE_OVERFLOW}+`
                        : unreadCount}
                    </span>
                  )}
                </span>
              ),
            },
          ]}
          className="[&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav]:before:border-b-0 [&_.ant-tabs-tab-btn]:text-sm [&_.ant-tabs-tab-btn]:text-theme-neutral-8 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-theme-neutral-11 [&_.ant-tabs-ink-bar]:bg-theme-main"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-theme-main hover:bg-theme-main-1 disabled:text-theme-neutral-6"
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
          'overflow-y-auto',
          isPopover ? 'max-h-[420px]' : 'max-h-none'
        )}
        aria-busy={isInitialLoading || undefined}
      >
        {isInitialLoading && <NotificationListSkeleton rows={4} />}

        {isInitialError && (
          <div className="flex flex-col items-center gap-3 py-10">
            <StateMessage
              variant="inline"
              tone="danger"
              i18nKey="notifications.loadError"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetchNotifications()}
            >
              {t('common.retry')}
            </Button>
          </div>
        )}

        {isEmpty && (
          <StateMessage
            variant="block"
            className="py-12"
            i18nKey={
              tab === 'unread'
                ? 'notifications.emptyUnread'
                : 'notifications.empty'
            }
          />
        )}

        {itemCount > 0 && (
          <ul role="list" className="m-0 list-none p-0">
            {notifications.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                compact={isPopover}
                onOpen={handleOpen}
                onMarkRead={handleMarkRead}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}

        {/* Sentinel + trạng thái tải thêm */}
        {itemCount > 0 && hasNextNotifications && (
          <div ref={sentinelRef} className="flex justify-center py-3">
            {isFetchingNextNotifications && (
              <StateMessage
                variant="inline"
                spinner
                spinnerClassName="h-5 w-5"
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
        <div className="border-t border-theme-neutral-4 px-4 py-2 text-center">
          <Link
            href="/notifications"
            onClick={onNavigate}
            className="text-sm font-medium text-theme-main hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-main"
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
};
