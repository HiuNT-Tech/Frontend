import { useTranslation } from 'react-i18next';
import { PRIORITY } from '@/config/enum';
import { cn } from '@/lib/utils';

/**
 * Ba vạch mức độ ưu tiên (1/2/3 vạch). Cao = đỏ, còn lại = mực; vạch tắt = line-strong.
 * Màu chỉ dùng cho nghĩa "cao", đúng tinh thần thiết kế.
 */
export function PriorityFlag({
  priority,
  className,
}: {
  priority?: number | null;
  className?: string;
}) {
  const { t } = useTranslation();
  if (priority == null) return null;
  const bars =
    priority === PRIORITY.HIGH ? 3 : priority === PRIORITY.NORMAL ? 2 : 1;
  const label =
    priority === PRIORITY.HIGH
      ? t('issues.priority.high')
      : priority === PRIORITY.NORMAL
        ? t('issues.priority.normal')
        : t('issues.priority.low');

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={cn('inline-flex h-3 flex-none items-end gap-[2px]', className)}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={cn(
            'w-[3px] rounded-[1.5px]',
            i < bars
              ? priority === PRIORITY.HIGH
                ? 'bg-danger'
                : 'bg-ink-2'
              : 'bg-line-strong'
          )}
          style={{ height: 4 + i * 4 }}
        />
      ))}
    </span>
  );
}

/** Vạch + nhãn, dùng trong bảng và danh sách. */
export function PriorityLabel({
  priority,
  label,
  className,
}: {
  priority?: number | null;
  label?: string | null;
  className?: string;
}) {
  if (!label) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[12.5px] text-muted',
        priority === PRIORITY.HIGH && 'text-danger',
        className
      )}
    >
      <PriorityFlag priority={priority} />
      {label}
    </span>
  );
}
