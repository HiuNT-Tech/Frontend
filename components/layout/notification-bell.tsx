'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Badge, Popover } from 'antd';
import { useTranslation } from 'react-i18next';

import Images from '@/assets';
import { useIsMobile } from '@/components/ui/use-mobile';
import { useUnreadCount } from '@/hooks/use-notification';
import {
  NotificationList,
  type NotificationTab,
} from '@/components/shared/notifications/NotificationList';

const BADGE_OVERFLOW = 99;

export function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { unreadCount, isUnreadCountLoading } = useUnreadCount();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotificationTab>('all');
  const bellRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Đóng khi điều hướng hoặc khi co xuống mobile.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);
  // Focus vào dialog khi mở (a11y); Esc trả focus về chuông.
  useEffect(() => {
    if (open) requestAnimationFrame(() => contentRef.current?.focus());
  }, [open]);

  const handleBellClick = () => {
    if (isMobile) {
      router.push('/notifications');
      return;
    }
    setOpen(v => !v);
  };

  const label =
    unreadCount > 0
      ? `${t('notifications.bellAriaLabel')} (${
          unreadCount > BADGE_OVERFLOW ? `${BADGE_OVERFLOW}+` : unreadCount
        })`
      : t('notifications.bellAriaLabel');

  const bellButton = (
    <button
      ref={bellRef}
      type="button"
      onClick={handleBellClick}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      title={t('tooltip.notification')}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-theme-neutral-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-main"
    >
      <Image
        src={Images.Alert}
        alt=""
        width={22}
        height={22}
        style={{ filter: 'brightness(0) invert(1)' }}
      />
    </button>
  );

  const badged = (
    <Badge
      count={isUnreadCountLoading ? 0 : unreadCount}
      overflowCount={BADGE_OVERFLOW}
      size="small"
      offset={[-6, 6]}
      className="[&_.ant-badge-count]:bg-theme-main [&_.ant-badge-count]:shadow-none"
    >
      {bellButton}
    </Badge>
  );

  if (isMobile) return badged;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      arrow={false}
      styles={{ container: { padding: 0 } }}
      content={
        <div
          ref={contentRef}
          tabIndex={-1}
          role="dialog"
          aria-label={t('notifications.title')}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setOpen(false);
              bellRef.current?.focus();
            }
          }}
          className="w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-lg bg-theme-neutral-1 focus:outline-none"
        >
          <NotificationList
            variant="popover"
            tab={tab}
            onTabChange={setTab}
            onNavigate={() => setOpen(false)}
          />
        </div>
      }
    >
      {badged}
    </Popover>
  );
}
