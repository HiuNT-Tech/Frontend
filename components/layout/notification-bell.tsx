'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Popover } from 'antd';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useIsMobile } from '@/components/ui/use-mobile';
import { useUnreadCount } from '@/hooks/use-notification';
import {
  NotificationList,
  type NotificationTab,
} from '@/components/shared/notifications/NotificationList';
import { SidebarButton } from './sidebar-item';

const BADGE_OVERFLOW = 99;

/**
 * Dòng "Thông báo" trong sidebar: số chưa đọc bên phải, bấm mở danh sách ở popover
 * cạnh sidebar. Màn hình điện thoại thì chuyển sang trang /notifications.
 */
export function NotificationBell({ active }: { active?: boolean }) {
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
  // Focus vào dialog khi mở (a11y); Esc trả focus về nút.
  useEffect(() => {
    if (open) requestAnimationFrame(() => contentRef.current?.focus());
  }, [open]);

  const count = isUnreadCountLoading ? 0 : unreadCount;
  const countLabel =
    count > BADGE_OVERFLOW ? `${BADGE_OVERFLOW}+` : String(count);
  const label =
    count > 0
      ? `${t('notifications.bellAriaLabel')} (${countLabel})`
      : t('notifications.bellAriaLabel');

  const handleClick = () => {
    if (isMobile) {
      router.push('/notifications');
      return;
    }
    setOpen(v => !v);
  };

  const trigger = (
    <SidebarButton
      ref={bellRef}
      onClick={handleClick}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      active={active || open}
      icon={<Bell />}
      label={t('shell.nav.notifications')}
      trailing={
        count > 0 ? (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent">
            {countLabel}
          </span>
        ) : undefined
      }
    />
  );

  if (isMobile) return trigger;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="rightTop"
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
          className="w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] bg-card focus:outline-none"
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
      {trigger}
    </Popover>
  );
}
