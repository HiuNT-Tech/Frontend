'use client';

import type React from 'react';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import { useOptionalSidebar } from './sidebar-context';

/** Nút hiện sidebar — chỉ xuất hiện khi sidebar không được ghim. */
export function SidebarToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const sidebar = useOptionalSidebar();
  if (!sidebar || sidebar.docked) return null;
  return (
    <IconButton
      aria-label={t('shell.showSidebar')}
      aria-expanded={sidebar.overlayOpen}
      onClick={sidebar.toggle}
      className={cn('-ml-1.5', className)}
    >
      <PanelLeft />
    </IconButton>
  );
}

export interface PaneToolbarProps {
  title?: React.ReactNode;
  /** Dòng phụ nhỏ dưới tiêu đề (mã dự án, số lượng…) */
  subtitle?: React.ReactNode;
  /** Phần tử đứng trước tiêu đề (vd. nút quay lại) */
  leading?: React.ReactNode;
  /** Ở giữa thanh: segmented control đổi chế độ xem */
  center?: React.ReactNode;
  /** Bên phải: nút hành động */
  actions?: React.ReactNode;
  className?: string;
  /** Ẩn nút hiện sidebar (vd. thanh của inspector) */
  hideSidebarToggle?: boolean;
}

/**
 * Thanh công cụ 56px mà mọi pane bắt đầu bằng nó (giống cửa sổ Mac).
 * Trên màn hẹp, phần `center` rớt xuống hàng thứ hai để tiêu đề không bị ép.
 */
export function PaneToolbar({
  title,
  subtitle,
  leading,
  center,
  actions,
  className,
  hideSidebarToggle,
}: PaneToolbarProps) {
  return (
    <div
      className={cn(
        // z-[25]: nằm trên lớp nền mờ của inspector (z-20) để vẫn bấm được nút mở sidebar / đổi chế độ xem
        // @container: phần giữa xuống hàng theo độ rộng của chính pane (vd. khi inspector mở), không theo viewport
        'relative z-[25] flex flex-none flex-wrap items-center gap-x-3 border-b border-line bg-bg px-4 @container lg:px-5',
        className
      )}
    >
      <div
        className={cn(
          'flex h-14 min-w-0 flex-1 items-center gap-2.5',
          // có phần giữa: nhường chỗ cho nó khi pane đủ rộng
          center && '@[860px]:flex-none'
        )}
      >
        {!hideSidebarToggle && <SidebarToggle />}
        {leading}
        {(title || subtitle) && (
          <div className="min-w-0 leading-tight">
            {title && (
              <h1 className="truncate text-[17px] font-bold tracking-[-0.01em] text-ink">
                {title}
              </h1>
            )}
            {subtitle && (
              <div className="truncate text-[12.5px] text-muted">
                {subtitle}
              </div>
            )}
          </div>
        )}
      </div>
      {center && (
        <div className="order-last flex w-full min-w-0 justify-center overflow-x-auto pb-3 @[860px]:order-none @[860px]:w-auto @[860px]:flex-1 @[860px]:pb-0">
          {center}
        </div>
      )}
      {actions && (
        <div className="flex h-14 flex-none items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * Một pane = toolbar + vùng nội dung cuộn riêng. Mọi trang trong khung app dùng nó
 * để nút hiện sidebar luôn có chỗ đứng.
 */
export function Pane({
  children,
  className,
  bodyClassName,
  scroll = true,
  ...toolbar
}: PaneToolbarProps & {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** false khi nội dung tự quản lý cuộn (board, danh sách + inspector) */
  scroll?: boolean;
}) {
  return (
    <section
      className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}
      aria-label={typeof toolbar.title === 'string' ? toolbar.title : undefined}
    >
      <PaneToolbar {...toolbar} />
      <div
        className={cn(
          'min-h-0 flex-1',
          scroll ? 'overflow-y-auto' : 'flex flex-col overflow-hidden',
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Cột nội dung có độ rộng đọc thoải mái, căn giữa trong pane. */
export function PaneContent({
  children,
  className,
  width = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  /** narrow = form/cài đặt (760px) · default = trang thường (1180px) · full = bảng rộng */
  width?: 'narrow' | 'default' | 'full';
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 pt-5 pb-10 md:px-6 lg:px-8 lg:pt-6',
        width === 'narrow' && 'max-w-[760px]',
        width === 'default' && 'max-w-[1180px]',
        className
      )}
    >
      {children}
    </div>
  );
}
