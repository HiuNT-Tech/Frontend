'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { Card, CardHeader } from '@/components/ui/surface';
import { ColorDot, colorTagClass } from '@/components/ui/tag';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import type { Card as CardModel, Column } from '@/config/interface';

const DAY_WIDTH = 22;
const LABEL_WIDTH = 168;
const HEADER_HEIGHT = 34;
const MAX_TASKS = 20;

export interface HomeGanttChartProps {
  /** Card đã có sẵn startDate/dueDate — lấy từ danh sách card gần đây của board */
  cards: CardModel[];
  totalScheduledCount: number;
  /** Cột trạng thái của board — vẽ chú giải màu ở đầu thẻ */
  columns?: Column[];
}

export function HomeGanttChart({
  cards,
  totalScheduledCount,
  columns = [],
}: HomeGanttChartProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const tasks = useMemo(() => cards.slice(0, MAX_TASKS), [cards]);

  const range = useMemo(() => {
    const today = dayjs().startOf('day');

    if (tasks.length === 0) {
      return { startDay: today, totalDays: 14, todayIndex: 0 };
    }

    const times = tasks.flatMap(card => [
      dayjs(card.startDate).startOf('day').valueOf(),
      dayjs(card.dueDate).startOf('day').valueOf(),
    ]);
    const minTime = Math.min(...times, today.valueOf());
    const maxTime = Math.max(...times, today.valueOf());
    const startDay = dayjs(minTime);
    // +2 ngày đệm cuối cho dễ nhìn thanh cuối cùng
    const totalDays = dayjs(maxTime).diff(startDay, 'day') + 3;
    const todayIndex = today.diff(startDay, 'day');

    return { startDay, totalDays, todayIndex };
  }, [tasks]);

  const { startDay, totalDays, todayIndex } = range;
  const labelEvery = totalDays > 24 ? 3 : totalDays > 14 ? 2 : 1;

  const dayColumns = Array.from({ length: totalDays }, (_, i) => {
    const date = startDay.add(i, 'day');
    const showLabel = i !== todayIndex && i % labelEvery === 0;
    return { index: i, date, showLabel };
  });

  const legend = columns.filter(column => column.title);

  return (
    <Card
      as="section"
      aria-label={t('projectHome.gantt.title')}
      className="animate-rise overflow-hidden [animation-delay:80ms]"
    >
      <CardHeader
        title={t('projectHome.gantt.title')}
        description={
          totalScheduledCount > tasks.length
            ? t('projectHome.gantt.truncated', {
                shown: tasks.length,
                total: totalScheduledCount,
              })
            : undefined
        }
        action={
          legend.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
              {legend.map(column => (
                <li
                  key={column.id}
                  className="flex items-center gap-1.5 text-[12.5px] leading-none text-muted"
                >
                  <ColorDot color={column.statusColor} />
                  <span className="max-w-[12ch] truncate">{column.title}</span>
                </li>
              ))}
            </ul>
          ) : undefined
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
            style={{ minWidth: LABEL_WIDTH + totalDays * DAY_WIDTH }}
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
                {dayColumns.map(({ index, date, showLabel }) => (
                  <div
                    key={index}
                    className={cn(
                      'relative flex h-full shrink-0 items-center justify-center',
                      index === todayIndex && 'bg-accent/7'
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {index === todayIndex ? (
                      /* mốc hôm nay nằm trong header để không che thanh nào */
                      <span className="absolute top-1/2 left-1/2 z-[4] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent px-[7px] py-1 text-[11px] leading-none font-semibold whitespace-nowrap text-on-accent">
                        {t('projectHome.gantt.today')}
                      </span>
                    ) : (
                      showLabel && (
                        <span
                          title={date.format('DD/MM/YYYY')}
                          className="text-[11px] leading-none font-medium whitespace-nowrap text-muted tabular-nums"
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
              const isHovered = hoveredId === task.id;
              const startOffset = dayjs(task.startDate)
                .startOf('day')
                .diff(startDay, 'day');
              const endOffset =
                dayjs(task.dueDate).startOf('day').diff(startDay, 'day') + 1;
              const barLeft = startOffset * DAY_WIDTH;
              const barWidth = Math.max(
                (endOffset - startOffset) * DAY_WIDTH,
                DAY_WIDTH
              );
              const colorClass = colorTagClass(task.column?.statusColor);
              const assignee = task.assignee;

              return (
                <div
                  key={task.id}
                  onMouseEnter={() => setHoveredId(task.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'flex h-9 items-center transition-colors duration-200 ease-soft',
                    idx < tasks.length - 1 && 'border-b border-line',
                    isHovered ? 'bg-hover' : 'bg-card'
                  )}
                >
                  <div
                    className={cn(
                      'sticky left-0 z-[1] flex h-full shrink-0 items-center gap-1.5 overflow-hidden border-r border-line pr-3 pl-[18px] transition-colors duration-200 ease-soft',
                      isHovered ? 'bg-fill' : 'bg-card'
                    )}
                    style={{ width: LABEL_WIDTH }}
                  >
                    <span
                      className={cn(
                        'shrink-0 text-[12.5px] leading-none font-medium tabular-nums',
                        isHovered ? 'text-ink' : 'text-muted'
                      )}
                    >
                      {task.cardCode ?? '—'}
                    </span>
                    <span className="truncate text-[12.5px] text-ink-2">
                      {task.title}
                    </span>
                  </div>

                  <div className="relative h-full flex-1">
                    {/* cột hôm nay */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 bg-accent/7"
                      style={{ left: todayIndex * DAY_WIDTH, width: DAY_WIDTH }}
                    />

                    {/* thanh: nền nhạt + chữ cùng tông màu trạng thái; đậm khi rê chuột */}
                    <div
                      title={`${task.cardCode ?? ''} ${task.title ?? ''}`.trim()}
                      className={cn(
                        'absolute top-1/2 flex h-[22px] -translate-y-1/2 items-center overflow-hidden rounded-full px-[9px] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--tag)_28%,transparent)] transition-colors duration-200 ease-soft',
                        colorClass,
                        isHovered ? 'bg-(--tag) text-card' : 'tag-color'
                      )}
                      style={{ left: barLeft + 2, width: barWidth - 4 }}
                    >
                      {barWidth > 50 && (
                        <span className="truncate text-xs leading-none font-semibold">
                          {task.title}
                        </span>
                      )}
                    </div>

                    {assignee && (
                      <span
                        title={assignee.displayName}
                        className="absolute top-1/2 z-[1] flex -translate-y-1/2 rounded-full ring-2 ring-card"
                        style={{ left: barLeft + barWidth - 4 }}
                      >
                        <UserAvatar
                          name={assignee.displayName}
                          src={assignee.avatar}
                          size={20}
                        />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* đường hôm nay */}
            {todayIndex >= 0 && todayIndex < totalDays && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 z-[3] w-[1.5px] bg-accent"
                style={{
                  top: HEADER_HEIGHT,
                  left:
                    LABEL_WIDTH + todayIndex * DAY_WIDTH + DAY_WIDTH / 2 - 0.75,
                }}
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default HomeGanttChart;
