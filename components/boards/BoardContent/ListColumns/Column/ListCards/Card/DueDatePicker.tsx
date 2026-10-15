'use client';

import { DatePicker as AntdDatePicker } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DueDatePickerProps {
  value?: string | null;
  overdue?: boolean;
  disabled?: boolean;
  onChange: (date: string | null) => void;
}

const formatDueDate = (dateStr: string): string =>
  dayjs(dateStr).format('DD/MM');

/** Hạn chót trên thẻ: viên nhỏ (đỏ nhạt khi quá hạn); bấm mở lịch antd phủ trong suốt phía trên. */
function DueDatePicker({
  value,
  overdue,
  disabled,
  onChange,
}: DueDatePickerProps) {
  const { t } = useTranslation();
  const dayjsValue = value ? dayjs(value) : null;
  const title = value
    ? overdue
      ? t('board.card.overdue')
      : t('board.card.due')
    : t('board.card.setDue');

  return (
    <div
      className="relative inline-flex"
      data-no-dnd
      onClick={e => e.stopPropagation()}
    >
      <span
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-full text-[12.5px] font-medium tabular-nums transition-colors',
          value
            ? overdue
              ? 'bg-danger-soft px-2 text-danger'
              : 'bg-fill px-2 text-ink-2'
            : 'text-faint hover:text-ink-2'
        )}
        title={title}
      >
        <CalendarDays aria-hidden="true" className="size-[13px]" />
        {value && formatDueDate(value)}
      </span>

      {/* Transparent picker overlays the badge so a click opens the calendar */}
      <AntdDatePicker
        value={dayjsValue}
        onChange={date => onChange(date ? date.format('YYYY-MM-DD') : null)}
        disabled={disabled}
        allowClear={false}
        suffixIcon={null}
        format="YYYY/MM/DD"
        placeholder={title}
        aria-label={title}
        getPopupContainer={() => document.body}
        className="!absolute !inset-0 !h-full !w-full !min-w-0 !cursor-pointer !border-0 !bg-transparent !p-0 !opacity-0"
      />
    </div>
  );
}

export default DueDatePicker;
