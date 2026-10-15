'use client';

import type React from 'react';
import { forwardRef } from 'react';
import { TimePicker as AntdTimePicker } from 'antd';
import type { TimePickerProps as AntdTimePickerProps } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { cn } from '@/lib/utils';

dayjs.locale('ja');

export interface TimePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'size'
> {
  label?: string;
  error?: string;
  className?: string;
  classNameContainer?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      className,
      label,
      error,
      classNameContainer,
      value = '',
      onChange,
      disabled,
      placeholder = 'HH:MM',
      required,
      ...props
    },
    ref
  ) => {
    const dayjsValue = value ? dayjs(value, 'HH:mm') : null;

    const handleChange: AntdTimePickerProps['onChange'] = time => {
      if (onChange) {
        const timeString = time ? time.format('HH:mm') : '';
        onChange({
          target: { value: timeString },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <div className={classNameContainer}>
        {label && (
          <label className="text-sm font-medium text-theme-neutral-11">
            {label}
            {required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className={cn('relative', { 'mt-1': !!label })}>
          <AntdTimePicker
            value={dayjsValue}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            format="HH:mm"
            className={cn(
              'w-full h-10',
              error && '[&.ant-picker]:border-danger! error-class',
              className
            )}
            style={{ width: '100%' }}
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
        {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
      </div>
    );
  }
);

TimePicker.displayName = 'TimePicker';

export { TimePicker };
