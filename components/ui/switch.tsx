'use client';

import { cn } from '@/lib/utils';

/** Công tắc kiểu iOS: 46×28, núm trắng trượt có độ nảy. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  size = 'sm',
  className,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Bắt buộc cho trình đọc màn hình */
  label: string;
  disabled?: boolean;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const lg = size === 'lg';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative flex-none rounded-full transition-colors duration-300 ease-soft disabled:cursor-not-allowed disabled:opacity-50',
        lg ? 'h-[38px] w-16' : 'h-7 w-[46px]',
        checked ? 'bg-accent' : 'bg-ink/[0.16]',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.25)] transition-transform duration-[420ms] ease-spring',
          lg ? 'left-1 top-1 size-[30px]' : 'left-[3px] top-[3px] size-[22px]',
          checked && (lg ? 'translate-x-[26px]' : 'translate-x-[18px]')
        )}
      />
    </button>
  );
}
