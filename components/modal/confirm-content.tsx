import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmContentProps {
  content: ReactNode;
  className?: string;
}

/**
 * Nội dung của modal xác nhận. Luôn render như text/React node, KHÔNG qua
 * innerHTML: các chuỗi i18n ở đây nội suy dữ liệu người dùng (tên member,
 * tên status, tiêu đề hội thoại) mà i18next để `escapeValue: false` vì React
 * tự escape — đưa vào innerHTML là thành stored XSS.
 */
export const ConfirmContent = ({ content, className }: ConfirmContentProps) => (
  <div
    className={cn(
      'text-base text-theme-neutral-11 leading-relaxed whitespace-break-spaces flex justify-center text-center',
      className
    )}
  >
    {content}
  </div>
);
