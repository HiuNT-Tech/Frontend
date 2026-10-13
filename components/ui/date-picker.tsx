'use client';

import type React from 'react';
import { forwardRef } from 'react';
import { DatePicker as AntdDatePicker } from 'antd';
import type { DatePickerProps as AntdDatePickerProps } from 'antd';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Images from '@/assets';

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'size'
> {
  label?: string;
  error?: string;
  className?: string;
  classNameContainer?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  picker?: 'date' | 'week' | 'month' | 'quarter' | 'year';
  format?: string;
  disabledDate?: (current: dayjs.Dayjs) => boolean;
  notShowErrorMessage?: boolean;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      label,
      error,
      classNameContainer,
      value = '',
      onChange,
      disabled,
      placeholder = 'YYYY/MM/DD',
      required,
      picker = 'date',
      format,
      disabledDate,
      notShowErrorMessage = false,
      ...props
    },
    ref
  ) => {
    const getFormats = () => {
      switch (picker) {
        case 'year':
          return {
            defaultFormat: 'YYYY',
            displayFormat: format || 'YYYY',
            valueFormat: 'YYYY',
          };
        case 'month':
          return {
            defaultFormat: 'YYYY-MM',
            displayFormat: format || 'YYYY-MM',
            valueFormat: 'YYYY-MM',
          };
        default:
          return {
            defaultFormat: 'YYYY-MM-DD',
            displayFormat: format || 'YYYY/MM/DD',
            valueFormat: 'YYYY-MM-DD',
          };
      }
    };

    const { defaultFormat, displayFormat, valueFormat } = getFormats();

    const dayjsValue = value ? dayjs(value, valueFormat) : null;

    const handleChange: AntdDatePickerProps['onChange'] = date => {
      if (onChange) {
        const dateString =
          date && !Array.isArray(date) ? date.format(valueFormat) : '';
        onChange({
          target: { value: dateString },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <div className={cn('space-y-1', classNameContainer)}>
        {label && (
          <label className="text-sm font-medium text-theme-neutral-11">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className={cn('relative', { 'mt-1': !!label })}>
          <AntdDatePicker
            picker={picker}
            value={dayjsValue}
            onChange={handleChange}
            disabled={disabled}
            disabledDate={disabledDate}
            placeholder={placeholder}
            format={displayFormat}
            className={cn(
              'w-full h-10',
              error && '!border-red-500 error-class',
              className
            )}
            style={{ width: '100%' }}
            suffixIcon={
              <Image
                src={Images.gray.Calendar}
                alt="calendar"
                width={20}
                height={20}
                className="w-5 h-5"
              />
            }
          />
          {/* Hidden input for form compatibility */}
          <input
            type="hidden"
            ref={ref}
            value={value}
            data-error={error ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            {...props}
          />
        </div>
        {error && !notShowErrorMessage && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export { DatePicker };
