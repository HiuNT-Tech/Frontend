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
        'absolute left-0 z-30 w-full max-w-sm overflow-hidden rounded-lg border border-theme-neutral-5 bg-theme-neutral-1 py-1 text-sm shadow-lg',
        placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
      )}
    >
      {items.length === 0 ? (
        <li className="px-3 py-2 text-theme-neutral-7">
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
              'flex cursor-pointer items-center gap-2 px-3 py-2',
              index === activeIndex
                ? 'bg-theme-main-1'
                : 'hover:bg-theme-neutral-2'
            )}
          >
            <UserAvatar name={item.displayName} src={item.avatar} size={24} />
            <span className="truncate font-medium text-theme-neutral-11">
              {item.displayName}
            </span>
            <span className="ml-auto shrink-0 font-mono text-xs text-theme-neutral-7">
              @{item.userCode}
            </span>
          </li>
        ))
      )}
    </ul>
  );
};
