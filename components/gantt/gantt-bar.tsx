'use client';

import {
  memo,
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { ColorDot } from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import { pxToDays, type DragMode } from './gantt-timeline';

/** Dưới ngưỡng này (px) thì coi là bấm chứ không phải kéo. */
const CLICK_THRESHOLD = 4;
/** Thanh hẹp hơn mức này thì ẩn chữ, chỉ còn chấm trạng thái. */
const MIN_LABEL_WIDTH = 64;

interface DragState {
  mode: DragMode;
  originX: number;
  deltaPx: number;
}

export interface GanttBarProps {
  left: number;
  width: number;
  dayWidth: number;
  label: string;
  /** Mô tả đầy đủ cho tooltip và trình đọc màn hình */
  title: string;
  /** Lớp `tag-c-*` theo màu issue type */
  colorClass: string;
  statusColor?: string | null;
  selected?: boolean;
  overdue?: boolean;
  /** Người dùng được kéo đổi ngày */
  draggable?: boolean;
  /** Đang chờ API, mờ đi và khoá kéo */
  updating?: boolean;
  onOpen: () => void;
  onDragEnd?: (mode: DragMode, deltaDays: number) => void;
}

/**
 * Thanh issue trên trục thời gian. Kéo thân để dời cả thanh, kéo hai mép để
 * đổi ngày bắt đầu / đến hạn; vị trí xem trước tính ngay trên client, chỉ khi
 * thả mới báo số ngày đã dịch. Bàn phím: ← → dời 1 ngày, Shift đổi hạn, Alt đổi
 * ngày bắt đầu, Enter mở chi tiết.
 */
export const GanttBar = memo(function GanttBar({
  left,
  width,
  dayWidth,
  label,
  title,
  colorClass,
  statusColor,
  selected,
  overdue,
  draggable,
  updating,
  onOpen,
  onDragEnd,
}: GanttBarProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const canDrag = Boolean(draggable && onDragEnd && !updating);

  const beginDrag = useCallback(
    (event: PointerEvent<HTMLElement>, mode: DragMode) => {
      if (event.button !== 0) return;
      // Mép chỉ kéo được khi có quyền; thân thanh vẫn nhận pointer để bấm mở.
      if (mode !== 'move' && !canDrag) return;
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* pointer đã kết thúc (vd. touch cancel): vẫn theo dõi qua sự kiện trên phần tử */
      }
      const next = { mode, originX: event.clientX, deltaPx: 0 };
      dragRef.current = next;
      setDrag(next);
    },
    [canDrag]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const current = dragRef.current;
      if (!current) return;
      const deltaPx = event.clientX - current.originX;
      // Không có quyền kéo thì giữ nguyên vị trí, chỉ theo dõi để phân biệt bấm/kéo.
      const next = { ...current, deltaPx: canDrag ? deltaPx : 0 };
      dragRef.current = next;
      setDrag(next);
    },
    [canDrag]
  );

  const finishDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const current = dragRef.current;
      if (!current) return;
      dragRef.current = null;
      setDrag(null);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* chưa từng capture được */
      }

      const movedPx = event.clientX - current.originX;
      if (current.mode === 'move' && Math.abs(movedPx) < CLICK_THRESHOLD) {
        onOpen();
        return;
      }
      if (!canDrag) return;
      const deltaDays = pxToDays(movedPx, dayWidth);
      if (deltaDays !== 0) onDragEnd?.(current.mode, deltaDays);
    },
    [canDrag, dayWidth, onDragEnd, onOpen]
  );

  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onOpen();
        return;
      }
      if (!canDrag) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -1 : 1;
      const mode: DragMode = event.shiftKey
        ? 'end'
        : event.altKey
          ? 'start'
          : 'move';
      onDragEnd?.(mode, delta);
    },
    [canDrag, onDragEnd, onOpen]
  );

  // Hình dạng xem trước trong lúc kéo (snap theo ngày để thấy đúng chỗ sẽ thả).
  let previewLeft = left;
  let previewWidth = width;
  if (drag && drag.deltaPx !== 0) {
    const snapped = pxToDays(drag.deltaPx, dayWidth) * dayWidth;
    if (drag.mode === 'move') {
      previewLeft = left + snapped;
    } else if (drag.mode === 'start') {
      const maxShift = width - dayWidth;
      const shift = Math.min(snapped, maxShift);
      previewLeft = left + shift;
      previewWidth = width - shift;
    } else {
      previewWidth = Math.max(width + snapped, dayWidth);
    }
  }

  const dragging = Boolean(drag && drag.deltaPx !== 0);
  const showLabel = previewWidth >= MIN_LABEL_WIDTH;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      aria-pressed={selected || undefined}
      title={title}
      onPointerDown={event => beginDrag(event, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={cancelDrag}
      onKeyDown={handleKeyDown}
      className={cn(
        'tag-color group absolute top-1/2 flex h-[26px] -translate-y-1/2 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-[12px] font-semibold select-none shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tag)_30%,transparent)] outline-none transition-[box-shadow,opacity] duration-150 ease-soft focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-card',
        colorClass,
        canDrag ? 'cursor-grab touch-none' : 'cursor-pointer',
        dragging && 'z-[4] cursor-grabbing shadow-lift',
        !dragging &&
          'hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tag)_60%,transparent)]',
        selected && 'ring-2 ring-accent ring-offset-1 ring-offset-card',
        overdue && 'shadow-[inset_0_0_0_1.5px_var(--danger)]',
        updating && 'opacity-60'
      )}
      style={{ left: previewLeft + 1, width: Math.max(previewWidth - 2, 10) }}
    >
      <ColorDot color={statusColor} className="ring-2 ring-card/70" />
      {showLabel && <span className="truncate">{label}</span>}

      {canDrag && (
        <>
          <span
            aria-hidden="true"
            onPointerDown={event => beginDrag(event, 'start')}
            className="absolute inset-y-0 left-0 w-2.5 cursor-ew-resize rounded-l-full"
          />
          <span
            aria-hidden="true"
            onPointerDown={event => beginDrag(event, 'end')}
            className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize rounded-r-full"
          />
        </>
      )}
    </div>
  );
});
