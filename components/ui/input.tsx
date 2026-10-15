import type React from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import Image from 'next/image';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Hiển thị dấu * đỏ bên cạnh label, không set required lên input (dùng khi validate bằng Zod) */
  requiredIndicator?: boolean;
  prefixIcon?: string;
  suffixIcon?: React.ReactNode;
  className?: string;
  classNameContainer?: string;
  notShowErrorMessage?: boolean;
  onlyNumber?: boolean;
  onlyFloat?: boolean;
  classNameError?: string;
  customNode?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      requiredIndicator = false,
      prefixIcon,
      suffixIcon,
      classNameContainer,
      notShowErrorMessage = false,
      onlyNumber = false,
      onlyFloat = false,
      classNameError,
      customNode,
      required,
      ...props
    },
    ref
  ) => {
    const showAsterisk = required === true || requiredIndicator === true;
    const omitNativeRequired = requiredIndicator === true;
    const handleChange: React.ChangeEventHandler<HTMLInputElement> = e => {
      if (onlyNumber) {
        const sanitized = e.target.value.replace(/[^\d]/g, '');
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      } else if (onlyFloat) {
        const sanitized = e.target.value.replace(/[^\d.,]/g, '');
        if (sanitized !== e.target.value) {
          e.target.value = sanitized;
        }
      }
      props.onChange?.(e);
    };

    return (
      <div className={cn('space-y-1', classNameContainer)}>
        {label && (
          <label className="text-[13px] font-semibold text-ink-2">
            {label}
            {showAsterisk && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className={cn('relative', { 'mt-1': !!label })}>
          {prefixIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Image
                src={prefixIcon}
                alt="icon"
                width={20}
                height={20}
                className="icon-muted h-[18px] w-[18px]"
              />
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-10 w-full rounded-[10px] border border-line bg-card py-2 text-[15px] text-ink transition-[border-color,box-shadow] duration-200 ease-soft placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-fill disabled:opacity-60',
              prefixIcon ? 'pl-10 pr-3' : 'px-3',
              suffixIcon ? 'pr-10' : '',
              error &&
                'border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--danger-soft)] error-class',
              className
            )}
            ref={ref}
            data-error={error ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            inputMode={onlyNumber || onlyFloat ? 'decimal' : props.inputMode}
            pattern={
              onlyNumber ? '[0-9]*' : onlyFloat ? '[0-9.,]*' : props.pattern
            }
            {...props}
            required={omitNativeRequired ? undefined : required}
            onChange={handleChange}
          />
          {suffixIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {suffixIcon}
            </div>
          )}
          {customNode && customNode}
        </div>
        {error && !notShowErrorMessage && (
          <p className={cn('text-[13px] text-danger', classNameError)}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
