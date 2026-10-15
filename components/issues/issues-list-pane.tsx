'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { Plus } from 'lucide-react';

import {
  IssuesTable,
  type IssueRow,
} from '@/components/shared/tables/IssuesTable';
import IssuesFilter from '@/components/shared/filters/IssuesFilter';
import { PRIORITY_OPTIONS } from '@/constant/data';
import { useCard } from '@/hooks/use-card';
import { usePagination } from '@/hooks/use-pagination';
import { useUserBoard } from '@/hooks/use-user-board';
import { useVersion } from '@/hooks/use-version';
import { useCurrentProject } from '@/hooks/use-current-project';
import type { Card, CardListParams, EntityId, User } from '@/config/interface';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { buttonVariants } from '@/components/ui/button';
import { Pane } from '@/components/layout/pane';
import { IssueViewSwitcher } from './issue-view-switcher';

/**
 * Cột giữa của màn Issues: bộ lọc + bảng đầy đủ.
 * Nằm trong layout nên giữ nguyên bộ lọc / trang hiện tại khi mở và đóng chi tiết issue.
 */
export function IssuesListPane({ selectedId }: { selectedId?: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const { code, title } = useCurrentProject();
  const boardId =
    toEntityIdOrUndefined(params?.projectId as string) ??
    toEntityIdOrUndefined(searchParams.get('boardId'));
  const pagination = usePagination();
  const [filterParams, setFilterParams] = useState<CardListParams>({});

  useEffect(() => {
    if (!boardId) {
      router.replace('/dashboard');
    }
  }, [boardId, router]);

  const apiParams = {
    ...pagination.apiParams,
    ...filterParams,
  };

  const { cards, totalCount, isLoading } = useCard(boardId, apiParams);
  const { versions } = useVersion(boardId, { skip: 0, limit: 100 });
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });

  const toId = useCallback((value?: EntityId | User | null) => {
    if (!value) return undefined;
    return typeof value === 'number' ? value : value.id;
  }, []);

  const formatDate = useCallback((value?: string | number | null) => {
    return value ? dayjs(value).format('DD/MM/YYYY') : '—';
  }, []);

  const issueRows = useMemo<IssueRow[]>(() => {
    const versionMap = new Map(
      versions.map(version => [version.id, version.name])
    );
    const userMap = new Map(
      listUser.items.map(user => [user.userId, user.displayName])
    );

    const getUserName = (
      value?: EntityId | User | null,
      fallbackId?: EntityId
    ) => {
      if (value && typeof value !== 'number') {
        return value.displayName || '—';
      }

      const userId = toId(value) ?? fallbackId;
      if (!userId) return '—';
      return userMap.get(userId) ?? '—';
    };

    const getPriority = (priorityId?: number | null) => {
      const label = PRIORITY_OPTIONS.find(
        option => option.value === String(priorityId)
      )?.label;

      return label ? { label, value: priorityId } : null;
    };

    const getRegisterBy = (card: Card) => {
      return getUserName(
        card.registeredBy ?? card.createdBy,
        card.registeredByUserId ?? card.createdByUserId ?? undefined
      );
    };

    return cards.map(card => ({
      id: card.id,
      issueType: card.issueType
        ? {
            label: card.issueType.name,
            statusColor: card.issueType.statusColor,
          }
        : null,
      key: card.cardCode ?? '—',
      subject: card.title ?? '—',
      assignee: getUserName(card.assignee, card.assigneeUserId ?? undefined),
      assigneeAvatar: card.assignee?.avatar ?? null,
      status: card.column
        ? {
            label: card.column.title,
            statusColor: card.column.statusColor,
          }
        : null,
      priority: getPriority(card.priority),
      milestone: card.versionId ? (versionMap.get(card.versionId) ?? '—') : '—',
      created: formatDate(card.createdAt),
      startDate: formatDate(card.startDate),
      dueDate: formatDate(card.dueDate),
      dueDateRaw: card.dueDate ?? null,
      estimatedHours: card.estimatedHours ?? '—',
      actualHours: card.actualHours ?? '—',
      registerBy: getRegisterBy(card),
    }));
  }, [cards, formatDate, listUser.items, toId, versions]);

  const { setPage } = pagination;
  const handleSearch = useCallback(
    (params: CardListParams) => {
      setFilterParams(params);
      setPage(1);
    },
    [setPage]
  );

  const openIssue = useCallback(
    (id: EntityId) => {
      router.push(`/project/${boardId}/issues/${id}`);
    },
    [boardId, router]
  );

  const handleRowClick = useCallback(
    (row: IssueRow) => openIssue(row.id),
    [openIssue]
  );

  return (
    <Pane
      title={t('shell.nav.issues')}
      subtitle={[code, title].filter(Boolean).join(' · ') || undefined}
      center={<IssueViewSwitcher />}
      actions={
        boardId ? (
          <Link
            href={`/project/${boardId}/add-issue`}
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus aria-hidden="true" />
            {t('shell.nav.newIssue')}
          </Link>
        ) : undefined
      }
    >
      <div className="flex min-w-0 flex-col gap-4 px-4 pt-4 pb-10 md:px-5">
        <IssuesFilter
          boardId={boardId}
          onSearch={handleSearch}
          summary={
            !isLoading
              ? t('issues.list.count', { count: totalCount })
              : undefined
          }
        />

        <div className="animate-pop min-w-0">
          <IssuesTable
            data={issueRows}
            loading={isLoading}
            totalCount={totalCount}
            page={pagination.page}
            limit={pagination.limit}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setLimit}
            onRowClick={handleRowClick}
            selectedId={selectedId}
          />
        </div>
      </div>
    </Pane>
  );
}
