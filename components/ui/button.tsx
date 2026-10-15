import type React from 'react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'data';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'xs';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

/*
 * primary  = nút chính (nền accent) · outline = nút trắng có viền mảnh
 * secondary = nền xám nhạt · ghost = không nền · danger = hành động phá huỷ
 * data = nhấn mạnh cảnh báo (amber)
 */
export const buttonVariants = (
  options: { variant?: ButtonProps['variant']; size?: ButtonProps['size'] } = {}
) => {
  const { variant = 'primary', size = 'md' } = options;
  return cn(
    'press inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-soft disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0',
    {
      'bg-accent text-on-accent hover:bg-accent-hover': variant === 'primary',
      'bg-fill text-ink hover:bg-track': variant === 'secondary',
      'border border-line bg-card text-ink shadow-hair hover:bg-fill':
        variant === 'outline',
      'text-ink-2 hover:bg-hover hover:text-ink': variant === 'ghost',
      'bg-danger text-white hover:opacity-90 dark:text-bg':
        variant === 'danger',
      'bg-warn text-white hover:opacity-90 dark:text-bg': variant === 'data',
    },
    {
      'h-6 rounded-[8px] px-2 text-xs [&_svg]:size-3.5': size === 'xs',
      'h-8 rounded-[10px] px-3 text-[13px] [&_svg]:size-4': size === 'sm',
      'h-[38px] rounded-xl px-4 text-sm [&_svg]:size-4': size === 'md',
      'h-11 rounded-xl px-5 text-[15px] [&_svg]:size-[18px]': size === 'lg',
      'size-[38px] rounded-xl p-0 [&_svg]:size-[18px]': size === 'icon',
    }
  );
};

export { Button };
