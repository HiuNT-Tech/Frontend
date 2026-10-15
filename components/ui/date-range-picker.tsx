'use client';

import type React from 'react';
import { forwardRef } from 'react';
import { DatePicker } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Images from '@/assets';

const { RangePicker } = DatePicker;

dayjs.locale('ja');

export interface DateRangePickerProps {
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
  format?: string;
}

const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  (
    {
      label,
      error,
      className,
      classNameContainer,
      startProps,
      endProps,
      startPlaceholder = 'YYYY/MM/DD',
      endPlaceholder = 'YYYY/MM/DD',
      required,
      disabled,
      format = 'YYYY/MM/DD',
    },
    ref
  ) => {
    const startValue = (startProps?.value as string) || '';
    const endValue = (endProps?.value as string) || '';

    const rangeValue: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [
      startValue
        ? dayjs(
            startValue,
            format.includes('年') ? 'YYYY年MM月DD日' : 'YYYY-MM-DD'
          )
        : null,
      endValue
        ? dayjs(
            endValue,
            format.includes('年') ? 'YYYY年MM月DD日' : 'YYYY-MM-DD'
          )
        : null,
    ];

    const handleChange: RangePickerProps['onChange'] = dates => {
      if (dates) {
        const [start, end] = dates;

        if (start && startProps?.onChange) {
          const startString = start.format('YYYY-MM-DD');
          startProps.onChange({
            target: { value: startString },
          } as React.ChangeEvent<HTMLInputElement>);
        }

        if (end && endProps?.onChange) {
          const endString = end.format('YYYY-MM-DD');
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
            format={format}
            className={cn(
              'w-full h-10',
              error && '[&.ant-picker]:border-danger! error-class',
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
        </div>
        {error && <p className="mt-1 text-[13px] text-danger">{error}</p>}
      </div>
    );
  }
);

DateRangePicker.displayName = 'DateRangePicker';

export { DateRangePicker };
