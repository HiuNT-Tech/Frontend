'use client';

import { Fragment, useMemo, type CSSProperties, type RefObject } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';

import type { Card, EntityId } from '@/config/interface';
import { EmptyState } from '@/components/ui/empty-state';
import { colorTagClass } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  ISSUE_KEY_LINK_CLASS,
  issueFullPageHref,
} from '@/components/issues/issue-inspector';
import { isOverdue } from '@/utils/due-date';
import { cn } from '@/lib/utils';
import { GanttBar } from './gantt-bar';
import {
  DAY_WIDTH,
  barGeometry,
  buildTicks,
  getCardSpan,
  getVersionSpan,
  isWeekend,
  weekdayIndex,
  type DragMode,
  type GanttGroup,
  type GanttRange,
  type GanttScale,
} from './gantt-timeline';

/** Cột trái (mã + tiêu đề + avatar) cố định khi cuộn ngang. */
export const LABEL_WIDTH = 288;
/** Header hai hàng: tháng ở trên, ngày / tuần ở dưới. */
export const HEADER_HEIGHT = 56;
export const ROW_HEIGHT = 40;
const GROUP_HEIGHT = 36;
const SKELETON_ROWS = 7;

export interface GanttChartProps {
  boardId: EntityId;
  /** Nhóm theo version, chỉ gồm card đã có lịch */
  groups: GanttGroup<Card>[];
  unscheduled: Card[];
  range: GanttRange;
  scale: GanttScale;
  selectedId?: EntityId;
  /** Người dùng được kéo đổi ngày */
  canEdit: boolean;
  updatingIds: ReadonlySet<EntityId>;
  loading?: boolean;
  /** Vùng cuộn, để toolbar cuộn tới "hôm nay" */
  scrollRef: RefObject<HTMLDivElement | null>;
  onOpen: (card: Card) => void;
  onDateChange: (card: Card, mode: DragMode, deltaDays: number) => void;
  className?: string;
}

/**
 * Biểu đồ Gantt: header dính trên, cột issue dính trái, mỗi hàng là một thanh
 * đặt tuyệt đối theo offset ngày. Lưới ngày / tuần và cuối tuần vẽ bằng
 * gradient lặp nên số phần tử DOM không tăng theo số ngày.
 */
