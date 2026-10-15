'use client';

import type React from 'react';
import { forwardRef } from 'react';
import { TimePicker } from 'antd';
import type { TimeRangePickerProps as AntdTimeRangePickerProps } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { cn } from '@/lib/utils';

const { RangePicker } = TimePicker;

dayjs.locale('ja');

export interface TimeRangePickerProps {
  label?: string;
  error?: string;
  className?: string;
  classNameContainer?: string;
  startProps?: React.InputHTMLAttributes<HTMLInputElement>;
  endProps?: React.InputHTMLAttributes<HTMLInputElement>;
  startPlaceholder?: string;
  endPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const TimeRangePicker = forwardRef<HTMLDivElement, TimeRangePickerProps>(
  (
    {
      label,
      error,
      className,
      classNameContainer,
      startProps,
      endProps,
      startPlaceholder = 'HH:MM',
      endPlaceholder = 'HH:MM',
      required,
      disabled,
    },
    ref
  ) => {
    const startValue = (startProps?.value as string) || '';
    const endValue = (endProps?.value as string) || '';

    const rangeValue: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [
      startValue ? dayjs(startValue, 'HH:mm') : null,
      endValue ? dayjs(endValue, 'HH:mm') : null,
    ];

    const handleChange: AntdTimeRangePickerProps['onChange'] = times => {
      if (times) {
        const [start, end] = times;

        if (start && startProps?.onChange) {
          const startString = start.format('HH:mm');
          startProps.onChange({
            target: { value: startString },
          } as React.ChangeEvent<HTMLInputElement>);
        }

        if (end && endProps?.onChange) {
          const endString = end.format('HH:mm');
          endProps.onChange({
            target: { value: endString },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        // Clear both values
        if (startProps?.onChange) {
          startProps.onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
        if (endProps?.onChange) {
          endProps.onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    };

    return (
      <div className={classNameContainer} ref={ref}>
        {label && (
          <label className="text-sm font-medium text-theme-neutral-11">
            {label}
            {required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div
          className={cn('relative', { 'mt-1': !!label })}
          data-error={error ? 'true' : undefined}
          aria-invalid={error ? 'true' : undefined}
        >
          <RangePicker
            value={rangeValue}
            onChange={handleChange}
            disabled={disabled}
            placeholder={[startPlaceholder, endPlaceholder]}
            format="HH:mm"
            className={cn(
              'w-full h-10',
              error && '[&.ant-picker]:border-danger! error-class',
              className
            )}
            style={{ width: '100%' }}
          />
        </div>
        {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
      </div>
    );
  }
);

TimeRangePicker.displayName = 'TimeRangePicker';

export { TimeRangePicker };
