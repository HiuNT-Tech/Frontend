'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  canWrite: boolean;
  onSelect: (prompt: string) => void;
  className?: string;
}

const SUGGESTIONS: { key: string; writeOnly?: boolean }[] = [
  { key: 'stats' },
  { key: 'overdue' },
  { key: 'mine' },
  { key: 'create', writeOnly: true },
];

/** Gợi ý câu hỏi ở empty state — viên thuốc viền mảnh, bấm = gửi luôn. */
export function SuggestionChips({
  canWrite,
  onSelect,
  className,
}: SuggestionChipsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn('flex flex-wrap justify-center gap-2', className)}
      role="group"
      aria-label={t('aiAssistant.emptyTitle')}
    >
      {SUGGESTIONS.filter(item => canWrite || !item.writeOnly).map(
        (item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() =>
              onSelect(t(`aiAssistant.suggestions.${item.key}.prompt`))
            }
            style={{ animationDelay: `${index * 45}ms` }}
            className="press animate-rise min-h-9 rounded-full border border-line bg-card px-[13px] py-2 text-[13px] font-medium text-ink-2 shadow-hair transition-[background-color,border-color,color,transform] duration-200 ease-soft hover:border-transparent hover:bg-accent-soft hover:text-accent-text"
          >
            {t(`aiAssistant.suggestions.${item.key}.label`)}
          </button>
        )
      )}
    </div>
  );
}
