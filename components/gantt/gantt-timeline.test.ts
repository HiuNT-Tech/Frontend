import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';

import type { Card, Version } from '@/config/interface';
import {
  barGeometry,
  buildRange,
  buildTicks,
  getCardSpan,
  groupByVersion,
  sortBySchedule,
  splitScheduled,
  toApiDate,
  weekdayIndex,
} from './gantt-timeline';

const card = (
  id: number,
  startDate: string | null,
  dueDate: string | null,
  versionId: number | null = null
): Card =>
  ({
    id,
    startDate,
    dueDate,
    versionId,
    title: `Card ${id}`,
  }) as unknown as Card;

const version = (
  id: number,
  name: string,
  startDate: string | null,
  endDate: string | null
): Version => ({ id, name, startDate, endDate });

// Thứ Hai 2026-06-15 → toàn bộ test không phụ thuộc ngày chạy.
const TODAY = dayjs('2026-06-15');

describe('getCardSpan', () => {
  it('uses both dates, inclusive', () => {
    const span = getCardSpan(card(1, '2026-06-01', '2026-06-05'))!;
    expect(toApiDate(span.start)).toBe('2026-06-01');
    expect(toApiDate(span.end)).toBe('2026-06-05');
  });

  it('falls back to a one-day span when only one date exists', () => {
    const onlyDue = getCardSpan(card(1, null, '2026-06-05'))!;
    expect(toApiDate(onlyDue.start)).toBe('2026-06-05');
    expect(toApiDate(onlyDue.end)).toBe('2026-06-05');
    expect(getCardSpan(card(1, null, null))).toBeNull();
  });

  it('never lets the due date precede the start date', () => {
    const span = getCardSpan(card(1, '2026-06-10', '2026-06-05'))!;
    expect(toApiDate(span.end)).toBe('2026-06-10');
  });
});

describe('buildRange', () => {
  it('wraps every span, every version and today with padding', () => {
    const range = buildRange({
      spans: [getCardSpan(card(1, '2026-06-20', '2026-06-25'))!],
      versions: [version(1, 'v1', '2026-06-01', '2026-07-10')],
      today: TODAY,
      scale: 'month',
    });

    expect(toApiDate(range.startDay)).toBe('2026-05-25'); // 1/6 − 7 ngày
    expect(range.totalDays).toBe(
      dayjs('2026-07-17').diff(range.startDay, 'day') + 1 // 10/7 + 7 ngày
    );
    expect(range.todayIndex).toBe(21);
  });

  it('expands to the minimum width around today when there is nothing', () => {
    const range = buildRange({ spans: [], today: TODAY, scale: 'week' });
    expect(range.totalDays).toBe(21);
    expect(range.todayIndex).toBeGreaterThan(0);
    expect(range.todayIndex).toBeLessThan(range.totalDays);
  });
});

describe('barGeometry', () => {
  it('positions bars by day offset with the end day included', () => {
    const range = { startDay: dayjs('2026-06-01') };
    const span = getCardSpan(card(1, '2026-06-03', '2026-06-05'))!;
    expect(barGeometry(span, range, 22)).toEqual({ left: 44, width: 66 });
  });
});

describe('buildTicks', () => {
  const range = buildRange({ spans: [], today: TODAY, scale: 'month' });

  it('starts minor ticks on Mondays for the month scale', () => {
    const { minors } = buildTicks(range, 'month');
    const fullWeeks = minors.slice(1, -1);
    expect(fullWeeks.length).toBeGreaterThan(0);
    for (const tick of fullWeeks) {
      expect(weekdayIndex(tick.date)).toBe(0);
      expect(tick.span).toBe(7);
    }
  });

  it('labels every day on the week scale and clips months to the range', () => {
    const { minors, majors } = buildTicks(range, 'week');
    expect(minors).toHaveLength(range.totalDays);
    expect(majors.reduce((sum, m) => sum + m.span, 0)).toBe(range.totalDays);
    expect(majors[0].index).toBe(0);
  });
});

describe('grouping and sorting', () => {
  it('groups by version in start-date order with no-version last', () => {
    const versions = [
      version(2, 'v2', '2026-07-01', '2026-07-31'),
      version(1, 'v1', '2026-06-01', '2026-06-30'),
      version(3, 'empty', null, null),
    ];
    const cards = [
      card(1, '2026-06-01', '2026-06-02', 2),
      card(2, '2026-06-01', '2026-06-02', null),
      card(3, '2026-06-01', '2026-06-02', 1),
      card(4, '2026-06-01', '2026-06-02', 999), // version đã bị xoá
    ];

    const groups = groupByVersion(cards, versions);

    expect(groups.map(g => g.key)).toEqual([
      'version-1',
      'version-2',
      'no-version',
    ]);
    expect(groups[2].cards.map(c => c.id)).toEqual([2, 4]);
  });

  it('sorts by start then end and splits unscheduled cards', () => {
    const cards = [
      card(1, '2026-06-10', '2026-06-20'),
      card(2, null, null),
      card(3, '2026-06-10', '2026-06-12'),
      card(4, '2026-06-01', '2026-06-02'),
    ];

    const { scheduled, unscheduled } = splitScheduled(sortBySchedule(cards));

    expect(scheduled.map(c => c.id)).toEqual([4, 3, 1]);
    expect(unscheduled.map(c => c.id)).toEqual([2]);
  });
});
