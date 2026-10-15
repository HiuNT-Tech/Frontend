'use client';

import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/surface';
import { ColorDot } from '@/components/ui/tag';
import { cn } from '@/lib/utils';

export interface StatusStat {
  id: number | string;
  label: string;
  value: number;
  /** statusColor do người dùng chọn cho cột */
  statusColor?: string | null;
  /** % trên tổng số công việc */
  pct: number;
}

/**
 * Số ô mỗi hàng theo số trạng thái: 4 ô → 2×2 dưới md, 5–6 ô → 3 cột,
 * nhiều hơn → 4 cột. Các ô cách nhau bằng đường kẻ mảnh.
 */
const gridColsFor = (count: number): string => {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  if (count === 4) return 'grid-cols-2 md:grid-cols-4';
  if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
  return 'grid-cols-2 md:grid-cols-4';
};

/** Một ô của thẻ thống kê (thẻ cha vẽ đường kẻ giữa các ô). */
function StatBlock({
  label,
  value,
  statusColor,
  pct,
  className,
}: Omit<StatusStat, 'id'> & { className?: string }) {
  return (
    <div className={cn('min-w-0 px-3 pt-4 pb-3.5 text-center', className)}>
      <div className="text-[26px] leading-[1.1] font-bold tracking-[-0.02em] text-ink tabular-nums">
        {value}
      </div>
      <div className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[12.5px] leading-[1.2] text-muted">
        <ColorDot color={statusColor} className="size-[7px]" />
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
        <span className="shrink-0 text-faint tabular-nums">· {pct}%</span>
      </div>
    </div>
  );
}

/** Thẻ đếm công việc theo trạng thái (cột của board), các ô chia bằng hairline. */
export function StatusStatsCard({ stats }: { stats: StatusStat[] }) {
  const { t } = useTranslation();

  return (
    <Card
      as="section"
      aria-label={t('projectHome.stats.label')}
      className="animate-rise overflow-hidden [animation-delay:40ms]"
    >
      {/* -mt-px -ml-px: đường kẻ trên/trái của hàng & cột đầu nằm dưới mép thẻ */}
      <div className={cn('-mt-px -ml-px grid', gridColsFor(stats.length))}>
        {stats.map(stat => (
          <StatBlock
            key={stat.id}
            label={stat.label}
            value={stat.value}
            statusColor={stat.statusColor}
            pct={stat.pct}
            className="border-t border-l border-line"
          />
        ))}
      </div>
    </Card>
  );
}

export function StatusStatsSkeleton() {
  return (
    <Card className="overflow-hidden" aria-hidden="true">
      <div className="-mt-px -ml-px grid grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 border-t border-l border-line px-3 pt-4 pb-3.5"
          >
            <div className="skel h-7 w-10" />
            <div className="skel h-3.5 w-20" />
          </div>
        ))}
      </div>
    </Card>
  );
}
