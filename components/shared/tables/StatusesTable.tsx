'use client';

import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Column, EntityId } from '@/config/interface';
import { CustomTable, type TableColumn } from '@/components/ui/custome-table';
import { ColorTag } from '@/components/ui/tag';
import staticMethodConfirm from '@/components/modal/static-method-confirm';
import { actionsColumn } from './settings-table-parts';

export interface StatusesTableProps {
  boardId: EntityId;
  data: Column[];
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

export const StatusesTable: React.FC<StatusesTableProps> = ({
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

  const handleDelete = (record: Column) => {
    staticMethodConfirm.open({
      content: t('settings.statuses.deleteModal.content', {
        name: record?.title ?? '—',
      }),
      onOk: () => {
        if (record?.id) onDelete?.(record.id);
      },
    });
  };

  const columns = useMemo<TableColumn<Column>[]>(() => {
    const base: TableColumn<Column>[] = [
      {
        key: 'title',
        title: t('settings.statuses.table.type'),
        dataIndex: 'title',
        minWidth: 240,
        render: (_value, record) => (
          <ColorTag color={record?.statusColor}>
            {record?.title ?? '—'}
          </ColorTag>
        ),
      },
      {
        key: 'issues',
        title: t('settings.statuses.table.issues'),
        align: 'right',
        minWidth: 100,
        render: (_value, record) => (
          <span className="text-ink-2 tabular-nums">
            {record?._count?.cards ?? '—'}
          </span>
        ),
      },
    ];
    if (!canManage) return base;
    return [
      ...base,
      actionsColumn<Column>(t, record => [
        {
          key: 'delete',
          label: t('settings.statuses.table.delete'),
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
      emptyText={t('settings.statuses.table.empty')}
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
