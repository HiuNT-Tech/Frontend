import type React from 'react';
import { cn } from '@/lib/utils';

/*
 * Khối dựng kiểu iOS Settings: tiêu đề nhóm nằm trên nền xám, ngay dưới là một thẻ trắng;
 * các hàng trong thẻ cách nhau bằng đường kẻ mảnh, nhãn bên trái, giá trị/điều khiển bên phải.
 */

/** Thẻ trắng: viền 1px + bóng rất nhẹ, bo 18px. */
export function Card({
  className,
  as: Component = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'ul' | 'aside';
}) {
  return (
    <Component
      className={cn(
        'min-w-0 rounded-card border border-line bg-card shadow-card',
        className
      )}
      {...props}
    />
  );
}

/** Tiêu đề nhóm: chữ nhỏ, đậm vừa, màu muted, nằm trên nền ngay trên thẻ. */
export function GroupTitle({
  className,
  children,
  action,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { action?: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-h-6 items-center justify-between gap-3 px-1.5 pb-2 text-[13px] font-semibold text-muted',
        className
      )}
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      {action}
    </div>
  );
}

/** Nhóm = tiêu đề + thẻ. */
export function Group({
  title,
  action,
  children,
  className,
  cardClassName,
  hint,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  cardClassName?: string;
  /** Dòng gợi ý nhỏ dưới thẻ */
  hint?: React.ReactNode;
}) {
  return (
    <section className={cn('min-w-0', className)}>
      {title && <GroupTitle action={action}>{title}</GroupTitle>}
      <Card className={cn('overflow-hidden', cardClassName)}>{children}</Card>
      {hint && <p className="px-1.5 pt-2 text-[13px] text-muted">{hint}</p>}
    </section>
  );
}

/** Hàng kiểu Settings: nhãn (+ dòng phụ) bên trái, điều khiển bên phải. */
export function SettingsRow({
  label,
  description,
  children,
  className,
  first,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** Hàng đầu tiên không có đường kẻ phía trên */
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[54px] flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 px-[18px] py-[13px]',
        !first && 'border-t border-line',
        className
      )}
    >
      <div className="min-w-0 flex-[1_1_9em]">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && (
          <span className="block text-[13px] text-muted">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Đầu thẻ: tiêu đề bên trái, hành động bên phải. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2.5 px-[18px] pb-2 pt-4',
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[13px] text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
