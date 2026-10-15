import dayjs, { type Dayjs } from 'dayjs';

import type { Card, EntityId, Version } from '@/config/interface';

/**
 * Logic thuần của biểu đồ Gantt (không dính React): thang thời gian, vị trí
 * thanh, mốc tháng / tuần, kéo đổi ngày và nhóm theo version. Dùng chung cho
 * tab Gantt và widget rút gọn ở trang Home; có unit test riêng.
 */

export type GanttScale = 'week' | 'month' | 'quarter';

/** Độ rộng một ngày (px) theo thang. */
export const DAY_WIDTH: Record<GanttScale, number> = {
  week: 44,
  month: 22,
  quarter: 9,
};

/** Đệm hai đầu (ngày) để thanh đầu / cuối không dính mép. */
const RANGE_PADDING: Record<GanttScale, number> = {
  week: 3,
  month: 7,
  quarter: 14,
};

/** Số ngày tối thiểu để biểu đồ không quá ngắn khi chỉ có vài issue. */
const MIN_TOTAL_DAYS: Record<GanttScale, number> = {
  week: 21,
  month: 42,
  quarter: 120,
};

export const toDay = (value: string | number | Dayjs): Dayjs =>
  dayjs(value).startOf('day');

/** Định dạng ngày gửi API. */
export const toApiDate = (value: Dayjs): string => value.format('YYYY-MM-DD');

/** Khoảng ngày của một thanh (kể cả ngày cuối). */
export interface DateSpan {
  start: Dayjs;
  end: Dayjs;
}

/**
 * Khoảng thời gian vẽ thanh của một card. Chỉ có một trong hai ngày thì thanh
 * dài một ngày tại ngày đó; ngày đến hạn trước ngày bắt đầu thì kéo về bằng nhau.
 */
export const getCardSpan = (card: Pick<Card, 'startDate' | 'dueDate'>) => {
  if (!card.startDate && !card.dueDate) return null;
  const start = toDay(card.startDate ?? card.dueDate!);
  const rawEnd = toDay(card.dueDate ?? card.startDate!);
  const end = rawEnd.isBefore(start) ? start : rawEnd;
  return { start, end } satisfies DateSpan;
};

export const isScheduled = (card: Pick<Card, 'startDate' | 'dueDate'>) =>
  getCardSpan(card) !== null;

/** Tách card có lịch và chưa có lịch, giữ nguyên thứ tự. */
export const splitScheduled = <T extends Pick<Card, 'startDate' | 'dueDate'>>(
  cards: T[]
) => {
  const scheduled: T[] = [];
  const unscheduled: T[] = [];
  for (const card of cards) {
    (isScheduled(card) ? scheduled : unscheduled).push(card);
  }
  return { scheduled, unscheduled };
};

export interface GanttRange {
  /** Ngày đầu tiên của trục (00:00) */
  startDay: Dayjs;
  totalDays: number;
  /** Offset ngày hôm nay so với startDay (có thể ngoài [0, totalDays)) */
  todayIndex: number;
}

/**
 * Khoảng thời gian hiển thị: bao trọn mọi thanh, mọi version có ngày và hôm
 * nay, cộng đệm hai đầu, không ngắn hơn mức tối thiểu của thang.
 */
export const buildRange = ({
  spans,
  versions = [],
  today = dayjs(),
  scale,
}: {
  spans: DateSpan[];
  versions?: Pick<Version, 'startDate' | 'endDate'>[];
  today?: Dayjs;
  scale: GanttScale;
}): GanttRange => {
  const todayDay = toDay(today);
  const times = [todayDay.valueOf()];
  for (const span of spans)
    times.push(span.start.valueOf(), span.end.valueOf());
  for (const version of versions) {
    if (version.startDate) times.push(toDay(version.startDate).valueOf());
    if (version.endDate) times.push(toDay(version.endDate).valueOf());
  }

  const padding = RANGE_PADDING[scale];
  let startDay = dayjs(Math.min(...times)).subtract(padding, 'day');
  let endDay = dayjs(Math.max(...times)).add(padding, 'day');

  const minDays = MIN_TOTAL_DAYS[scale];
  const span = endDay.diff(startDay, 'day') + 1;
  if (span < minDays) {
    // Nới đều hai phía để hôm nay / các thanh vẫn ở giữa.
    const extra = minDays - span;
    startDay = startDay.subtract(Math.floor(extra / 2), 'day');
    endDay = endDay.add(Math.ceil(extra / 2), 'day');
  }

  return {
    startDay,
    totalDays: endDay.diff(startDay, 'day') + 1,
    todayIndex: todayDay.diff(startDay, 'day'),
  };
};

/** Offset ngày của một mốc so với đầu trục. */
export const dayOffset = (date: Dayjs, range: Pick<GanttRange, 'startDay'>) =>
  toDay(date).diff(range.startDay, 'day');

/** Vị trí và độ rộng thanh (px) trên trục, ngày cuối tính trọn. */
export const barGeometry = (
  span: DateSpan,
  range: Pick<GanttRange, 'startDay'>,
  dayWidth: number
) => {
  const startIndex = dayOffset(span.start, range);
  const endIndex = dayOffset(span.end, range);
  return {
    left: startIndex * dayWidth,
    width: (endIndex - startIndex + 1) * dayWidth,
  };
};

/** Thứ trong tuần với Thứ Hai = 0 … Chủ Nhật = 6 (không phụ thuộc locale). */
export const weekdayIndex = (date: Dayjs) => (date.day() + 6) % 7;

