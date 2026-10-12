'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  canWrite: boolean;
  onSelect: (prompt: string) => void;
  className?: string;
}

const SUGGESTIONS: { key: string; icon: string; writeOnly?: boolean }[] = [
  { key: 'stats', icon: '📊' },
  { key: 'overdue', icon: '⏰' },
  { key: 'mine', icon: '👤' },
  { key: 'create', icon: '➕', writeOnly: true },
];

/** Gợi ý câu hỏi ở empty state — bấm = gửi luôn. */
export function SuggestionChips({
  canWrite,
  onSelect,
  className,
}: SuggestionChipsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2',
        className
      )}
    >
      {SUGGESTIONS.filter(item => canWrite || !item.writeOnly).map(item => (
        <button
          key={item.key}
          type="button"
          onClick={() =>
            onSelect(t(`aiAssistant.suggestions.${item.key}.prompt`))
          }
          className="flex items-start gap-2 rounded-xl border border-theme-neutral-5/70 bg-theme-neutral-1 px-3 py-2.5 text-left text-xs text-theme-neutral-10 transition-colors hover:border-theme-main-3 hover:bg-theme-main-1"
        >
          <span aria-hidden>{item.icon}</span>
          <span>{t(`aiAssistant.suggestions.${item.key}.label`)}</span>
        </button>
      ))}
    </div>
  );
}
