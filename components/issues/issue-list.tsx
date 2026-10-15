'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { Inbox, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Card as CardType, Column } from '@/config/interface';
import { ColorDot, ColorTag } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { PRIORITY_OPTIONS } from '@/constant/data';
import { isOverdue } from '@/utils/due-date';
import { sortByPosition } from '@/utils/sorts';
import Link from 'next/link';
import { PriorityLabel } from './priority-flag';
import { ISSUE_KEY_LINK_CLASS, issueFullPageHref } from './issue-inspector';

const NO_STATUS = 'none';

interface IssueGroup {
  key: string;
  title: string;
  statusColor?: string | null;
  items: CardType[];
}

/** Một hàng trong danh sách kiểu Mail: loại + mã + hạn / tiêu đề / ưu tiên + người làm. */
export function IssueListRow({
  card,
  selected,
  onSelect,
  style,
}: {
  card: CardType;
  selected: boolean;
  onSelect: (card: CardType) => void;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const overdue = isOverdue(card.dueDate);
  const priorityLabel = PRIORITY_OPTIONS.find(
    option => option.value === String(card.priority)
  )?.label;
  const comments = card.countComment ?? 0;
  const assigneeName = card.assignee?.displayName || card.assignee?.email;

  return (
    // div role="button" thay vì <button>: bên trong có link mã ticket (không lồng nút trong nút)
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(card)}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(card);
        }
      }}
      aria-current={selected ? 'true' : undefined}
      style={style}
      className={cn(
        'animate-rise grid w-full cursor-pointer gap-1.5 px-4 py-3 text-left transition-colors duration-200 ease-soft',
        'border-t border-line first:border-t-0',
        selected ? 'bg-accent-soft' : 'hover:bg-hover'
      )}
    >
      <span
        className={cn(
          'flex min-w-0 items-center gap-2 text-[12.5px] font-medium tabular-nums',
          selected ? 'text-accent-text' : 'text-muted'
        )}
      >
        {card.issueType && (
          <ColorTag
            color={card.issueType.statusColor}
            className="px-2 py-[2px] text-[11.5px]"
          >
            {card.issueType.name}
          </ColorTag>
        )}
        {card.cardCode ? (
          <Link
            href={issueFullPageHref(card.boardId, card.id)}
            onClick={event => event.stopPropagation()}
            className={cn('truncate', ISSUE_KEY_LINK_CLASS)}
          >
            {card.cardCode}
          </Link>
        ) : (
          <span className="truncate">—</span>
        )}
        <span className="flex-1" />
        {card.dueDate && (
          <span
            className={cn('flex-none', overdue && 'font-semibold text-danger')}
            title={overdue ? t('board.card.overdue') : t('board.card.due')}
          >
            {dayjs(card.dueDate).format('DD/MM/YYYY')}
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-[14.5px] font-medium leading-[1.4] text-ink">
        {card.title ?? '—'}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-muted">
        {priorityLabel ? (
          <PriorityLabel priority={card.priority} label={priorityLabel} />
        ) : (
          <span className="text-faint">—</span>
        )}
        {comments > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquare aria-hidden="true" className="size-[13px]" />
            {comments}
          </span>
        )}
        <span className="flex-1" />
        {card.assigneeUserId != null ? (
          <UserAvatar
            name={assigneeName}
            src={card.assignee?.avatar}
            size={22}
            className="flex-none"
          />
        ) : (
          <span
            aria-hidden="true"
            className="size-[22px] flex-none rounded-full border border-dashed border-line-strong"
          />
        )}
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {[3, 2].map((rows, group) => (
        <section key={group}>
          <div className="skel mb-2 ml-1.5 h-3.5 w-28" />
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card shadow-card">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="grid gap-2 px-4 py-3">
                <div className="skel h-3 w-32" />
                <div className="skel h-4 w-4/5" />
                <div className="skel h-3 w-24" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Danh sách công việc kiểu Mail: nhóm theo trạng thái (chấm màu + tên + số lượng),
 * mỗi nhóm một thẻ trắng, hàng cách nhau bằng đường kẻ mảnh. ↑/↓ chuyển lựa chọn khi
 * danh sách đang có focus.
 */
export function IssueList({
  cards,
  columns,
  selectedId,
  onSelect,
  loading,
  className,
}: {
  cards: CardType[];
  columns: Column[];
  selectedId?: string;
  onSelect: (card: CardType) => void;
  loading?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo<IssueGroup[]>(() => {
    const byColumn = new Map<string, CardType[]>();
    for (const card of cards) {
      const key = card.column?.id != null ? String(card.column.id) : NO_STATUS;
      const bucket = byColumn.get(key) ?? [];
      bucket.push(card);
      byColumn.set(key, bucket);
    }

    const ordered: IssueGroup[] = [];
    for (const column of sortByPosition(columns)) {
      const items = byColumn.get(String(column.id));
      if (!items?.length) continue;
      byColumn.delete(String(column.id));
      ordered.push({
        key: String(column.id),
        title: column.title,
        statusColor: column.statusColor,
        items,
      });
    }
    // Trạng thái không còn trong danh sách cột (hoặc chưa tải cột): dùng thông tin trên card.
    for (const [key, items] of byColumn) {
      ordered.push({
        key,
        title:
          key === NO_STATUS
            ? t('issues.list.noStatus')
            : (items[0].column?.title ?? t('issues.list.noStatus')),
        statusColor: items[0].column?.statusColor,
        items,
      });
    }
    return ordered;
  }, [cards, columns, t]);

  const flat = useMemo(() => groups.flatMap(group => group.items), [groups]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (!flat.length) return;
    event.preventDefault();
    const at = flat.findIndex(card => String(card.id) === String(selectedId));
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      at < 0
        ? step > 0
          ? 0
          : flat.length - 1
        : Math.min(flat.length - 1, Math.max(0, at + step));
    const next = flat[nextIndex];
    if (next && String(next.id) !== String(selectedId)) onSelect(next);
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      '[aria-current="true"]'
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  if (loading && cards.length === 0) {
    return <ListSkeleton />;
  }

  if (!flat.length) {
    return (
      <EmptyState
        card
        icon={<Inbox strokeWidth={1.5} aria-hidden="true" />}
        title={t('issues.list.empty.title')}
        description={t('issues.list.empty.description')}
      />
    );
  }

  let index = 0;
  return (
    <div
      ref={listRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-label={t('shell.nav.issues')}
      aria-busy={loading || undefined}
      className={cn(
        'space-y-5 rounded-card outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-accent/40',
        loading && 'opacity-60',
        className
      )}
    >
      {groups.map(group => (
        <section key={group.key} aria-label={group.title}>
          <h3 className="flex items-center gap-2 px-1.5 pb-2 text-[13px] font-semibold text-muted">
            <ColorDot color={group.statusColor} />
            <span className="truncate">{group.title}</span>
            <span className="font-medium tabular-nums">
              {group.items.length}
            </span>
          </h3>
          <div className="overflow-hidden rounded-card border border-line bg-card shadow-card">
            {group.items.map(card => (
              <IssueListRow
                key={card.id}
                card={card}
                selected={String(card.id) === String(selectedId)}
                onSelect={onSelect}
                style={{ animationDelay: `${Math.min(index++, 12) * 45}ms` }}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
