'use client';

import React, { useMemo } from 'react';
import { Pencil, UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CustomTable, type TableColumn } from '@/components/ui/custome-table';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  EntityId,
  UserBoardMember,
  UsersBoardResponse,
} from '@/config/interface';
import { actionsColumn, RoleTag } from './settings-table-parts';

export interface MembersTableProps {
  boardId?: EntityId;
  listUser: UsersBoardResponse;
  isListLoading: boolean;
  listError: Error | null;
  refetchList: () => void;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  onEditRole?: (member: UserBoardMember) => void;
  onRemove?: (member: UserBoardMember) => void;
  /** Chỉ Manager (ADMIN/PM) mới thấy các thao tác sửa role / xoá member. */
  canManage?: boolean;
}

export const MembersTable: React.FC<MembersTableProps> = ({
  listUser,
  isListLoading,
  listError,
  refetchList,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  onEditRole,
  onRemove,
  canManage = false,
}) => {
  const { t } = useTranslation();

  const columns = useMemo<TableColumn<UserBoardMember>[]>(() => {
    const base: TableColumn<UserBoardMember>[] = [
      {
        key: 'member',
        title: t('settings.members.table.member'),
        dataIndex: 'displayName',
        minWidth: 240,
        render: (_value, record) => {
          const name = record.displayName || record.username;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={name} src={record.avatar} size={32} />
              <div className="min-w-0">
                <div className="truncate font-medium text-ink">{name}</div>
                <div className="truncate text-[12.5px] text-muted">
                  {record.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'role',
        title: t('settings.members.table.role'),
        dataIndex: 'role',
        minWidth: 140,
        render: value => <RoleTag role={value} t={t} />,
      },
      {
        key: 'createdAt',
        title: t('settings.members.table.joinedOn'),
        dataIndex: 'createdAt',
        align: 'right',
        minWidth: 120,
        render: value => (
          <span className="text-muted tabular-nums">
            {value ? new Date(value).toLocaleDateString() : ''}
          </span>
        ),
      },
    ];

    if (!canManage) return base;

    return [
      ...base,
      actionsColumn<UserBoardMember>(t, record => [
        {
          key: 'edit',
          label: t('settings.members.table.editRole'),
          icon: <Pencil />,
          onClick: () => onEditRole?.(record),
        },
        {
          key: 'remove',
          label: t('settings.members.table.delete'),
          icon: <UserMinus />,
          tone: 'danger',
          onClick: () => onRemove?.(record),
        },
      ]),
    ];
  }, [t, canManage, onEditRole, onRemove]);

  return (
    <CustomTable
      rowKey="userId"
      columns={columns}
      dataSource={listUser?.items ?? []}
      loading={isListLoading}
      error={Boolean(listError)}
      onRetry={refetchList}
      emptyText={t('settings.members.table.empty')}
      pagination={{
        current: page,
        total: listUser?.total || 0,
        pageSize: limit,
        onChange: onPageChange,
        onShowSizeChange: onPageSizeChange,
      }}
    />
  );
};
