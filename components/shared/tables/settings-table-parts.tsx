'use client';

import type React from 'react';
import type { TFunction } from 'i18next';

import { IconButton } from '@/components/ui/icon-button';
import { Tag } from '@/components/ui/tag';
import type { TableColumn } from '@/components/ui/custome-table';
import { MemberRole } from '@/config/enum';
import { getMemberRoleStatusConfig } from '@/constant/data';
import type { BoardMemberRole } from '@/config/interface';
import { cn } from '@/lib/utils';

/* Các mảnh dùng chung cho bảng trong Cài đặt dự án: nút thao tác của hàng và tag vai trò. */

export interface RowAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  /** danger = hành động phá huỷ (xoá, thu hồi): hover chuyển đỏ */
  tone?: 'default' | 'danger';
}

/**
 * Nút icon của hàng: luôn hiển thị (iPad không có hover), màu muted cho yên,
 * đậm lên khi hover/focus. Mỗi nút 36px để dễ chạm.
 */
export function RowActions({ actions }: { actions: RowAction[] }) {
  const visible = actions.filter(action => !action.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="flex items-center justify-end gap-0.5">
      {visible.map(action => (
        <IconButton
          key={action.key}
          aria-label={action.label}
          disabled={action.disabled}
          onClick={event => {
            event.stopPropagation();
            action.onClick();
          }}
          className={cn(
            'text-muted [&_svg]:size-4',
            action.tone === 'danger'
              ? 'hover:bg-danger-soft hover:text-danger'
              : 'hover:text-ink'
          )}
        >
          {action.icon}
        </IconButton>
      ))}
    </div>
  );
}

/** Cột thao tác cuối bảng (tiêu đề chỉ dành cho trình đọc màn hình). */
export function actionsColumn<T>(
  t: TFunction,
  getActions: (record: T) => RowAction[]
): TableColumn<T> {
  return {
    key: 'actions',
    title: <span className="sr-only">{t('common.actions')}</span>,
    align: 'right',
    minWidth: 96,
    className: 'w-px py-2',
    render: (_value, record) => <RowActions actions={getActions(record)} />,
  };
}

const MANAGER_ROLES: string[] = [
  MemberRole.ADMINISTRATOR,
  MemberRole.PROJECT_MANAGER,
];

/** Tag vai trò: quản trị (Admin, PM) dùng accent, các vai trò khác trung tính. */
export function RoleTag({
  role,
  t,
}: {
  role: BoardMemberRole | string | null | undefined;
  t: TFunction;
}) {
  const config = getMemberRoleStatusConfig(role);
  if (!config) return <span className="text-faint">—</span>;
  const normalized = String(role).toUpperCase();
  return (
    <Tag tone={MANAGER_ROLES.includes(normalized) ? 'accent' : 'neutral'}>
      {t(config.labelKey)}
    </Tag>
  );
}
