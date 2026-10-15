'use client';

import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { EntityId, IssueType } from '@/config/interface';
import { CustomTable, type TableColumn } from '@/components/ui/custome-table';
import { ColorTag } from '@/components/ui/tag';
import staticMethodConfirm from '@/components/modal/static-method-confirm';
import { actionsColumn } from './settings-table-parts';

export interface IssueTypesTableProps {
  boardId: EntityId;
  data: IssueType[];
  loading?: boolean;
  totalCount?: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  onDelete?: (id: EntityId) => void;
  /** Chỉ Manager (ADMIN/PM) mới thấy thao tác xoá. */
  canManage?: boolean;
}

export const IssueTypesTable: React.FC<IssueTypesTableProps> = ({
  data,
  loading,
  totalCount,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  onDelete,
  canManage = false,
}) => {
  const { t } = useTranslation();

  const handleDelete = (record: IssueType) => {
    staticMethodConfirm.open({
      content: t('settings.issueTypes.deleteModal.content', {
        name: record?.name ?? '—',
      }),
      onOk: () => {
        if (record?.id) onDelete?.(record.id);
      },
    });
  };

  const columns = useMemo<TableColumn<IssueType>[]>(() => {
    const base: TableColumn<IssueType>[] = [
      {
        key: 'type',
        title: t('settings.issueTypes.table.type'),
        dataIndex: 'name',
        minWidth: 240,
        render: (_value, record) => (
          <ColorTag color={record?.statusColor}>{record?.name}</ColorTag>
        ),
      },
      {
        key: 'issues',
        title: t('settings.issueTypes.table.issues'),
        align: 'right',
        minWidth: 100,
        render: (_value, record) => (
          <span className="text-ink-2 tabular-nums">
            {record.issueCount ?? 0}
          </span>
        ),
      },
    ];
    if (!canManage) return base;
    return [
      ...base,
      actionsColumn<IssueType>(t, record => [
        {
          key: 'delete',
          label: t('settings.issueTypes.table.delete'),
          icon: <Trash2 />,
          tone: 'danger',
          onClick: () => handleDelete(record),
        },
      ]),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, canManage, onDelete]);

  return (
    <CustomTable
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      emptyText={t('settings.issueTypes.table.empty')}
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
