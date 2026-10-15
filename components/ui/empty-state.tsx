import type React from 'react';
import { cn } from '@/lib/utils';

/**
 * Trạng thái rỗng: một dòng đậm nói cái gì đang thiếu + một câu muted nói cách lấp đầy.
 * `card` = bọc trong thẻ trắng (dùng khi đứng riêng trên nền xám).
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  card,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  card?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-[18px] py-[34px] text-center text-sm text-muted',
        card && 'rounded-card border border-line bg-card shadow-card',
        className
      )}
    >
      {icon && (
        <div className="mb-3 text-line-strong [&_svg]:size-10">{icon}</div>
      )}
      <b className="mb-1 block text-base font-semibold text-ink">{title}</b>
      {description && <p className="max-w-[46ch] text-pretty">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
