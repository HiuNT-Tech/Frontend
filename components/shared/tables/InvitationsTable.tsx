'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { RotateCw, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CustomTable, type TableColumn } from '@/components/ui/custome-table';
import { Tag } from '@/components/ui/tag';
import { BoardInvitationStatus } from '@/config/enum';
import { getInvitationStatusLabelKey } from '@/constant/data';
import type {
  BoardInvitation,
  EntityId,
  InvitationListResponse,
} from '@/config/interface';
import { actionsColumn, RoleTag } from './settings-table-parts';

interface InvitationsTableProps {
  data: InvitationListResponse;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  onRevoke: (invitation: BoardInvitation) => void;
  onResend: (invitation: BoardInvitation) => void;
  isActionPending?: boolean;
  isResendPending?: boolean;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  return dayjs(value).format('YYYY/MM/DD HH:mm');
};

/** Tông màu tag theo trạng thái lời mời: chờ = amber, đã nhận = accent, còn lại trung tính. */
const statusTone = (
  status: BoardInvitationStatus | string | null | undefined
): 'warn' | 'accent' | 'neutral' => {
  if (status === BoardInvitationStatus.PENDING) return 'warn';
  if (status === BoardInvitationStatus.ACCEPTED) return 'accent';
  return 'neutral';
};

export const InvitationsTable: React.FC<InvitationsTableProps> = ({
  data,
  loading,
  error,
  refetch,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  onRevoke,
  onResend,
  isActionPending,
  isResendPending,
}) => {
  const { t } = useTranslation();

  const pagedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return data.items.slice(start, start + limit);
  }, [data.items, limit, page]);

  const columns = useMemo<TableColumn<BoardInvitation>[]>(
    () => [
      {
        key: 'email',
        title: t('settings.invitations.table.email'),
        dataIndex: 'email',
        minWidth: 220,
        render: value => <span className="font-medium text-ink">{value}</span>,
      },
      {
        key: 'role',
        title: t('settings.invitations.table.role'),
        dataIndex: 'role',
        minWidth: 130,
        render: value => <RoleTag role={value} t={t} />,
      },
      {
        key: 'status',
        title: t('settings.invitations.table.status'),
        dataIndex: 'status',
        minWidth: 120,
        render: value => (
          <Tag tone={statusTone(value)} dot>
            {t(getInvitationStatusLabelKey(value))}
          </Tag>
        ),
      },
      {
        key: 'invitedBy',
        title: t('settings.invitations.table.invitedBy'),
        dataIndex: 'invitedByUserId',
        minWidth: 180,
        render: (_value, record) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">
              {record.invitedBy?.displayName || t('common.unknown')}
            </div>
            <div className="truncate text-[12.5px] text-muted">
              {record.invitedBy?.email || t('common.unknown')}
            </div>
          </div>
        ),
      },
      {
        key: 'expiresAt',
        title: t('settings.invitations.table.expiresAt'),
        dataIndex: 'expiresAt',
        minWidth: 150,
        render: value => (
          <span className="text-muted tabular-nums">
            {formatDateTime(value)}
          </span>
        ),
      },
      {
        key: 'createdAt',
        title: t('settings.invitations.table.createdAt'),
        dataIndex: 'createdAt',
        minWidth: 150,
        render: value => (
          <span className="text-muted tabular-nums">
            {formatDateTime(value)}
          </span>
        ),
      },
      actionsColumn<BoardInvitation>(t, record => [
        {
          key: 'resend',
          label: t('settings.invitations.table.resend'),
          icon: <RotateCw />,
          onClick: () => onResend(record),
          disabled: isResendPending,
          hidden:
            record.status !== BoardInvitationStatus.PENDING &&
            record.status !== BoardInvitationStatus.EXPIRED,
        },
        {
          key: 'revoke',
          label: t('settings.invitations.table.revoke'),
          icon: <Ban />,
          tone: 'danger',
          onClick: () => onRevoke(record),
          disabled: isActionPending,
          hidden: record.status !== BoardInvitationStatus.PENDING,
        },
      ]),
    ],
    [t, onResend, onRevoke, isResendPending, isActionPending]
  );

  return (
    <CustomTable
      rowKey={(record: BoardInvitation) => String(record.id as EntityId)}
      columns={columns}
      dataSource={pagedItems}
      loading={loading}
      error={Boolean(error)}
      emptyText={t('settings.invitations.table.empty')}
      loadingText={t('common.loading')}
      errorText={t('settings.invitations.table.error')}
      onRetry={refetch}
      pagination={{
        current: page,
        total: data.total,
        pageSize: limit,
        onChange: onPageChange,
        onShowSizeChange: onPageSizeChange,
      }}
    />
  );
};
