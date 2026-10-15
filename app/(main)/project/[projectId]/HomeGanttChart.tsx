'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/surface';
import { ColorDot, colorTagClass } from '@/components/ui/tag';
import { EmptyState } from '@/components/ui/empty-state';
import { GanttBar } from '@/components/gantt/gantt-bar';
import {
  barGeometry,
  getCardSpan,
  isWeekend,
  sortBySchedule,
  type GanttRange,
} from '@/components/gantt/gantt-timeline';
import { isOverdue } from '@/utils/due-date';
import { cn } from '@/lib/utils';
import type { Card as CardModel, Column } from '@/config/interface';

const DAY_WIDTH = 22;
const LABEL_WIDTH = 168;
const HEADER_HEIGHT = 34;
const ROW_HEIGHT = 36;
/** Cửa sổ cố định: một tuần trước tới ba tuần sau hôm nay. */
const DAYS_BEFORE = 7;
const DAYS_AFTER = 21;
/** Widget chỉ là bản tóm tắt; tab Gantt mới là bản đầy đủ. */
const MAX_TASKS = 8;

export interface HomeGanttChartProps {
  /** Card đã có sẵn startDate/dueDate — lấy từ danh sách card gần đây của board */
  cards: CardModel[];
  totalScheduledCount: number;
  /** Cột trạng thái của board — vẽ chú giải màu ở đầu thẻ */
  columns?: Column[];
}

/**
 * Timeline rút gọn ở trang Home: cửa sổ bốn tuần quanh hôm nay, tối đa tám
 * issue đang chạy trong cửa sổ đó. Dùng chung thanh và công thức với tab Gantt;
 * bấm thanh mở issue ngay trên tab Gantt.
 */
