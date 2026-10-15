'use client';

import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  COLOR_KEY_TO_STATUS,
  COLOR_STATUS_OPTIONS,
  type ColorStatusKey,
} from '@/constant/data';
import { ColorTag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';

/**
 * Chọn màu cho trạng thái / loại công việc: hàng ô tròn theo `hex` (màu do
 * người dùng chọn là dữ liệu nên tô inline), ô đang chọn có vòng accent,
 * bên cạnh là tag xem trước đúng kiểu sẽ hiển thị trong bảng.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  previewLabel,
  disabled,
  className,
}: {
  value: ColorStatusKey | string;
  onChange: (key: ColorStatusKey) => void;
  /** Tên đang nhập, dùng cho tag xem trước */
  previewLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const selected = COLOR_STATUS_OPTIONS.find(o => o.key === value);

  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-5 gap-y-3', className)}
    >
      <div
        role="radiogroup"
        aria-label={t('settings.colorPicker.label')}
        className="flex flex-wrap gap-2"
      >
        {COLOR_STATUS_OPTIONS.map(option => {
          const active = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(`settings.colorPicker.colors.${option.key}`)}
              title={t(`settings.colorPicker.colors.${option.key}`)}
              disabled={disabled}
              onClick={() => onChange(option.key)}
              style={{ background: option.hex }}
              className={cn(
                'press grid size-9 place-items-center rounded-full text-white transition-[box-shadow,transform] duration-200 ease-soft disabled:opacity-50',
                active
                  ? 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]'
                  : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)] hover:shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--line-strong)]'
              )}
            >
              {active && <Check className="size-4" strokeWidth={2.6} />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span>{t('settings.colorPicker.preview')}</span>
          <ColorTag color={COLOR_KEY_TO_STATUS[selected.key]}>
            {previewLabel}
          </ColorTag>
        </div>
      )}
    </div>
  );
}
