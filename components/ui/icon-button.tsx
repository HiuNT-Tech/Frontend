'use client';

import { forwardRef } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Bắt buộc: nút chỉ có icon cần nhãn cho trình đọc màn hình */
  'aria-label': string;
  /** Trạng thái bật (vd. panel đang mở) */
  active?: boolean;
  size?: 'sm' | 'md';
  /** Có viền + nền thẻ (dùng khi đặt trên nền xám cần nổi lên) */
  bordered?: boolean;
}

/** Nút icon 36px (32px khi sm), không viền, nền nhạt khi hover. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      active,
      size = 'md',
      bordered,
      type = 'button',
      title,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      title={title ?? props['aria-label']}
      className={cn(
        'press inline-grid flex-none place-items-center text-ink-2 transition-[background-color,color,transform] duration-200 ease-soft hover:bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
        size === 'sm'
          ? 'size-8 rounded-[9px] [&_svg]:size-4'
          : 'size-9 rounded-[10px] [&_svg]:size-[18px]',
        bordered && 'border border-line bg-card shadow-hair',
        active && 'bg-hover text-ink',
        className
      )}
      {...props}
    />
  )
);
IconButton.displayName = 'IconButton';
