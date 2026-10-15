'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/utils/due-date';

/* ─────────────────── Types ─────────────────── */

export interface EditFormData {
  title: string;
  description: string;
  columnId: string;
  priority: string;
  issueTypeId: string;
  assigneeUserId: string;
  versionId: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  actualHours: string;
}

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

export interface EditFormFieldsProps {
  formData: EditFormData;
  onChange: (field: keyof EditFormData, value: string) => void;
  statusOptions: SelectOption[];
  priorityOptions: SelectOption[];
  issueTypeOptions: SelectOption[];
  userOptions: SelectOption[];
  versionOptions: SelectOption[];
  onAssignToMyself?: () => void;
  /** Lỗi xác thực theo trường (hiện dưới điều khiển, chữ đỏ) */
  errors?: Partial<Record<keyof EditFormData, string>>;
}

/* ─────────────────── Meta row (label left · value/control right) ─────────────────── */

/**
 * Hàng kiểu iOS Settings cho inspector hẹp: nhãn 14px muted bên trái, giá trị hoặc
 * điều khiển bên phải; đường kẻ mảnh giữa các hàng. Trên màn rất hẹp điều khiển
 * rơi xuống dòng dưới nhãn (flex-wrap) thay vì bị bóp.
 */
export const MetaRow: React.FC<{
  label: React.ReactNode;
  /** Hàng đầu tiên trong thẻ không có đường kẻ phía trên */
  first?: boolean;
  /** Dòng phụ nhỏ dưới điều khiển (vd. nút "Giao cho tôi") */
  hint?: React.ReactNode;
  /** true khi bên phải là điều khiển nhập liệu (chiếm nhiều chỗ hơn một giá trị) */
  control?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ label, first, hint, control, className, children }) => (
  <div
    className={cn(
      'flex min-h-[46px] flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-2',
      !first && 'border-t border-line',
      className
    )}
  >
    {/* Nhãn rộng cố định để các ô nhập bên phải thẳng mép trái */}
    <span className="w-[118px] shrink-0 text-sm text-muted">{label}</span>
    <div
      className={cn(
        'flex min-w-0 items-center justify-end',
        // Cột giá trị chiếm phần còn lại của hàng để ô nhập bên trong (w-full) có bề rộng xác định
        control
          ? 'w-full max-w-[280px] flex-[1_1_190px]'
          : 'min-w-0 flex-[1_1_0%]'
      )}
    >
      {children ?? <span className="text-sm text-faint">—</span>}
    </div>
    {hint && <div className="w-full text-right">{hint}</div>}
  </div>
);

/* ─────────────────── Compact control styles ─────────────────── */

/** Các picker trong hàng meta thấp hơn ô nhập form thường (36px) để hàng không bị cao. */
const ROW_SELECT_CLASS = 'h-9! text-sm';
const ROW_PICKER_CLASS = '[&.ant-picker]:h-9! text-sm';
const ROW_INPUT_CLASS = 'h-9 text-sm';
/** Ô ngày đến hạn đã quá hạn: viền + chữ màu danger (token theme, đổi theo sáng/tối). */
const OVERDUE_PICKER_CLASS =
  '[&.ant-picker]:border-danger! [&_.ant-picker-input>input]:text-danger! [&_.ant-picker-input>input]:font-semibold';

/* ─────────────────── Editable Title ─────────────────── */

/** Tiêu đề lớn (22px/700) sửa tại chỗ: textarea tự giãn, chỉ có đường kẻ dưới. */
export const EditableTitle: React.FC<{
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}> = ({ value, onChange, autoFocus, className }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);

  // Giãn theo nội dung mỗi khi giá trị đổi (kể cả khi được điền từ ngoài).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 1}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') e.preventDefault();
      }}
      placeholder={t('addIssue.placeholder.title')}
      aria-label={t('addIssue.label.title')}
      className={cn(
        'block w-full resize-none overflow-hidden border-0 border-b border-line bg-transparent px-0.5 pb-2 text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-ink transition-[border-color] duration-200 ease-soft placeholder:text-faint focus:border-accent focus:outline-none focus-visible:outline-none',
        className
      )}
    />
  );
};

/* ─────────────────── Editable Description ─────────────────── */

