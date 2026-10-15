'use client';

import { memo, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MessageSquare, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import type { Card as CardType } from '@/config/interface';
import { ColorTag } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PriorityFlag } from '@/components/issues/priority-flag';
import {
  ISSUE_KEY_LINK_CLASS,
  issueFullPageHref,
} from '@/components/issues/issue-inspector';
import { useCardQuickUpdate } from '@/hooks/use-card-quick-update';
import { isOverdue } from '@/utils/due-date';
import { cn } from '@/lib/utils';
import { AssigneePicker } from './assignee-picker';
import { DueDatePicker } from './due-date-picker';

interface CardProps {
  card: CardType;
}

interface CardInnerProps {
  card: CardType;
  assigneeControl: ReactNode;
  dueDateControl: ReactNode;
}

/** Thẻ trắng bo 12px, viền mảnh; đậm viền khi rê chuột, viền accent + quầng khi đang kéo. */
const CARD_CLASS =
  'flex w-full min-w-0 shrink-0 flex-col gap-2 rounded-xl border border-line bg-card px-3.5 py-3 shadow-hair transition-[border-color,box-shadow,transform] duration-200 ease-soft';

const CardInner = memo(function CardInner({
  card,
  assigneeControl,
  dueDateControl,
}: CardInnerProps) {
  const { t } = useTranslation();
  const countComment = card.countComment ?? 0;

  return (
    <>
      {/* Row 1: issue type + key */}
      <div className="flex min-w-0 items-center gap-2">
        {card.issueType && (
          <ColorTag
            color={card.issueType.statusColor}
            className="px-2 py-[2px] text-[11.5px]"
          >
            {card.issueType.name}
          </ColorTag>
        )}
        {card.cardCode && (
          // data-no-dnd: bấm vào mã không bắt đầu kéo; mở trang riêng của issue
          <Link
            href={issueFullPageHref(card.boardId, card.id)}
            data-no-dnd
            onClick={event => event.stopPropagation()}
            className={cn(
              'truncate text-[12.5px] font-medium tabular-nums',
              ISSUE_KEY_LINK_CLASS
            )}
          >
            {card.cardCode}
          </Link>
        )}
      </div>

      {/* Row 2: Title */}
      <h4 className="line-clamp-2 text-sm font-medium leading-[1.4] text-ink">
        {card.title}
      </h4>

      {/* Row 3: priority · due · comments · assignee */}
      <div className="flex items-center gap-2.5 text-muted">
        <PriorityFlag priority={card.priority} />
        {dueDateControl}
        {countComment > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[12.5px] tabular-nums"
            title={t('board.card.comments', { count: countComment })}
          >
            <MessageSquare aria-hidden="true" className="size-[13px]" />
            {countComment}
          </span>
        )}
        <span className="flex-1" />
        {assigneeControl}
      </div>
    </>
  );
});

const StaticAssignee = memo(function StaticAssignee({
  card,
}: {
  card: CardType;
}) {
  const assigneeName = card.assignee?.displayName || card.assignee?.email;

  if (card.assigneeUserId == null) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-faint">
        <Plus aria-hidden="true" className="size-3" />
      </span>
    );
  }

  return (
    <UserAvatar name={assigneeName} src={card.assignee?.avatar} size={24} />
  );
});

const StaticDueDate = memo(function StaticDueDate({
  value,
  overdue,
}: {
  value?: string | null;
  overdue: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full text-[12.5px] font-medium tabular-nums',
        value
          ? overdue
            ? 'bg-danger-soft px-2 text-danger'
            : 'bg-fill px-2 text-ink-2'
          : 'text-faint'
      )}
    >
      <CalendarDays aria-hidden="true" className="size-[13px]" />
      {value && dayjs(value).format('DD/MM')}
    </span>
  );
});

const InteractiveCardInner = memo(function InteractiveCardInner({
  card,
}: CardProps) {
  const overdue = isOverdue(card.dueDate);
  const { assign, setDueDate, isUpdating } = useCardQuickUpdate(card);

  return (
    <CardInner
      card={card}
      assigneeControl={
        <AssigneePicker
          boardId={card.boardId}
          assigneeUserId={card.assigneeUserId}
          assigneeName={card.assignee?.displayName || card.assignee?.email}
          assigneeAvatar={card.assignee?.avatar}
          disabled={isUpdating}
          onPick={assign}
        />
      }
      dueDateControl={
        <DueDatePicker
          value={card.dueDate}
          overdue={overdue}
          disabled={isUpdating}
          onChange={setDueDate}
        />
      }
    />
  );
});

export const CardPreview = memo(function CardPreview({ card }: CardProps) {
  const overdue = isOverdue(card.dueDate);

  return (
    <div
      className={cn(
        CARD_CLASS,
        'pointer-events-none rotate-[1.5deg] border-accent shadow-lift'
      )}
    >
      <CardInner
        card={card}
        assigneeControl={<StaticAssignee card={card} />}
        dueDateControl={
          <StaticDueDate value={card.dueDate} overdue={overdue} />
        }
      />
    </div>
  );
});

/** Phần tử tương tác bên trong thẻ: bấm vào đó không mở chi tiết. */
const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, [role="dialog"], [data-no-dnd]';

function CardBase({ card }: CardProps) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: card,
  });

  const dndKitCardStyles: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    willChange: 'transform',
  };

  // Mở chi tiết issue (inspector cạnh danh sách) khi bấm thẻ mà không kéo
  // (sensor chỉ bắt đầu kéo sau khi di chuyển 10px) và không bấm vào picker/nút bên trong.
  // Enter trên thẻ đang focus cũng mở (board không dùng KeyboardSensor nên phím này còn trống).
  const openDetail = useCallback(
    (
      event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
    ) => {
      if (isDragging) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return;
      if ('key' in event && event.key !== 'Enter') return;
      router.push(`/project/${card.boardId}/issues/${card.id}`);
    },
    [card.boardId, card.id, isDragging, router]
  );

  return (
    <article
      ref={setNodeRef}
      style={dndKitCardStyles}
      {...attributes}
      {...listeners}
      onClick={openDetail}
      onKeyDown={openDetail}
      className={cn(
        CARD_CLASS,
        'relative cursor-grab active:cursor-grabbing hover:border-line-strong hover:shadow-card',
        isDragging && 'border-accent ring-[3px] ring-accent-soft'
      )}
    >
      <InteractiveCardInner card={card} />
    </article>
  );
}

export const Card = memo(CardBase);
