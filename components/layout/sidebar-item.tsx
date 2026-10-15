'use client';

import { forwardRef } from 'react';
import type React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const rowClassName = (active?: boolean) =>
  cn(
    'press flex h-9 w-full min-w-0 items-center gap-2.5 rounded-[9px] px-2.5 text-left text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft',
    active
      ? 'bg-card font-semibold text-ink shadow-hair ring-1 ring-line'
      : 'font-medium text-ink-2 hover:bg-hover'
  );

interface SidebarItemContentProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  /** Số đếm / phím tắt bên phải */
  trailing?: React.ReactNode;
  active?: boolean;
}

function SidebarItemContent({
  icon,
  label,
  trailing,
  active,
}: SidebarItemContentProps) {
  return (
    <>
      <span
        className={cn(
          'grid flex-none place-items-center [&_svg]:size-[17px]',
          active ? 'text-accent' : 'text-muted'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing != null && (
        <span className="flex-none text-xs font-semibold text-muted tabular-nums">
          {trailing}
        </span>
      )}
    </>
  );
}

/** Dòng điều hướng trong sidebar (Link). Dòng đang chọn là viên trắng nổi nhẹ. */
export function SidebarLink({
  href,
  title,
  ...content
}: SidebarItemContentProps & { href: string; title?: string }) {
  return (
    <Link
      href={href}
      title={title}
      aria-current={content.active ? 'page' : undefined}
      className={rowClassName(content.active)}
    >
      <SidebarItemContent {...content} />
    </Link>
  );
}

/** Dòng dạng nút (mở panel, mở popover…). */
export const SidebarButton = forwardRef<
  HTMLButtonElement,
  SidebarItemContentProps &
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>
>(({ icon, label, trailing, active, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(rowClassName(active), className)}
    {...props}
  >
    <SidebarItemContent
      icon={icon}
      label={label}
      trailing={trailing}
      active={active}
    />
  </button>
));
SidebarButton.displayName = 'SidebarButton';

/** Tiêu đề nhóm trong sidebar. */
export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-5 pb-1.5 text-[12.5px] font-semibold text-muted">
      {children}
    </div>
  );
}

/** Ô vuông mã dự án (2 ký tự), tô accent khi đang chọn. */
export function ProjectTile({
  code,
  active,
  size = 22,
  className,
}: {
  code: string;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'grid flex-none place-items-center rounded-[7px] text-[9.5px] leading-none font-bold uppercase',
        active
          ? 'bg-accent text-on-accent'
          : 'bg-card text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]',
        className
      )}
    >
      {code.slice(0, 2)}
    </span>
  );
}

/** Logo: ô accent với ba vạch (cột của board). */
export function AppLogo({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="grid flex-none place-items-center rounded-[9px] bg-accent text-on-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.54}
        height={size * 0.54}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      >
        <path d="M6 5v14M12 5v9M18 5v11" />
      </svg>
    </span>
  );
}
