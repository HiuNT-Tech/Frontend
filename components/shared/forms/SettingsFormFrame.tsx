'use client';

import type React from 'react';
import { ChevronLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Khung form "thêm mới" trong Cài đặt dự án: nút quay lại, tiêu đề + một câu
 * muted, các nhóm thẻ, và chân form với nút căn phải (Huỷ · hành động chính).
 */
export function SettingsFormFrame({
  backLabel,
  onBack,
  title,
  description,
  children,
  cancelLabel,
  submitLabel,
  isPending,
  onSubmit,
  formId,
  className,
}: {
  backLabel: string;
  onBack: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  cancelLabel: string;
  submitLabel: string;
  isPending?: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  formId?: string;
  className?: string;
}) {
  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      noValidate
      className={cn('animate-pop flex min-w-0 flex-col gap-5', className)}
    >
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 text-ink-2"
        >
          <ChevronLeft />
          {backLabel}
        </Button>
        <h2 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-balance text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-[60ch] text-sm text-muted">{description}</p>
        )}
      </div>

      {children}

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isPending}
        >
          {cancelLabel}
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Ô nhập toàn chiều rộng nằm trong thẻ như một hàng. */
export function FieldRow({
  children,
  className,
  first,
}: {
  children: React.ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        'px-[18px] py-4',
        !first && 'border-t border-line',
        className
      )}
    >
      {children}
    </div>
  );
}