export function GanttChart({
  boardId,
  groups,
  unscheduled,
  range,
  scale,
  selectedId,
  canEdit,
  updatingIds,
  loading,
  scrollRef,
  onOpen,
  onDateChange,
  className,
}: GanttChartProps) {
  const { t } = useTranslation();
  const dayWidth = DAY_WIDTH[scale];
  const { majors, minors } = useMemo(
    () => buildTicks(range, scale),
    [range, scale]
  );
  const totalWidth = LABEL_WIDTH + range.totalDays * dayWidth;
  const todayVisible =
    range.todayIndex >= 0 && range.todayIndex < range.totalDays;
  const todayLeft = Math.max(range.todayIndex, 0) * dayWidth;

  // Lưới: vạch mỗi ngày (thang tuần) hoặc mỗi tuần, cùng nền cuối tuần, neo vào Thứ Hai.
  const trackStyle = useMemo<CSSProperties>(() => {
    const weekPeriod = 7 * dayWidth;
    const shift = -weekdayIndex(range.startDay) * dayWidth;
    const linePeriod = scale === 'week' ? dayWidth : weekPeriod;
    const lines = `repeating-linear-gradient(to right, var(--line) 0 1px, transparent 1px ${linePeriod}px)`;
    const weekend = `repeating-linear-gradient(to right, transparent 0 ${5 * dayWidth}px, color-mix(in srgb, var(--fill) 70%, transparent) ${5 * dayWidth}px ${weekPeriod}px)`;
    return {
      backgroundImage: `${lines}, ${weekend}`,
      backgroundPosition: `${shift}px 0, ${shift}px 0`,
    };
  }, [dayWidth, range.startDay, scale]);

  const isEmpty = !loading && groups.length === 0 && unscheduled.length === 0;

  const renderRow = (card: Card) => {
    const span = getCardSpan(card);
    const geometry = span ? barGeometry(span, range, dayWidth) : null;
    const selected = card.id === selectedId;
    const open = () => onOpen(card);

    return (
      <div
        key={card.id}
        role="row"
        aria-selected={selected}
        className={cn(
          'group/row flex border-b border-line',
          selected ? 'bg-accent-soft/50' : 'hover:bg-hover'
        )}
        style={{ height: ROW_HEIGHT }}
      >
        <div
          role="rowheader"
          onClick={open}
          className={cn(
            'sticky left-0 z-[2] flex shrink-0 cursor-pointer items-center gap-2 border-r border-line pr-3 pl-4 transition-colors duration-150',
            selected ? 'bg-accent-soft' : 'bg-card group-hover/row:bg-hover'
          )}
          style={{ width: LABEL_WIDTH }}
        >
          <Link
            href={issueFullPageHref(boardId, card.id)}
            onClick={event => event.stopPropagation()}
            className={cn(
              ISSUE_KEY_LINK_CLASS,
              'shrink-0 text-[12.5px] font-medium tabular-nums'
            )}
          >
            {card.cardCode ?? '—'}
          </Link>
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
            {card.title}
          </span>
          {card.assignee && (
            <UserAvatar
              name={card.assignee.displayName}
              src={card.assignee.avatar}
              size={22}
            />
          )}
        </div>

        <div role="gridcell" className="relative flex-1" style={trackStyle}>
          {todayVisible && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 bg-accent/7"
              style={{ left: todayLeft, width: dayWidth }}
            />
          )}
          {span && geometry ? (
            <GanttBar
              left={geometry.left}
              width={geometry.width}
              dayWidth={dayWidth}
              label={card.title ?? ''}
              title={t('gantt.bar', {
                key: card.cardCode ?? '',
                title: card.title ?? '',
                start: span.start.format('DD/MM'),
                end: span.end.format('DD/MM/YYYY'),
              })}
              colorClass={colorTagClass(card.issueType?.statusColor)}
              statusColor={card.column?.statusColor}
              selected={selected}
              overdue={isOverdue(card.dueDate)}
              draggable={canEdit}
              updating={updatingIds.has(card.id)}
              onOpen={open}
              onDragEnd={(mode, deltaDays) =>
                onDateChange(card, mode, deltaDays)
              }
            />
          ) : (
            <button
              type="button"
              onClick={open}
              className="absolute top-1/2 inline-flex h-[26px] -translate-y-1/2 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 text-[12px] font-medium whitespace-nowrap text-muted transition-colors duration-150 hover:border-accent hover:text-accent"
              style={{ left: todayLeft + 4 }}
            >
              <CalendarPlus aria-hidden="true" className="size-3.5" />
              {t('gantt.schedule')}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderGroupHeader = (
    key: string,
    label: string,
    count: number,
    span: ReturnType<typeof getVersionSpan>
  ) => {
    const geometry = span ? barGeometry(span, range, dayWidth) : null;
    return (
      <div
        key={key}
        role="row"
        className="flex border-b border-line bg-fill"
        style={{ height: GROUP_HEIGHT }}
      >
        <div
          role="rowheader"
          className="sticky left-0 z-[2] flex shrink-0 items-center gap-2 border-r border-line bg-fill pr-3 pl-4"
          style={{ width: LABEL_WIDTH }}
        >
          <span className="truncate text-[12.5px] font-semibold text-ink">
            {label}
          </span>
          <span className="text-[12px] text-muted tabular-nums">{count}</span>
        </div>
        <div role="gridcell" className="relative flex-1">
          {span && geometry && (
            <>
              <div
                aria-hidden="true"
                title={`${span.start.format('DD/MM')} – ${span.end.format('DD/MM/YYYY')}`}
                className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/35"
                style={{ left: geometry.left + 1, width: geometry.width - 2 }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 size-2.5 -translate-y-1/2 rotate-45 rounded-[2px] bg-accent"
                style={{ left: geometry.left + geometry.width - 6 }}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}
    >
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto overscroll-x-contain"
      >
        {isEmpty ? (
          <EmptyState
            className="h-full justify-center py-16"
            title={t('gantt.emptyTitle')}
            description={t('gantt.empty')}
          />
        ) : (
          <div
            role="grid"
            aria-label={t('gantt.title')}
            aria-busy={loading || undefined}
            className="relative min-w-full"
            style={{ width: totalWidth }}
          >
            {/* Header dính trên */}
            <div
              role="row"
              className="sticky top-0 z-[5] flex border-b border-line bg-card"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                role="columnheader"
                className="sticky left-0 z-[6] flex shrink-0 items-end border-r border-line bg-card px-4 pb-2"
                style={{ width: LABEL_WIDTH }}
              >
                <span className="text-[12.5px] font-semibold text-muted">
                  {t('gantt.issueColumn')}
                </span>
              </div>
              <div role="columnheader" className="relative flex-1">
                <div className="absolute inset-x-0 top-0 h-7 border-b border-line">
                  {majors.map(tick => (
                    <div
                      key={tick.index}
                      className="absolute inset-y-0 flex items-center overflow-hidden border-l border-line px-2 first:border-l-0"
                      style={{
                        left: tick.index * dayWidth,
                        width: tick.span * dayWidth,
                      }}
                    >
                      <span className="truncate text-[12px] font-semibold text-ink-2">
                        {tick.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-7">
                  {minors.map(tick => {
                    const isToday =
                      range.todayIndex >= tick.index &&
                      range.todayIndex < tick.index + tick.span;
                    const weekend = scale === 'week' && isWeekend(tick.date);
                    return (
                      <div
                        key={tick.index}
                        title={tick.date.format('ddd DD/MM/YYYY')}
                        className={cn(
                          'absolute inset-y-0 flex items-center',
                          scale === 'week'
                            ? 'justify-center'
                            : 'border-l border-line px-2'
                        )}
                        style={{
                          left: tick.index * dayWidth,
                          width: tick.span * dayWidth,
                        }}
                      >
                        {scale === 'week' && isToday ? (
                          <span className="rounded-full bg-accent px-1.5 py-[3px] text-[11px] leading-none font-bold text-on-accent tabular-nums">
                            {tick.label}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'text-[11px] leading-none font-medium tabular-nums',
                              weekend ? 'text-faint' : 'text-muted',
                              isToday &&
                                scale !== 'week' &&
                                'font-semibold text-accent'
                            )}
                          >
                            {tick.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div role="presentation" aria-hidden="true">
                {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <div
                    key={index}
                    className="flex border-b border-line"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div
                      className="sticky left-0 z-[2] flex shrink-0 items-center gap-2 border-r border-line bg-card pr-3 pl-4"
                      style={{ width: LABEL_WIDTH }}
                    >
                      <span className="skel h-3 w-12" />
                      <span className="skel h-3 flex-1" />
                    </div>
                    <div className="relative flex-1">
                      <span
                        className="skel absolute top-1/2 h-[22px] -translate-y-1/2 rounded-full"
                        style={{
                          left: (index * 3 + 2) * dayWidth,
                          width: (4 + (index % 3) * 2) * dayWidth,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {groups.map(group => (
                  <Fragment key={group.key}>
                    {renderGroupHeader(
                      `${group.key}-header`,
                      group.version?.name ?? t('gantt.noVersion'),
                      group.cards.length,
                      group.version ? getVersionSpan(group.version) : null
                    )}
                    {group.cards.map(renderRow)}
                  </Fragment>
                ))}
                {unscheduled.length > 0 && (
                  <>
                    {renderGroupHeader(
                      'unscheduled-header',
                      t('gantt.unscheduledGroup'),
                      unscheduled.length,
                      null
                    )}
                    {unscheduled.map(renderRow)}
                  </>
                )}
              </>
            )}

            {/* Đường hôm nay chạy suốt các hàng, nằm dưới cột trái và header */}
            {todayVisible && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-[1] w-[1.5px] bg-accent"
                style={{
                  top: HEADER_HEIGHT,
                  bottom: 0,
                  left: LABEL_WIDTH + todayLeft + dayWidth / 2 - 0.75,
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
