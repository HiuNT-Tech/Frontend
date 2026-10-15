'use client';

import React, { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import type { EntityId, Version } from '@/config/interface';
import { CustomTable, type TableColumn } from '@/components/ui/custome-table';
import { actionsColumn } from './settings-table-parts';

export interface VersionTableProps {
  boardId?: EntityId;
  data: Version[];
  loading?: boolean;
  totalCount?: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (limit: number) => void;
  onDelete?: (id: EntityId) => void;
  onEdit?: (record: Version) => void;
  /** Chỉ Manager (ADMIN/PM) mới thấy thao tác sửa / xoá. */
  canManage?: boolean;
}

const formatDate = (value?: string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY') : null;

const VersionTable: React.FC<VersionTableProps> = ({
  data,
  loading,
  totalCount,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  onDelete,
  onEdit,
  canManage = false,
}) => {
  const { t } = useTranslation();

  const columns = useMemo<TableColumn<Version>[]>(() => {
    const base: TableColumn<Version>[] = [
      {
        key: 'name',
        title: t('settings.versions.table.name'),
        dataIndex: 'name',
        minWidth: 180,
        render: (_value, record) => (
          <span className="font-semibold text-ink">{record.name ?? '—'}</span>
        ),
      },
      {
        key: 'startDate',
        title: t('settings.versions.table.startDate'),
        dataIndex: 'startDate',
        minWidth: 120,
        render: (_value, record) => {
          const date = formatDate(record.startDate);
          return date ? (
            <span className="text-ink-2 tabular-nums">{date}</span>
          ) : (
            <span className="text-faint">—</span>
          );
        },
      },
      {
        key: 'endDate',
        title: t('settings.versions.table.endDate'),
        dataIndex: 'endDate',
        minWidth: 120,
        render: (_value, record) => {
          const date = formatDate(record.endDate);
          return date ? (
            <span className="text-ink-2 tabular-nums">{date}</span>
          ) : (
            <span className="text-faint">—</span>
          );
        },
      },
      {
        key: 'description',
        title: t('settings.versions.table.description'),
        dataIndex: 'description',
        minWidth: 240,
        render: (_value, record) =>
          record.description ? (
            <span
              className="block max-w-[36ch] truncate text-muted"
              title={record.description}
            >
              {record.description}
            </span>
          ) : (
            <span className="text-faint">—</span>
          ),
      },
    ];
    if (!canManage) return base;
    return [
      ...base,
      actionsColumn<Version>(t, record => [
        {
          key: 'edit',
          label: t('common.edit'),
          icon: <Pencil />,
          onClick: () => onEdit?.(record),
        },
        {
          key: 'delete',
          label: t('settings.versions.table.delete'),
          icon: <Trash2 />,
          tone: 'danger',
          onClick: () => {
            if (record?.id) onDelete?.(record.id);
          },
        },
      ]),
    ];
  }, [t, canManage, onEdit, onDelete]);

  return (
    <CustomTable
      rowKey="id"
      columns={columns}
      dataSource={data}
      loading={loading}
      emptyText={t('settings.versions.table.empty')}
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

export default VersionTable;