export const isWeekend = (date: Dayjs) => weekdayIndex(date) >= 5;

export interface GanttTick {
  /** Offset ngày bắt đầu */
  index: number;
  /** Số ngày ô này chiếm (bị cắt ở mép trục) */
  span: number;
  label: string;
  date: Dayjs;
}

/**
 * Hai hàng nhãn của header: hàng trên là tháng, hàng dưới là ngày (thang tuần)
 * hoặc tuần bắt đầu Thứ Hai (thang tháng / quý).
 */
export const buildTicks = (range: GanttRange, scale: GanttScale) => {
  const { startDay, totalDays } = range;
  const endExclusive = startDay.add(totalDays, 'day');

  const majors: GanttTick[] = [];
  let cursor = startDay.startOf('month');
  while (cursor.isBefore(endExclusive)) {
    const next = cursor.add(1, 'month');
    const from = Math.max(dayOffset(cursor, range), 0);
    const to = Math.min(dayOffset(next, range), totalDays);
    if (to > from) {
      majors.push({
        index: from,
        span: to - from,
        label: cursor.format(cursor.month() === 0 ? 'MMM YYYY' : 'MMM'),
        date: cursor,
      });
    }
    cursor = next;
  }

  const minors: GanttTick[] = [];
  if (scale === 'week') {
    for (let index = 0; index < totalDays; index += 1) {
      const date = startDay.add(index, 'day');
      minors.push({ index, span: 1, label: date.format('D'), date });
    }
  } else {
    let week = startDay.subtract(weekdayIndex(startDay), 'day');
    while (week.isBefore(endExclusive)) {
      const next = week.add(7, 'day');
      const from = Math.max(dayOffset(week, range), 0);
      const to = Math.min(dayOffset(next, range), totalDays);
      if (to > from) {
        minors.push({
          index: from,
          span: to - from,
          label: week.format('D/M'),
          date: week,
        });
      }
      week = next;
    }
  }

  return { majors, minors };
};

/** Đổi quãng kéo (px) sang số ngày, làm tròn về ngày gần nhất. */
export const pxToDays = (px: number, dayWidth: number) =>
  Math.round(px / dayWidth);

export type DragMode = 'move' | 'start' | 'end';

/**
 * Khoảng mới sau khi kéo cả thanh hoặc một mép; mép không vượt qua mép kia
 * (thanh ngắn nhất là một ngày).
 */
export const applyDrag = (
  span: DateSpan,
  mode: DragMode,
  deltaDays: number
): DateSpan => {
  if (deltaDays === 0) return span;
  if (mode === 'move') {
    return {
      start: span.start.add(deltaDays, 'day'),
      end: span.end.add(deltaDays, 'day'),
    };
  }
  if (mode === 'start') {
    const start = span.start.add(deltaDays, 'day');
    return { start: start.isAfter(span.end) ? span.end : start, end: span.end };
  }
  const end = span.end.add(deltaDays, 'day');
  return {
    start: span.start,
    end: end.isBefore(span.start) ? span.start : end,
  };
};

export interface GanttGroup<T> {
  key: string;
  version: Version | null;
  cards: T[];
}

/**
 * Nhóm card theo version: version có ngày bắt đầu sớm hơn đứng trước, card
 * không thuộc version nào gom vào nhóm cuối. Bỏ nhóm rỗng.
 */
export const groupByVersion = <T extends Pick<Card, 'versionId'>>(
  cards: T[],
  versions: Version[]
): GanttGroup<T>[] => {
  const sortedVersions = [...versions].sort((a, b) => {
    const aStart = a.startDate ? toDay(a.startDate).valueOf() : Infinity;
    const bStart = b.startDate ? toDay(b.startDate).valueOf() : Infinity;
    return aStart - bStart || a.name.localeCompare(b.name);
  });

  const byVersion = new Map<EntityId, T[]>();
  const none: T[] = [];
  const known = new Set(versions.map(v => v.id));
  for (const card of cards) {
    if (card.versionId != null && known.has(card.versionId)) {
      const bucket = byVersion.get(card.versionId) ?? [];
      bucket.push(card);
      byVersion.set(card.versionId, bucket);
    } else {
      none.push(card);
    }
  }

  const groups: GanttGroup<T>[] = [];
  for (const version of sortedVersions) {
    const bucket = byVersion.get(version.id);
    if (bucket?.length) {
      groups.push({ key: `version-${version.id}`, version, cards: bucket });
    }
  }
  if (none.length)
    groups.push({ key: 'no-version', version: null, cards: none });
  return groups;
};

/** Khoảng ngày của version (để tô nền nhóm); thiếu một đầu thì lấy đầu kia. */
export const getVersionSpan = (
  version: Pick<Version, 'startDate' | 'endDate'>
): DateSpan | null =>
  getCardSpan({ startDate: version.startDate, dueDate: version.endDate });

/** Sắp xếp card theo ngày bắt đầu rồi ngày kết thúc; chưa có lịch xếp cuối. */
export const sortBySchedule = <
  T extends Pick<Card, 'startDate' | 'dueDate' | 'id'>,
>(
  cards: T[]
): T[] =>
  [...cards].sort((a, b) => {
    const sa = getCardSpan(a);
    const sb = getCardSpan(b);
    if (!sa && !sb) return a.id - b.id;
    if (!sa) return 1;
    if (!sb) return -1;
    return (
      sa.start.valueOf() - sb.start.valueOf() ||
      sa.end.valueOf() - sb.end.valueOf() ||
      a.id - b.id
    );
  });