export const EditableDescription: React.FC<{
  value: string;
  onChange: (value: string) => void;
  flush?: boolean;
}> = ({ value, onChange, flush }) => {
  const { t } = useTranslation();

  return (
    <MarkdownEditor
      value={value}
      onChange={onChange}
      placeholder={t('addIssue.placeholder.description')}
      flush={flush}
      rows={7}
    />
  );
};

/* ─────────────────── Editable Metadata (grouped rows) ─────────────────── */

/**
 * Chế độ sửa: mọi trường nằm trong một thẻ, mỗi trường là một hàng nhãn trái /
 * picker phải (picker trông như ô nhập). Dùng được cả trong inspector hẹp lẫn
 * cột Details của form tạo mới.
 */
export const EditableMetadata: React.FC<EditFormFieldsProps> = ({
  formData,
  onChange,
  statusOptions,
  priorityOptions,
  issueTypeOptions,
  userOptions,
  versionOptions,
  onAssignToMyself,
  errors,
}) => {
  const { t } = useTranslation();
  const errorHint = (field: keyof EditFormData) =>
    errors?.[field] ? (
      <span className="text-[13px] text-danger">{errors[field]}</span>
    ) : undefined;

  return (
    <div>
      <MetaRow
        first
        control
        label={t('issueDetail.metadata.status')}
        hint={errorHint('columnId')}
      >
        <Select
          options={statusOptions}
          value={formData.columnId}
          onValueChange={v => onChange('columnId', v)}
          placeholder={t('addIssue.placeholder.status')}
          allowClear={false}
          error={errors?.columnId}
          notShowErrorMessage
          className={ROW_SELECT_CLASS}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.issueType')}>
        <Select
          options={issueTypeOptions}
          value={formData.issueTypeId}
          onValueChange={v => onChange('issueTypeId', v)}
          placeholder={t('addIssue.placeholder.issueType')}
          showSearch
          className={ROW_SELECT_CLASS}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.priority')}>
        <Select
          options={priorityOptions}
          value={formData.priority}
          onValueChange={v => onChange('priority', v)}
          placeholder={t('addIssue.placeholder.priority')}
          className={ROW_SELECT_CLASS}
        />
      </MetaRow>

      <MetaRow
        control
        label={t('issueDetail.metadata.assignee')}
        hint={
          onAssignToMyself && (
            <button
              type="button"
              className="press rounded-[8px] px-1.5 py-0.5 text-[12.5px] font-semibold text-accent transition-colors duration-200 ease-soft hover:bg-accent-soft"
              onClick={onAssignToMyself}
            >
              {t('addIssue.myself')}
            </button>
          )
        }
      >
        <Select
          options={userOptions}
          value={formData.assigneeUserId}
          onValueChange={v => onChange('assigneeUserId', v)}
          placeholder={t('addIssue.placeholder.assignee')}
          showSearch
          className={ROW_SELECT_CLASS}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.version')}>
        <Select
          options={versionOptions}
          value={formData.versionId}
          onValueChange={v => onChange('versionId', v)}
          placeholder={t('addIssue.placeholder.version')}
          showSearch
          className={ROW_SELECT_CLASS}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.startDate')}>
        <DatePicker
          value={formData.startDate}
          onChange={e => onChange('startDate', e.target.value)}
          className={ROW_PICKER_CLASS}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.dueDate')}>
        <DatePicker
          value={formData.dueDate}
          onChange={e => onChange('dueDate', e.target.value)}
          className={cn(
            ROW_PICKER_CLASS,
            isOverdue(formData.dueDate) && OVERDUE_PICKER_CLASS
          )}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.estimatedHours')}>
        <Input
          onlyFloat
          value={formData.estimatedHours}
          onChange={e => onChange('estimatedHours', e.target.value)}
          placeholder={t('addIssue.placeholder.hoursExample')}
          className={ROW_INPUT_CLASS}
          aria-label={t('addIssue.label.estimatedHours')}
        />
      </MetaRow>

      <MetaRow control label={t('issueDetail.metadata.actualHours')}>
        <Input
          onlyFloat
          value={formData.actualHours}
          onChange={e => onChange('actualHours', e.target.value)}
          placeholder={t('addIssue.placeholder.hoursExample')}
          className={ROW_INPUT_CLASS}
          aria-label={t('addIssue.label.actualHours')}
        />
      </MetaRow>
    </div>
  );
};
