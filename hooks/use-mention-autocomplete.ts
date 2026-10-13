'use client';

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import {
  detectMentionQuery,
  filterMentionCandidates,
  insertMention,
  type MentionCandidate,
  type MentionQuery,
} from '@/components/shared/mention/mention.utils';

export const MENTION_SUGGESTION_LIMIT = 8;
export type MentionPlacement = 'top' | 'bottom';

interface UseMentionAutocompleteArgs {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** undefined → tắt hoàn toàn (description, add-issue) */
  candidates?: MentionCandidate[];
}

export const useMentionAutocomplete = ({
  value,
  onChange,
  textareaRef,
  candidates,
}: UseMentionAutocompleteArgs) => {
  const enabled = candidates !== undefined;
  const [range, setRange] = useState<(MentionQuery & { end: number }) | null>(
    null
  );
  const [activeIndex, setActiveIndex] = useState(0);
  /** start của mention đã Escape → không mở lại cho tới khi gõ @ mới hoặc caret rời đi */
  const [dismissedStart, setDismissedStart] = useState<number | null>(null);
  const [placement, setPlacement] = useState<MentionPlacement>('bottom');

  const items = useMemo(
    () =>
      range
        ? filterMentionCandidates(
            candidates ?? [],
            range.query,
            MENTION_SUGGESTION_LIMIT
          )
        : [],
    [candidates, range]
  );
  const isOpen = enabled && range !== null && dismissedStart !== range.start;

  /** Gọi sau mỗi onChange / keyup / click: đọc caret thật từ textarea. */
  const syncFromCaret = useCallback(
    (nextValue?: string) => {
      const el = textareaRef.current;
      if (!enabled || !el) return;
      const text = nextValue ?? el.value;
      const detected = detectMentionQuery(
        text,
        el.selectionStart ?? text.length
      );
      if (!detected) {
        setRange(null);
        setDismissedStart(null);
        return;
      }
      // @ mới (start khác) → cho phép mở lại
      setDismissedStart(prev =>
        prev !== null && prev !== detected.start ? null : prev
      );
      setRange(prev => {
        if (!prev || prev.start !== detected.start) setActiveIndex(0);
        return { ...detected, end: el.selectionStart ?? text.length };
      });
      // Popup mở phía trên khi textarea gần đáy viewport (sticky comment bar)
      const rect = el.getBoundingClientRect();
      setPlacement(window.innerHeight - rect.bottom < 260 ? 'top' : 'bottom');
    },
    [enabled, textareaRef]
  );

  const close = useCallback(() => {
    if (range) setDismissedStart(range.start);
    setRange(null);
  }, [range]);

  const select = useCallback(
    (candidate: MentionCandidate) => {
      const el = textareaRef.current;
      if (!range || !el) return;
      const next = insertMention(
        value,
        range.start,
        range.end,
        candidate.userCode
      );
      onChange(next.value);
      setRange(null);
      setDismissedStart(null);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(next.caret, next.caret);
      });
    },
    [onChange, range, textareaRef, value]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex(i => (items.length ? (i + 1) % items.length : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(i =>
            items.length ? (i - 1 + items.length) % items.length : 0
          );
          break;
        case 'Enter':
        case 'Tab':
          if (items[activeIndex]) {
            e.preventDefault(); // không xuống dòng / không rời textarea
            select(items[activeIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [activeIndex, close, isOpen, items, select]
  );

  return {
    isOpen,
    items,
    activeIndex,
    setActiveIndex,
    placement,
    query: range?.query ?? '',
    syncFromCaret,
    select,
    close,
    handleKeyDown,
  };
};
