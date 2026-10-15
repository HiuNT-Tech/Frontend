'use client';

import { useState } from 'react';
import { Popover } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Search, UserRoundMinus } from 'lucide-react';
import { BoardService } from '@/lib/apis/board';
import { StateMessage } from '@/components/ui/state-message';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import type {
  EntityId,
  UserBoardMember,
  UsersBoardResponse,
} from '@/config/interface';

interface AssigneePickerProps {
  boardId: EntityId;
  assigneeUserId?: EntityId | null;
  assigneeName?: string;
  assigneeAvatar?: string | null;
  disabled?: boolean;
  onPick: (member: UserBoardMember | null) => void;
}

const ROW_CLASS =
  'flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2 text-left text-sm text-ink transition-colors hover:bg-hover';

/** Gán nhanh người phụ trách ngay trên thẻ: monogram → popover tìm thành viên. */
export function AssigneePicker({
  boardId,
  assigneeUserId,
  assigneeName,
  assigneeAvatar,
  disabled,
  onPick,
}: AssigneePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<UsersBoardResponse>({
    queryKey: ['users', 'board', boardId, { limit: 100 }],
    queryFn: () => BoardService.getUsersBoard(boardId, { limit: 100 }),
    enabled: open && !!boardId,
    staleTime: 30 * 1000,
  });

  const members = (data?.items ?? []).filter(member => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      member.displayName?.toLowerCase().includes(q) ||
      member.email?.toLowerCase().includes(q)
    );
  });

  const handlePick = (member: UserBoardMember | null) => {
    setOpen(false);
    setSearch('');
    onPick(member);
  };

  const content = (
    <div className="w-64" data-no-dnd onClick={e => e.stopPropagation()}>
      <label className="mb-1.5 flex h-9 items-center gap-2 rounded-[10px] bg-fill px-2.5 text-muted">
        <Search aria-hidden="true" className="size-[14px] flex-none" />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('column.assigneePicker.searchPlaceholder')}
          aria-label={t('column.assigneePicker.searchPlaceholder')}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none focus-visible:outline-none"
        />
      </label>
      <ul className="max-h-60 overflow-y-auto">
        <li>
          <button
            type="button"
            onClick={() => handlePick(null)}
            className={cn(ROW_CLASS, assigneeUserId == null && 'bg-fill')}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-muted">
              <UserRoundMinus aria-hidden="true" className="size-3" />
            </span>
            <span className="flex-1 text-ink-2">
              {t('column.assigneePicker.unassign')}
            </span>
          </button>
        </li>

        {isLoading && (
          <StateMessage
            as="li"
            i18nKey="common.loading"
            className="px-2 py-2"
          />
        )}

        {!isLoading && members.length === 0 && (
          <StateMessage
            as="li"
            i18nKey="column.assigneePicker.empty"
            className="px-2 py-2"
          />
        )}

        {members.map(member => {
          const selected = Number(member.userId) === Number(assigneeUserId);
          const name = member.displayName || member.email;
          return (
            <li key={String(member.userId)}>
              <button
                type="button"
                onClick={() => handlePick(member)}
                aria-pressed={selected}
                className={cn(
                  ROW_CLASS,
                  selected &&
                    'bg-accent-soft text-accent-text hover:bg-accent-soft'
                )}
              >
                <UserAvatar name={name} src={member.avatar} size={24} />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {selected && (
                  <Check aria-hidden="true" className="size-4 flex-none" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={value => !disabled && setOpen(value)}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      getPopupContainer={() => document.body}
      content={content}
    >
      <button
        type="button"
        data-no-dnd
        disabled={disabled}
        onClick={e => e.stopPropagation()}
        title={
          assigneeName
            ? t('column.assigneePicker.assignedTo', { name: assigneeName })
            : t('column.assigneePicker.assign')
        }
        aria-label={
          assigneeName
            ? t('column.assigneePicker.assignedTo', { name: assigneeName })
            : t('column.assigneePicker.assign')
        }
        className="press -m-1 grid size-8 shrink-0 place-items-center rounded-full outline-none transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
      >
        {assigneeUserId != null ? (
          <UserAvatar name={assigneeName} src={assigneeAvatar} size={24} />
        ) : (
          <span className="grid size-6 place-items-center rounded-full border border-dashed border-line-strong text-faint transition-colors hover:border-accent hover:text-accent">
            <Plus aria-hidden="true" className="size-3" />
          </span>
        )}
      </button>
    </Popover>
  );
}