export function HomeGanttChart({
  cards,
  totalScheduledCount,
  columns = [],
}: HomeGanttChartProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const ganttHref = `/project/${params.projectId}/gantt`;

  const range = useMemo<GanttRange>(() => {
    const today = dayjs().startOf('day');
    return {
      startDay: today.subtract(DAYS_BEFORE, 'day'),
      totalDays: DAYS_BEFORE + DAYS_AFTER + 1,
      todayIndex: DAYS_BEFORE,
    };
  }, []);

  // Chỉ giữ issue chạm vào cửa sổ, ưu tiên issue bắt đầu sớm hơn.
  const tasks = useMemo(() => {
    const windowStart = range.startDay;
    const windowEnd = range.startDay.add(range.totalDays - 1, 'day');
    return sortBySchedule(cards)
      .filter(card => {
        const span = getCardSpan(card);
        return (
          span &&
          !span.end.isBefore(windowStart) &&
          !span.start.isAfter(windowEnd)
        );
      })
      .slice(0, MAX_TASKS);
  }, [cards, range]);

  const dayColumns = useMemo(
    () =>
      Array.from({ length: range.totalDays }, (_, index) => {
        const date = range.startDay.add(index, 'day');
        return {
          index,
          date,
          showLabel: index !== range.todayIndex && index % 2 === 0,
          weekend: isWeekend(date),
        };
      }),
    [range]
  );

  const legend = columns.filter(column => column.title);
  const hiddenCount = Math.max(totalScheduledCount - tasks.length, 0);

  return (
    <Card
      as="section"
      aria-label={t('projectHome.gantt.title')}
      className="animate-rise overflow-hidden [animation-delay:80ms]"
    >
      <CardHeader
        title={t('projectHome.gantt.title')}
        description={
          hiddenCount > 0
            ? t('projectHome.gantt.truncated', {
                shown: tasks.length,
                total: totalScheduledCount,
              })
            : undefined
        }
        action={
          <div className="flex items-center gap-4">
            {legend.length > 0 && (
              <ul className="hidden flex-wrap items-center gap-x-3.5 gap-y-1.5 md:flex">
                {legend.map(column => (
                  <li
                    key={column.id}
                    className="flex items-center gap-1.5 text-[12.5px] leading-none text-muted"
                  >
                    <ColorDot color={column.statusColor} />
                    <span className="max-w-[12ch] truncate">
                      {column.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={ganttHref}
              className="inline-flex shrink-0 items-center gap-1 text-[13.5px] font-semibold text-accent transition-colors duration-200 ease-soft hover:text-accent-hover"
            >
              {t('projectHome.gantt.openGantt')}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        }
        className="pb-3"
      />

      {tasks.length === 0 ? (
        <EmptyState
          className="border-t border-line py-7"
          title={t('projectHome.gantt.emptyTitle')}
          description={t('projectHome.gantt.empty')}
        />
      ) : (
        <div className="overflow-x-auto overflow-y-hidden border-t border-line">
          <div
            className="relative"
            style={{ minWidth: LABEL_WIDTH + range.totalDays * DAY_WIDTH }}
          >
            {/* hàng đầu: nhãn ngày */}
            <div
              className="sticky top-0 z-[2] flex border-b border-line bg-card"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-[3] flex shrink-0 items-center border-r border-line bg-card px-[18px]"
                style={{ width: LABEL_WIDTH }}
              >
                <span className="text-[12.5px] leading-none font-semibold text-muted">
                  {t('projectHome.gantt.issueColumn')}
                </span>
              </div>
              <div className="flex flex-1">
                {dayColumns.map(({ index, date, showLabel, weekend }) => (
                  <div
                    key={index}
                    title={date.format('ddd DD/MM/YYYY')}
                    className={cn(
                      'relative flex h-full shrink-0 items-center justify-center',
                      index === range.todayIndex && 'bg-accent/7'
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {index === range.todayIndex ? (
                      <span className="absolute top-1/2 left-1/2 z-[4] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-[7px] py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-on-accent">
                        {t('projectHome.gantt.today')}
                      </span>
                    ) : (
                      showLabel && (
                        <span
                          className={cn(
                            'text-[11px] leading-none font-medium whitespace-nowrap tabular-nums',
                            weekend ? 'text-faint' : 'text-muted'
                          )}
                        >
                          {date.format('D/M')}
                        </span>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* các hàng */}
            {tasks.map((task, idx) => {
              const span = getCardSpan(task)!;
              const geometry = barGeometry(span, range, DAY_WIDTH);
              const open = () => router.push(`${ganttHref}?issue=${task.id}`);

              return (
                <div
                  key={task.id}
                  className={cn(
                    'group/row flex items-center transition-colors duration-200 ease-soft hover:bg-hover',
                    idx < tasks.length - 1 && 'border-b border-line'
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={open}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open();
                      }
                    }}
                    className="sticky left-0 z-[2] flex h-full shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden border-r border-line bg-card pr-3 pl-[18px] transition-colors duration-200 ease-soft group-hover/row:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span className="shrink-0 text-[12.5px] leading-none font-medium text-muted tabular-nums group-hover/row:text-ink">
                      {task.cardCode ?? '—'}
                    </span>
                    <span className="truncate text-[12.5px] text-ink-2">
                      {task.title}
                    </span>
                  </div>

                  <div className="relative h-full flex-1">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 bg-accent/7"
                      style={{
                        left: range.todayIndex * DAY_WIDTH,
                        width: DAY_WIDTH,
                      }}
                    />
                    <GanttBar
                      left={geometry.left}
                      width={geometry.width}
                      dayWidth={DAY_WIDTH}
                      label={task.title ?? ''}
                      title={`${task.cardCode ?? ''} ${task.title ?? ''} · ${span.start.format('DD/MM')} – ${span.end.format('DD/MM/YYYY')}`}
                      colorClass={colorTagClass(task.issueType?.statusColor)}
                      statusColor={task.column?.statusColor}
                      overdue={isOverdue(task.dueDate)}
                      onOpen={open}
                    />
                  </div>
                </div>
              );
            })}

            {/* đường hôm nay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 z-[1] w-[1.5px] bg-accent"
              style={{
                top: HEADER_HEIGHT,
                left:
                  LABEL_WIDTH +
                  range.todayIndex * DAY_WIDTH +
                  DAY_WIDTH / 2 -
                  0.75,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export default HomeGanttChart;
