import type React from 'react';
import { cn } from '@/lib/utils';
import { STATUS_TO_COLOR_KEY } from '@/constant/data';

type Tone = 'neutral' | 'accent' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-fill text-ink-2',
  accent: 'bg-accent-soft text-accent-text',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

/** Nhãn trạng thái ngắn: viên thuốc 12.5px/600 trên nền nhạt. */
export function Tag({
  tone = 'neutral',
  dot,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] py-[3px] text-[12.5px] font-semibold leading-[1.35]',
        TONES[tone],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 flex-none rounded-full bg-current"
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Lớp màu theo statusColor (API) → `tag-c-*` định nghĩa trong globals.css. */
export const colorTagClass = (statusColor?: string | null): string => {
  if (statusColor === 'GRAY') return 'tag-c-gray';
  if (statusColor === 'PURPLE') return 'tag-c-purple';
  const key =
    (statusColor &&
      (STATUS_TO_COLOR_KEY as Record<string, string | undefined>)[
        statusColor
      ]) ||
    'blue';
  return `tag-c-${key}`;
};

/**
 * Tag màu do người dùng chọn (trạng thái / loại issue): nền nhạt cùng tông + chấm màu.
 * Chữ tự đậm ở light và tự sáng ở dark.
 */
export function ColorTag({
  color,
  children,
  dot = true,
  className,
  title,
}: {
  color?: string | null;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'tag-color inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap rounded-full px-[9px] py-[3px] text-[12.5px] font-semibold leading-[1.35]',
        colorTagClass(color),
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="tag-dot size-1.5 flex-none rounded-full"
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Chấm màu đơn lẻ theo statusColor (tiêu đề cột, nhóm). */
export function ColorDot({
  color,
  className,
}: {
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'tag-dot inline-block size-2 flex-none rounded-full',
        colorTagClass(color),
        className
      )}
    />
  );
}
