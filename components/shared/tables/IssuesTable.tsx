'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  ISSUE_KEY_LINK_CLASS,
  issueFullPageHref,
} from '@/components/issues/issue-inspector';

import { CustomTable, type TableColumn } from '@/components/ui/custome-table';
import { ColorTag } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PriorityLabel } from '@/components/issues/priority-flag';
import type { EntityId } from '@/config/interface';
import { isOverdue } from '@/utils/due-date';
import { cn } from '@/lib/utils';

export interface IssueBadgeValue {
  label: string;
  statusColor?: string | null;
}

export interface IssuePriorityValue {
  label: string;
  /** Giá trị số từ API (1/2/3) — dùng để tô màu giống màn chi tiết ticket */
  value?: number | null;
}

export interface IssueRow {
  id: EntityId;
  issueType: IssueBadgeValue | null;
  key: string;
  subject: string;
  assignee: string;
  assigneeAvatar?: string | null;
  status: IssueBadgeValue | null;
  priority: IssuePriorityValue | null;
  milestone: string;
  created: string;
  startDate: string;
  dueDate: string;
  /** Giá trị gốc từ API — dùng để so với thời điểm hiện tại và bôi đỏ khi quá hạn */
  dueDateRaw?: string | null;
  estimatedHours: string;
  actualHours: string;
  registerBy: string;
}

const dash = <span className="text-faint">—</span>;

export interface IssuesTableProps {
  data: IssueRow[];
  loading?: boolean;
  totalCount?: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  onRowClick?: (row: IssueRow) => void;
  /** Issue đang mở trong inspector — tô nền accent nhạt */
  selectedId?: string | number;
}

export const IssuesTable: React.FC<IssuesTableProps> = ({
  data,
  loading,
  totalCount,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  selectedId,
}) => {
  const { t } = useTranslation();
  const params = useParams<{ projectId?: string }>();
  const projectId = params?.projectId;

  const renderBadge = useCallback((value?: IssueBadgeValue | null) => {
    if (!value?.label) return dash;
    return <ColorTag color={value.statusColor}>{value.label}</ColorTag>;
  }, []);

  const renderPriority = useCallback((value?: IssuePriorityValue | null) => {
    if (!value?.label) return dash;
    return (
      <PriorityLabel
        priority={value.value}
        label={value.label}
        className="text-[13.5px]"
      />
    );
  }, []);

  const columns = useMemo<TableColumn<IssueRow>[]>(
    () => [
      {
        key: 'issueType',
        title: t('issues.table.issueType'),
        dataIndex: 'issueType',
        minWidth: 140,
        render: value => renderBadge(value),
      },
      {
        key: 'key',
        title: t('issues.table.key'),
        dataIndex: 'key',
        minWidth: 110,
        // Bấm vào mã → mở trang riêng (stopPropagation để không mở inspector của dòng)
        render: (value, record) =>
          projectId ? (
            <Link
              href={issueFullPageHref(projectId, record.id)}
              onClick={event => event.stopPropagation()}
              className={cn(
                'text-[12.5px] font-medium tabular-nums',
                ISSUE_KEY_LINK_CLASS
              )}
            >
              {value}
            </Link>
          ) : (
            <span className="text-[12.5px] font-medium text-muted tabular-nums">
              {value}
            </span>
          ),
      },
      {
        key: 'subject',
        title: t('issues.table.subject'),
        dataIndex: 'subject',
        minWidth: 260,
        render: value => (
          <span className="block max-w-[420px] truncate font-medium text-ink">
            {value}
          </span>
        ),
      },
      {
        key: 'assignee',
        title: t('issues.table.assignee'),
        dataIndex: 'assignee',
        minWidth: 160,
        render: (value, record) =>
          value && value !== '—' ? (
            <span className="inline-flex items-center gap-2 text-ink-2">
              <UserAvatar name={value} src={record.assigneeAvatar} size={22} />
              {value}
            </span>
          ) : (
            dash
          ),
      },
      {
        key: 'status',
        title: t('issues.table.status'),
        dataIndex: 'status',
        minWidth: 140,
        render: value => renderBadge(value),
      },
      {
        key: 'priority',
        title: t('issues.table.priority'),
        dataIndex: 'priority',
        minWidth: 120,
        render: value => renderPriority(value),
      },
      {
        key: 'milestone',
        title: t('issues.table.milestone'),
        dataIndex: 'milestone',
        minWidth: 140,
      },
      {
        key: 'created',
        title: t('issues.table.created'),
        dataIndex: 'created',
        minWidth: 140,
      },
      {
        key: 'startDate',
        title: t('issues.table.startDate'),
        dataIndex: 'startDate',
        minWidth: 140,
      },
      {
        key: 'dueDate',
        title: t('issues.table.dueDate'),
        dataIndex: 'dueDate',
        minWidth: 140,
        render: (value, record) => (
          <span
            className={cn(
              'tabular-nums',
              isOverdue(record.dueDateRaw)
                ? 'font-semibold text-danger'
                : 'text-ink-2'
            )}
          >
            {value}
          </span>
        ),
      },
      {
        key: 'estimatedHours',
        title: t('issues.table.estimatedHours'),
        dataIndex: 'estimatedHours',
        minWidth: 150,
      },
      {
        key: 'actualHours',
        title: t('issues.table.actualHours'),
        dataIndex: 'actualHours',
        minWidth: 150,
      },
      {
        key: 'registerBy',
        title: t('issues.table.registerBy'),
        dataIndex: 'registerBy',
        minWidth: 160,
      },
    ],
    [projectId, renderBadge, renderPriority, t]
  );

  const handleRow = useCallback(
    (record: IssueRow) => ({
      onClick: onRowClick ? () => onRowClick(record) : undefined,
      className:
        selectedId != null && String(record.id) === String(selectedId)
          ? 'bg-accent-soft hover:bg-accent-soft'
          : undefined,
    }),
    [onRowClick, selectedId]
  );

  return (
    <CustomTable<IssueRow>
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      emptyText={t('issues.table.empty')}
      horizontalScroll={true}
      onRow={handleRow}
      pagination={{
        current: page,
        total: totalCount || 0,
        pageSize: limit,
        onChange: onPageChange,
        onShowSizeChange: onPageSizeChange,
      }}
    />
  );
};
