'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getIssueTypeBadgeClassName } from '@/constant/data';
import type { EntityId } from '@/config/interface';
import type { AiCardSummary } from '@/types/ai-assistant';

interface CardChipListProps {
  boardId: EntityId;
  items: AiCardSummary[];
  total: number;
  className?: string;
}

const PRIORITY_CLASS: Record<number, string> = {
  1: 'bg-theme-neutral-3 text-theme-neutral-8',
  2: 'bg-amber-100 text-amber-800',
  3: 'bg-red-100 text-red-700',
};

const PRIORITY_KEY: Record<number, string> = {
  1: 'issues.priority.low',
  2: 'issues.priority.normal',
  3: 'issues.priority.high',
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year.slice(2)}`;
};

/** Danh sách card do tool trả về — click mở trang chi tiết. */
export function CardChipList({
  boardId,
  items,
  total,
  className,
}: CardChipListProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-theme-neutral-5/70',
        className
      )}
    >
      <ul className="divide-y divide-theme-neutral-4">
        {items.map(card => (
          <li key={card.id}>
            <Link
              href={`/project/${boardId}/issues/${card.id}`}
              className="flex flex-col gap-1 px-3 py-2 transition-colors hover:bg-theme-neutral-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="mr-1.5 text-xs font-semibold text-theme-main-6">
                    {card.cardCode}
                  </span>
                  <span className="text-sm text-theme-neutral-11">
                    {card.title}
                  </span>
                </div>
                {card.priority != null && (
                  <span
                    className={cn(
                      'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                      PRIORITY_CLASS[card.priority] ?? PRIORITY_CLASS[1]
                    )}
                  >
                    {t(PRIORITY_KEY[card.priority] ?? 'common.unknown')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-theme-neutral-7">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    getIssueTypeBadgeClassName(card.column.statusColor),
                    'min-w-0'
                  )}
                >
                  {card.column.title}
                </span>
                {card.assignee && <span>👤 {card.assignee.displayName}</span>}
                {card.dueDate && (
                  <span
                    className={cn(
                      card.isOverdue && 'font-semibold text-red-600'
                    )}
                  >
                    {card.isOverdue ? '⏰ ' : '📅 '}
                    {formatDate(card.dueDate)}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {total > items.length && (
        <div className="border-t border-theme-neutral-4 bg-theme-neutral-2 px-3 py-1.5 text-xs text-theme-neutral-7">
          {t('aiAssistant.moreCards', { count: total - items.length })}
        </div>
      )}
    </div>
  );
}
