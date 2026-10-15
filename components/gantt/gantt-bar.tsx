'use client';

import { memo, type KeyboardEvent } from 'react';
import { ColorDot } from '@/components/ui/tag';
import { cn } from '@/lib/utils';

/** Thanh hẹp hơn mức này thì ẩn chữ, chỉ còn chấm trạng thái. */
const MIN_LABEL_WIDTH = 64;

export interface GanttBarProps {
  left: number;
  width: number;
  label: string;
  /** Mô tả đầy đủ cho tooltip và trình đọc màn hình */
  title: string;
  /** Lớp `tag-c-*` theo màu issue type */
  colorClass: string;
  statusColor?: string | null;
  selected?: boolean;
  overdue?: boolean;
  onOpen: () => void;
}

/**
 * Thanh issue trên trục thời gian: vị trí và độ rộng cố định theo ngày bắt đầu /
 * đến hạn, chỉ đọc. Bấm hoặc Enter để mở chi tiết; muốn đổi ngày thì sửa trong
 * inspector.
 */
export const GanttBar = memo(function GanttBar({
  left,
  width,
  label,
  title,
  colorClass,
  statusColor,
  selected,
  overdue,
  onOpen,
}: GanttBarProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      aria-pressed={selected || undefined}
      title={title}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        'tag-color absolute top-1/2 flex h-[26px] -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[12px] font-semibold shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tag)_30%,transparent)] outline-none transition-shadow duration-150 ease-soft select-none hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tag)_60%,transparent)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-card',
        colorClass,
        selected && 'ring-2 ring-accent ring-offset-1 ring-offset-card',
        overdue && 'shadow-[inset_0_0_0_1.5px_var(--danger)]'
      )}
      style={{ left: left + 1, width: Math.max(width - 2, 10) }}
    >
      <ColorDot color={statusColor} className="ring-2 ring-card/70" />
      {width >= MIN_LABEL_WIDTH && <span className="truncate">{label}</span>}
    </div>
  );
});
