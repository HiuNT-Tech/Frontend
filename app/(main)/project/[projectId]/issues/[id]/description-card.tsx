'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select as AntdSelect, DatePicker as AntdDatePicker } from 'antd';
import dayjs from 'dayjs';
import { format } from '@/constant/format';
import {
  MARKDOWN_PROSE_CLASSNAME,
  MARKDOWN_REMARK_PLUGINS,
} from '@/constant/markdown';
import { PRIORITY } from '@/config/enum';
import { Group } from '@/components/ui/surface';
import { ColorTag } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/utils/due-date';
import type {
  Card,
  CardIssueType,
  EntityId,
  Version,
} from '@/config/interface';
import type { SelectOption } from './edit-form-fields';
import { EditableDescription, MetaRow } from './edit-form-fields';

/* ─────────────────── Small value renderers ─────────────────── */

/** Ba vạch ưu tiên (thấp 1 · thường 2 · cao 3) + nhãn; màu theo nghĩa, không trang trí. */
export const PriorityValue: React.FC<{
  priority?: number | null;
  label?: string | null;
  className?: string;
}> = ({ priority, label, className }) => {
  if (!label) return null;
  const bars =
    priority === PRIORITY.HIGH ? 3 : priority === PRIORITY.NORMAL ? 2 : 1;
  const tone =
    priority === PRIORITY.HIGH
      ? 'text-danger'
      : priority === PRIORITY.NORMAL
        ? 'text-warn'
        : 'text-muted';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium text-ink',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn('inline-flex h-[13px] items-end gap-[2px]', tone)}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{ height: 5 + i * 4 }}
            className={cn(
              'w-[3px] rounded-[1.5px]',
              i < bars ? 'bg-current' : 'bg-line-strong'
            )}
          />
        ))}
      </span>
      {label}
    </span>
  );
};

/** Người dùng: avatar nhỏ + tên, cắt bớt khi dài. */
export const PersonValue: React.FC<{
  name: string;
  avatar?: string | null;
  muted?: boolean;
}> = ({ name, avatar, muted }) => (
  <span className="flex min-w-0 items-center gap-2">
    <UserAvatar name={name} src={avatar} size={22} />
    <span
      className={cn(
        'truncate text-sm font-medium',
        muted ? 'text-muted' : 'text-ink'
      )}
    >
      {name}
    </span>
  </span>
);

/** Ngày: tabular; quá hạn → đỏ kèm nhãn. */
export const DateValue: React.FC<{
  value?: string | number | null;
  overdue?: boolean;
}> = ({ value, overdue }) => {
  const { t } = useTranslation();
  if (!value)
    return (
      <span className="text-sm text-muted">{t('issueDetail.notSet')}</span>
    );
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium tabular-nums',
        overdue ? 'text-danger' : 'text-ink'
      )}
    >
      {format.date(value)}
      {overdue && (
        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11.5px] font-semibold text-danger">
          {t('issueDetail.overdue')}
        </span>
      )}
    </span>
  );
};

const PillValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex min-w-0 items-center rounded-full bg-fill px-2.5 py-1 text-[12.5px] font-medium text-ink-2">
    <span className="truncate">{children}</span>
  </span>
);

const EmptyValue: React.FC = () => (
  <span className="text-sm text-muted">—</span>
);

/* ─────────────────── Inline field ─────────────────── */

/**
 * Người sửa được → luôn hiện ô nhập/picker đầy đủ bên phải (chọn xong lưu ngay).
 * Không sửa được → chỉ hiện giá trị.
 */
const InlineField: React.FC<{
  editable: boolean;
  label: string;
  value: React.ReactNode;
  picker: (close: () => void) => React.ReactNode;
}> = ({ editable, label, value, picker }) => {
  if (!editable) return <>{value}</>;
  return (
    <div
      className="w-full [&_.ant-picker]:w-full [&_.ant-select]:w-full"
      aria-label={label}
    >
      {picker(() => {})}
    </div>
  );
};

const INLINE_PICKER_CLASS = 'w-full';

/* ─────────────────── Details card ─────────────────── */

export interface InlineEditConfig {
  statusOptions: SelectOption[];
  priorityOptions: SelectOption[];
  issueTypeOptions: SelectOption[];
  userOptions: SelectOption[];
  versionOptions: SelectOption[];
  /** Lưu ngay một trường (gọi API + toast); `value === 'me'` với assignee = giao cho tôi. */
  onFieldUpdate: (field: string, value: any) => void | Promise<void>;
}

export interface DetailsCardProps {
  card: Card;
  versions: Version[];
  issueTypeInfo: CardIssueType | null;
  priorityLabel: string | null;
  resolveUser: (user: any, fallbackId?: EntityId) => string;
  /** Có → hàng nào cũng chạm để sửa tại chỗ (contributor) */
  inline?: InlineEditConfig;
  /** Ẩn hàng trạng thái (khi đã có switcher riêng phía trên) */
  hideStatus?: boolean;
  title?: React.ReactNode;
  className?: string;
  /** Trang riêng (rộng): xếp các hàng thành lưới 2–3 cột thay vì một cột dài */
  columns?: boolean;
}

