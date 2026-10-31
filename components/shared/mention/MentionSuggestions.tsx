'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import type { MentionCandidate } from './mention.utils';
import type {
  MentionAnchorRect,
  MentionPlacement,
} from '@/hooks/use-mention-autocomplete';

const SUGGESTIONS_MAX_WIDTH = 384; // = max-w-sm
const SUGGESTIONS_GAP = 6; // = mt-1.5 / mb-1.5

interface MentionSuggestionsProps {
  id: string;
  items: MentionCandidate[];
  activeIndex: number;
  placement: MentionPlacement;
  /** Khung textarea theo viewport; null → chưa đo được, không render. */
  anchorRect: MentionAnchorRect | null;
  onHover: (index: number) => void;
  onSelect: (candidate: MentionCandidate) => void;
}

/**
 * Listbox gợi ý @userCode. Render qua portal vào body với position: fixed bám theo
 * khung textarea, vì editor có thể nằm trong khung cuộn (sticky comment bar:
 * overflow-y-auto) — popup absolute sẽ bị khung đó cắt mất.
 * onMouseDown preventDefault để textarea không blur khi click.
 */
export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  id,
  items,
  activeIndex,
  placement,
  anchorRect,
  onHover,
  onSelect,
}) => {
  const { t } = useTranslation();
  if (!anchorRect || typeof document === 'undefined') return null;

  const style: React.CSSProperties = {
    left: anchorRect.left,
    width: Math.min(anchorRect.width, SUGGESTIONS_MAX_WIDTH),
    ...(placement === 'top'
      ? { bottom: window.innerHeight - anchorRect.top + SUGGESTIONS_GAP }
      : { top: anchorRect.bottom + SUGGESTIONS_GAP }),
  };

  return createPortal(
    <ul
      id={id}
      role="listbox"
      style={style}
      onMouseDown={e => e.preventDefault()}
      className="animate-pop fixed z-[60] max-h-64 overflow-y-auto rounded-[14px] border border-line bg-card p-1.5 text-sm shadow-lift"
    >
      {items.length === 0 ? (
        <li className="px-3 py-2 text-muted">
          {t('issueDetail.comments.mention.noResult')}
        </li>
      ) : (
        items.map((item, index) => (
          <li
            key={item.userCode}
            role="option"
            aria-selected={index === activeIndex}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(item)}
            className={cn(
              'flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 transition-colors duration-150 ease-soft',
              index === activeIndex ? 'bg-accent-soft' : 'hover:bg-hover'
            )}
          >
            <UserAvatar name={item.displayName} src={item.avatar} size={24} />
            <span
              className={cn(
                'truncate font-medium',
                index === activeIndex ? 'text-accent-text' : 'text-ink'
              )}
            >
              {item.displayName}
            </span>
          </li>
        ))
      )}
    </ul>,
    document.body
  );
};
