import { cn } from '@/lib/utils';

interface AiMarkProps {
  size?: number;
  /** Đang bận (stream / chờ phản hồi) → ngôi sao xoay. */
  spin?: boolean;
  className?: string;
}

/**
 * Dấu hiệu AI: ô accent tĩnh với ngôi sao nét mảnh — không gradient, không glow.
 */
export function AiMark({ size = 22, spin, className }: AiMarkProps) {
  const icon = Math.round(size * 0.62);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid flex-none place-items-center bg-accent text-on-accent',
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
      }}
    >
      <svg
        className={cn(spin && 'animate-spin')}
        viewBox="0 0 24 24"
        width={icon}
        height={icon}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M12 3.2l1.6 5.2 5.2 1.6-5.2 1.6L12 16.8l-1.6-5.2L5.2 10l5.2-1.6L12 3.2z" />
        <path d="M18.6 15.6l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8z" />
      </svg>
    </span>
  );
}
