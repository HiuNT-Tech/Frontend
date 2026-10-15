'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ColorDot } from '@/components/ui/tag';
import type { EntityId } from '@/config/interface';
import type { AiCardSummary } from '@/types/ai-assistant';

interface CardChipListProps {
  boardId: EntityId;
  items: AiCardSummary[];
  total: number;
  className?: string;
}

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

/**
 * Card do tool trả về: viên thuốc nhỏ (chấm trạng thái + mã + tiêu đề), bấm mở
 * chi tiết. Trạng thái / người làm / hạn / ưu tiên nằm trong tooltip; hạn quá
 * hạn hiện luôn vì quan trọng.
 */
export function CardChipList({
  boardId,
  items,
  total,
  className,
}: CardChipListProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div className={cn('min-w-0', className)}>
      <ul className="flex flex-wrap gap-[7px]">
        {items.map(card => {
          const due = formatDate(card.dueDate);
          const details = [
            card.column.title,
            card.priority != null
              ? t(PRIORITY_KEY[card.priority] ?? 'common.unknown')
              : null,
            card.assignee?.displayName,
            due,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <li key={card.id} className="min-w-0 max-w-full">
              <Link
                href={`/project/${boardId}/issues/${card.id}`}
                title={`${card.cardCode} ${card.title}\n${details}`}
                className="press inline-flex max-w-full items-center gap-[7px] rounded-full bg-fill py-1.5 pl-2.5 pr-[11px] text-[13px] font-medium text-ink transition-[background-color,transform] duration-200 ease-soft hover:bg-track"
              >
                <ColorDot color={card.column.statusColor} />
                <span className="flex-none text-xs font-medium tabular-nums text-muted">
                  {card.cardCode}
                </span>
                <span className="max-w-[210px] truncate">{card.title}</span>
                {due && card.isOverdue && (
                  <span className="flex-none text-xs font-semibold tabular-nums text-danger">
                    {due}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      {total > items.length && (
        <p className="mt-2 text-[12.5px] text-muted">
          {t('aiAssistant.moreCards', { count: total - items.length })}
        </p>
      )}
    </div>
  );
}
