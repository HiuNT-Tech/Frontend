import type React from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
  classNameContainer?: string;
  notShowErrorMessage?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      classNameContainer,
      notShowErrorMessage = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('space-y-1', classNameContainer)}>
        {label && (
          <label className="text-[13px] font-semibold text-ink-2">
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className={cn('relative', { 'mt-1': !!label })}>
          <textarea
            className={cn(
              'flex min-h-[120px] w-full resize-none rounded-[10px] border border-line bg-card px-3 py-2.5 text-[15px] leading-relaxed text-ink transition-[border-color,box-shadow] duration-200 ease-soft placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-fill disabled:opacity-60',
              error &&
                'border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--danger-soft)] error-class',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && !notShowErrorMessage && (
          <p className="text-[13px] text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
