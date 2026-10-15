'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import type { MentionCandidate } from './mention.utils';
import type { MentionPlacement } from '@/hooks/use-mention-autocomplete';

interface MentionSuggestionsProps {
  id: string;
  items: MentionCandidate[];
  activeIndex: number;
  placement: MentionPlacement;
  onHover: (index: number) => void;
  onSelect: (candidate: MentionCandidate) => void;
}

/** Listbox gợi ý @userCode; onMouseDown preventDefault để textarea không blur khi click. */
export const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  id,
  items,
  activeIndex,
  placement,
  onHover,
  onSelect,
}) => {
  const { t } = useTranslation();
  return (
    <ul
      id={id}
      role="listbox"
      onMouseDown={e => e.preventDefault()}
      className={cn(
        'animate-pop absolute left-0 z-30 max-h-64 w-full max-w-sm overflow-y-auto rounded-[14px] border border-line bg-card p-1.5 text-sm shadow-lift',
        placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      )}
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
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">
              @{item.userCode}
            </span>
          </li>
        ))
      )}
    </ul>
  );
};
