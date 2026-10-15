'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Ẩn chữ, chỉ hiện icon (vẫn giữ aria-label = label nếu là chuỗi) */
  iconOnly?: boolean;
  disabled?: boolean;
}

/**
 * Segmented control: viên trắng trượt (spring) tới lựa chọn hiện tại.
 * `onCanvas` dùng track đậm hơn khi đặt thẳng trên nền xám.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  onCanvas,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  onCanvas?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex(option => option.value === value)
  );
  const count = options.length;

  return (
    <div
      role="group"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      className={cn(
        'relative grid rounded-[11px] p-[3px]',
        onCanvas ? 'bg-track' : 'bg-fill',
        className
      )}
    >
      <span
        aria-hidden="true"
        style={{
          width: `calc((100% - 6px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
        className="absolute inset-y-[3px] left-[3px] rounded-[8px] bg-card shadow-hair ring-1 ring-line transition-transform duration-[380ms] ease-spring"
      />
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={
              option.iconOnly && typeof option.label === 'string'
                ? option.label
                : undefined
            }
            title={
              option.iconOnly && typeof option.label === 'string'
                ? option.label
                : undefined
            }
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-[1] flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] font-semibold transition-colors duration-200 disabled:opacity-50 [&_svg]:size-[15px] [&_svg]:shrink-0',
              size === 'sm'
                ? 'h-7 px-2.5 text-[12.5px]'
                : 'h-[30px] px-3 text-[13px]',
              active ? 'text-ink' : 'text-muted hover:text-ink-2'
            )}
          >
            {option.icon}
            {!option.iconOnly && option.label}
          </button>
        );
      })}
    </div>
  );
}
