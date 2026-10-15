'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Shapes, UserRound } from 'lucide-react';

import {
  FilterPill,
  type FilterPillOption,
} from '@/components/search/filter-pill';
import { ColorTag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useIssueType } from '@/hooks/use-issue-type';
import { useUserBoard } from '@/hooks/use-user-board';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { cn } from '@/lib/utils';
import type { EntityId, UserBoardMember } from '@/config/interface';

export interface BoardFilterValue {
  issueTypeId: string;
  assigneeUserId: string;
}

interface BoardFiltersProps {
  boardId: EntityId;
  value: BoardFilterValue;
  totalCards: number;
  visibleCards: number;
  onChange: (value: BoardFilterValue) => void;
}

const LIST_PARAMS = { skip: 0, limit: 100 };

const getDisplayName = (user: UserBoardMember): string => {
  return user.displayName || user.username || user.email || String(user.userId);
};

/**
 * Thanh lọc của board: viên lọc loại công việc + người được giao (chọn một),
 * nút "Việc của tôi" dạng avatar, số thẻ đang hiện / tổng và nút xoá lọc.
 */
function BoardFilters({
  boardId,
  value,
  totalCards,
  visibleCards,
  onChange,
}: BoardFiltersProps) {
  const { t } = useTranslation();
  const currentUser = useSelector(selectCurrentUser);
  const { issueTypes, isLoading: isIssueTypesLoading } = useIssueType(
    boardId,
    LIST_PARAMS
  );
  const { listUser, isLoading: isUsersLoading } = useUserBoard(
    boardId,
    LIST_PARAMS
  );

  const issueTypeOptions = useMemo<FilterPillOption[]>(
    () =>
      issueTypes.map(issueType => ({
        value: issueType.id.toString(),
        label: (
          <ColorTag color={issueType.statusColor} className="font-medium">
            {issueType.name}
          </ColorTag>
        ),
      })),
    [issueTypes]
  );

  const assigneeOptions = useMemo<FilterPillOption[]>(
    () =>
      listUser.items.map(user => {
        const displayName = getDisplayName(user);
        return {
          value: user.userId.toString(),
          label: displayName,
          icon: <UserAvatar name={displayName} src={user.avatar} size={22} />,
        };
      }),
    [listUser.items]
  );

  const hasActiveFilter = Boolean(value.issueTypeId || value.assigneeUserId);

  const currentUserId = currentUser ? String(currentUser.id) : '';
  const isAssignedToMe =
    Boolean(currentUserId) && value.assigneeUserId === currentUserId;

  const handleReset = () => {
    onChange({
      issueTypeId: '',
      assigneeUserId: '',
    });
  };

  const handleToggleAssignedToMe = () => {
    if (!currentUserId) return;
    onChange({
      ...value,
      assigneeUserId: isAssignedToMe ? '' : currentUserId,
    });
  };

  return (
    <div
      role="group"
      aria-label={t('common.searchTitle')}
      className="flex min-h-[34px] flex-none flex-wrap items-center gap-2 px-4 py-3 lg:px-5"
    >
      <FilterPill
        label={t('issues.filters.issueType')}
        icon={<Shapes aria-hidden="true" />}
        options={issueTypeOptions}
        value={value.issueTypeId ? [value.issueTypeId] : []}
        multiple={false}
        disabled={isIssueTypesLoading}
        searchPlaceholder={t('issues.filters.issueTypePlaceholder')}
        onChange={next => onChange({ ...value, issueTypeId: next[0] ?? '' })}
      />
      <FilterPill
        label={t('issues.filters.assignee')}
        icon={<UserRound aria-hidden="true" />}
        options={assigneeOptions}
        value={value.assigneeUserId ? [value.assigneeUserId] : []}
        multiple={false}
        disabled={isUsersLoading}
        menuWidth={288}
        searchPlaceholder={t('issues.filters.assigneePlaceholder')}
        onChange={next => onChange({ ...value, assigneeUserId: next[0] ?? '' })}
      />

      {currentUser && (
        <button
          type="button"
          onClick={handleToggleAssignedToMe}
          aria-pressed={isAssignedToMe}
          title={t('issues.filters.assignedToMe')}
          aria-label={t('issues.filters.assignedToMe')}
          className={cn(
            'press inline-flex h-[34px] items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13.5px] font-medium transition-colors duration-200 ease-soft',
            isAssignedToMe
              ? 'bg-accent-soft text-accent-text'
              : 'bg-card text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] hover:bg-fill'
          )}
        >
          <UserAvatar
            name={currentUser.displayName || currentUser.email}
            src={currentUser.avatar}
            size={26}
            className={cn(
              isAssignedToMe &&
                'shadow-[0_0_0_2px_var(--accent-soft),0_0_0_3.5px_var(--accent)]'
            )}
          />
          {t('issues.filters.assignedToMe')}
        </button>
      )}

      <div className="min-w-2 flex-1" />

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-muted"
        >
          {t('common.filter.clear')}
        </Button>
      )}
      <span
        className="whitespace-nowrap text-[13.5px] text-muted tabular-nums"
        aria-live="polite"
      >
        {hasActiveFilter
          ? t('board.filters.visibleOfTotal', {
              visible: visibleCards,
              total: totalCards,
            })
          : t('issues.list.count', { count: totalCards })}
      </span>
    </div>
  );
}

export default BoardFilters;
