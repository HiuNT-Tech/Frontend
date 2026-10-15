'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

/** Hai khung hình liền nhau rồi mới đặt giá trị → CSS transition chạy từ 0. */
function useAfterPaint<T>(value: T, initial: T): T {
  const [current, setCurrent] = useState<T>(initial);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setCurrent(value));
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return current;
}

/* Ba cột thẻ của một board — nét mảnh, mờ dần về bên trái, nằm sau nội dung. */
const BOARD_PATHS = [
  'M24 22h44v156H24zM80 22h44v112H80zM136 22h44v136h-44z',
  'M32 38h28v24H32zM32 70h28v24H32zM32 102h28v24H32z',
  'M88 38h28v24H88zM88 70h28v24H88z',
  'M144 38h28v24h-28zM144 70h28v24h-28zM144 102h28v24h-28z',
];

/** Hình vẽ board mờ ở góc thẻ hero — tự vẽ một lần khi xuất hiện. */
export function BoardArt({ active }: { active: boolean }) {
  const drawn = useAfterPaint(true, false);

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -top-12 -right-[22px] size-[176px] transition-colors duration-500 ease-soft',
        '[mask-image:linear-gradient(to_left,var(--ink)_35%,transparent_82%)]',
        active ? 'text-accent/25' : 'text-line'
      )}
    >
      {BOARD_PATHS.map((d, i) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeDasharray={1}
          strokeDashoffset={drawn ? 0 : 1}
          className="transition-[stroke-dashoffset] duration-[1100ms] ease-soft"
          style={{ transitionDelay: `${i * 120}ms` }}
        />
      ))}
    </svg>
  );
}

export interface ProgressHeroProps {
  /** Dòng trạng thái nhỏ phía trên (vd. "Milestone hiện tại") */
  kicker: string;
  /** true = đang chạy → chấm và hình vẽ ngả màu accent */
  active?: boolean;
  title: string;
  description?: string;
  /** 0–100 */
  pct: number;
}

/**
 * Phần tử "to" duy nhất của trang chủ dự án: tiến độ (milestone đang chạy hoặc
 * toàn dự án) + thanh tiến độ 8px với số % ở cuối.
 */
export function ProgressHero({
  kicker,
  active = false,
  title,
  description,
  pct,
}: ProgressHeroProps) {
  const { t } = useTranslation();
  const barPct = useAfterPaint(pct, 0);

  return (
    <Card
      as="section"
      aria-label={kicker}
      className="animate-rise relative overflow-hidden px-[22px] pt-[22px] pb-5"
    >
      <BoardArt active={active} />

      <div className="relative min-w-0">
        <div
          className={cn(
            'mb-2.5 inline-flex items-center gap-2 text-[13px] leading-none font-semibold',
            active ? 'text-accent' : 'text-muted'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-2 rounded-full',
              active ? 'bg-accent' : 'bg-line-strong'
            )}
          />
          {kicker}
        </div>
        <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.02em] text-balance text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-[1.45] text-muted tabular-nums">
            {description}
          </p>
        )}
      </div>

      <div className="relative mt-[18px] flex items-center gap-3.5">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('projectHome.hero.progress')}
          className="h-2 flex-1 overflow-hidden rounded-full bg-fill"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-900 ease-soft"
            style={{ width: `${barPct}%` }}
          />
        </div>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-[22px] leading-none font-bold tracking-[-0.02em] text-ink tabular-nums">
            {pct}%
          </span>
          <span className="text-[12.5px] leading-none text-muted">
            {t('projectHome.sprint.complete')}
          </span>
        </div>
      </div>
    </Card>
  );
}

/** Khung chờ cùng hình dạng với thẻ hero. */
export function ProgressHeroSkeleton() {
  return (
    <Card className="px-[22px] pt-[22px] pb-5" aria-hidden="true">
      <div className="skel mb-3 h-3.5 w-32" />
      <div className="skel h-7 w-[min(260px,70%)]" />
      <div className="skel mt-2.5 h-4 w-[min(320px,85%)]" />
      <div className="mt-[18px] flex items-center gap-3.5">
        <div className="skel h-2 flex-1" />
        <div className="skel h-6 w-24" />
      </div>
    </Card>
  );
}