/**
 * Thẻ "Details": mỗi thuộc tính một hàng nhãn trái / giá trị phải, kẻ mảnh giữa các
 * hàng. Dùng chung cho inspector (xem + sửa tại chỗ) và trang xem trước khi tạo.
 */
export const DetailsCard: React.FC<DetailsCardProps> = ({
  card,
  versions,
  issueTypeInfo,
  priorityLabel,
  resolveUser,
  inline,
  hideStatus,
  title,
  className,
  columns,
}) => {
  const { t } = useTranslation();
  const editable = !!inline;
  // Lưới: mỗi ô tự kẻ đường dưới (hàng cuối bị card overflow-hidden + -mb-px che đi)
  const rowClass = columns ? 'border-t-0 border-b border-line' : undefined;
  const assigneeName = resolveUser(
    card.assignee,
    card.assigneeUserId ?? undefined
  );
  const assigneeAvatar =
    card.assignee && typeof card.assignee !== 'number'
      ? card.assignee.avatar
      : null;
  const hasAssignee = !!(card.assigneeUserId || card.assignee);
  const versionName = card.versionId
    ? versions.find(v => v.id === card.versionId)?.name
    : undefined;
  const reporterRaw = card.registeredBy ?? card.createdBy;
  const reporterId =
    card.registeredByUserId ?? card.createdByUserId ?? undefined;
  const reporterName =
    reporterRaw || reporterId ? resolveUser(reporterRaw, reporterId) : null;
  const reporterAvatar =
    reporterRaw && typeof reporterRaw !== 'number' ? reporterRaw.avatar : null;
  const dueOverdue = isOverdue(card.dueDate);

  // Placeholder của từng ô chọn (dùng chung key với trang tạo issue)
  const SELECT_PLACEHOLDER: Record<string, string> = {
    columnId: 'addIssue.placeholder.status',
    issueTypeId: 'addIssue.placeholder.issueType',
    priority: 'addIssue.placeholder.priority',
    assigneeUserId: 'addIssue.placeholder.assignee',
    versionId: 'addIssue.placeholder.version',
  };

  const selectPicker =
    (
      field: string,
      options: SelectOption[],
      value: string,
      opts?: { search?: boolean; allowClear?: boolean }
    ) =>
    (close: () => void) => (
      <AntdSelect
        placeholder={
          SELECT_PLACEHOLDER[field] ? t(SELECT_PLACEHOLDER[field]) : undefined
        }
        showSearch={opts?.search}
        optionFilterProp="label"
        allowClear={opts?.allowClear ?? true}
        options={options}
        value={value || undefined}
        className={INLINE_PICKER_CLASS}
        onChange={(v: string | undefined) =>
          inline?.onFieldUpdate(field, v ?? '')
        }
      />
    );

  const datePicker =
    (field: string, value?: string | null) => (close: () => void) => (
      <AntdDatePicker
        value={value ? dayjs(value) : null}
        format="YYYY/MM/DD"
        className={INLINE_PICKER_CLASS}
        onChange={d =>
          inline?.onFieldUpdate(
            field,
            d && !Array.isArray(d) ? d.format('YYYY-MM-DD') : ''
          )
        }
      />
    );

  const hoursPicker =
    (field: 'estimatedHours' | 'actualHours') => (close: () => void) => (
      <Input
        onlyFloat
        defaultValue={card[field] ?? ''}
        placeholder={t('addIssue.placeholder.hoursExample')}
        aria-label={t(`issueDetail.metadata.${field}`)}
        className="h-9 text-sm"
        onBlur={e => {
          if (e.target.value !== (card[field] ?? ''))
            inline?.onFieldUpdate(field, e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            (e.target as HTMLInputElement).value = card[field] ?? '';
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    );

  return (
    <Group
      title={title ?? t('issueDetail.sections.details')}
      className={className}
    >
      <div
        className={cn(
          columns &&
            '-mb-px grid grid-cols-1 md:grid-cols-2 md:[&>*:nth-child(2n)]:border-l 2xl:grid-cols-3 2xl:[&>*:nth-child(2n)]:border-l-0 2xl:[&>*:not(:nth-child(3n+1))]:border-l'
        )}
      >
        {!hideStatus && (
          <MetaRow
            className={rowClass}
            first
            label={t('issueDetail.metadata.status')}
          >
            <InlineField
              editable={editable}
              label={t('issueDetail.metadata.status')}
              value={
                card.column ? (
                  <ColorTag color={card.column.statusColor}>
                    {card.column.title}
                  </ColorTag>
                ) : (
                  <EmptyValue />
                )
              }
              picker={selectPicker(
                'columnId',
                inline?.statusOptions ?? [],
                card.columnId ? String(card.columnId) : '',
                { allowClear: false }
              )}
            />
          </MetaRow>
        )}

        <MetaRow
          className={rowClass}
          first={!!hideStatus}
          label={t('issueDetail.metadata.assignee')}
        >
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.assignee')}
            value={
              <PersonValue
                name={assigneeName}
                avatar={assigneeAvatar}
                muted={!hasAssignee}
              />
            }
            picker={selectPicker(
              'assigneeUserId',
              inline?.userOptions ?? [],
              card.assigneeUserId ? String(card.assigneeUserId) : '',
              { search: true }
            )}
          />
        </MetaRow>

        <MetaRow
          className={rowClass}
          label={t('issueDetail.metadata.priority')}
        >
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.priority')}
            value={
              priorityLabel ? (
                <PriorityValue priority={card.priority} label={priorityLabel} />
              ) : (
                <EmptyValue />
              )
            }
            picker={selectPicker(
              'priority',
              inline?.priorityOptions ?? [],
              card.priority != null ? String(card.priority) : ''
            )}
          />
        </MetaRow>

        <MetaRow
          className={rowClass}
          label={t('issueDetail.metadata.issueType')}
        >
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.issueType')}
            value={
              issueTypeInfo ? (
                <ColorTag color={issueTypeInfo.statusColor}>
                  {issueTypeInfo.name}
                </ColorTag>
              ) : (
                <EmptyValue />
              )
            }
            picker={selectPicker(
              'issueTypeId',
              inline?.issueTypeOptions ?? [],
              card.issueTypeId ? String(card.issueTypeId) : '',
              { search: true }
            )}
          />
        </MetaRow>

        <MetaRow
          className={rowClass}
          label={t('issueDetail.metadata.startDate')}
        >
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.startDate')}
            value={<DateValue value={card.startDate} />}
            picker={datePicker('startDate', card.startDate)}
          />
        </MetaRow>

        <MetaRow className={rowClass} label={t('issueDetail.metadata.dueDate')}>
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.dueDate')}
            value={<DateValue value={card.dueDate} overdue={dueOverdue} />}
            picker={datePicker('dueDate', card.dueDate)}
          />
        </MetaRow>

        <MetaRow className={rowClass} label={t('issueDetail.metadata.version')}>
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.version')}
            value={
              versionName ? (
                <PillValue>{versionName}</PillValue>
              ) : (
                <EmptyValue />
              )
            }
            picker={selectPicker(
              'versionId',
              inline?.versionOptions ?? [],
              card.versionId ? String(card.versionId) : '',
              { search: true }
            )}
          />
        </MetaRow>

        <MetaRow
          className={rowClass}
          label={t('issueDetail.metadata.estimatedHours')}
        >
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.estimatedHours')}
            value={
              card.estimatedHours ? (
                <span className="text-sm font-medium tabular-nums text-ink">
                  {format.hours(card.estimatedHours)}
                </span>
              ) : (
                <EmptyValue />
              )
            }
            picker={hoursPicker('estimatedHours')}
          />
        </MetaRow>

        <MetaRow
          className={rowClass}
          label={t('issueDetail.metadata.actualHours')}
        >
          <InlineField
            editable={editable}
            label={t('issueDetail.metadata.actualHours')}
            value={
              card.actualHours ? (
                <span className="text-sm font-medium tabular-nums text-ink">
                  {format.hours(card.actualHours)}
                </span>
              ) : (
                <EmptyValue />
              )
            }
            picker={hoursPicker('actualHours')}
          />
        </MetaRow>

        {reporterName && (
          <MetaRow
            className={rowClass}
            label={t('issueDetail.metadata.registeredBy')}
          >
            <PersonValue name={reporterName} avatar={reporterAvatar} />
          </MetaRow>
        )}
      </div>
    </Group>
  );
};

/* ─────────────────── Description card ─────────────────── */

export interface DescriptionCardProps {
  card: Card;
  /** Chế độ sửa: thay nội dung bằng editor markdown ngay trong thẻ */
  isEditMode?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Thẻ "Description": markdown đã render, hoặc editor khi đang sửa. */
export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  card,
  isEditMode = false,
  editValue = '',
  onEditChange,
  title,
  action,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <Group
      title={title ?? t('issueDetail.description')}
      action={action}
      className={className}
      cardClassName={
        isEditMode
          ? 'focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)] transition-[border-color,box-shadow] duration-200 ease-soft'
          : undefined
      }
    >
      {isEditMode && onEditChange ? (
        <EditableDescription value={editValue} onChange={onEditChange} flush />
      ) : card.description ? (
        <div
          className={cn(
            MARKDOWN_PROSE_CLASSNAME,
            'px-4 py-3.5 text-[14.5px] leading-[1.6] text-ink-2'
          )}
        >
          <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>
            {card.description}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="px-4 py-3.5 text-sm text-muted">
          {t('issueDetail.noDescription')}
        </p>
      )}
    </Group>
  );
};
