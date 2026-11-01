'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Table2,
  Quote,
  Code2,
  Link2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  MARKDOWN_PROSE_CLASSNAME,
  MARKDOWN_REMARK_PLUGINS,
} from '@/constant/markdown';
import { useMentionAutocomplete } from '@/hooks/use-mention-autocomplete';
import { MentionSuggestions } from '@/components/shared/mention/MentionSuggestions';
import { MENTION_MARKDOWN_COMPONENTS } from '@/components/shared/mention/MentionText';
import type { MentionCandidate } from '@/components/shared/mention/mention.utils';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  classNameContainer?: string;
  required?: boolean;
  /** Extra controls rendered at the right of the label row (before the Preview toggle). */
  headerActions?: React.ReactNode;
  /** Show the built-in Edit/Preview toggle. Set to false when the parent already renders its own preview. */
  previewable?: boolean;
  rows?: number;
  /** Member để gợi ý @userCode khi gõ @. undefined → không autocomplete (mô tả, add-issue giữ nguyên). */
  mentionCandidates?: MentionCandidate[];
  /**
   * Không viền ngoài: dùng khi editor nằm sẵn trong một thẻ (card) — thanh công cụ
   * và ô nhập chỉ còn cách nhau bằng đường kẻ mảnh.
   */
  flush?: boolean;
  /** Gọi khi người dùng nhấn Ctrl/Cmd+Enter (gửi nhanh). */
  onSubmit?: () => void;
  autoFocus?: boolean;
  id?: string;
}

type FormatAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'unorderedList'
  | 'orderedList'
  | 'quote'
  | 'code'
  | 'link'
  | 'table';

const TOOLBAR_BUTTONS: {
  action: FormatAction;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
}[] = [
  { action: 'bold', icon: Bold, titleKey: 'bold' },
  { action: 'italic', icon: Italic, titleKey: 'italic' },
  { action: 'strikethrough', icon: Strikethrough, titleKey: 'strikethrough' },
  { action: 'unorderedList', icon: List, titleKey: 'bulletedList' },
  { action: 'orderedList', icon: ListOrdered, titleKey: 'numberedList' },
  { action: 'table', icon: Table2, titleKey: 'table' },
  { action: 'quote', icon: Quote, titleKey: 'quote' },
  { action: 'code', icon: Code2, titleKey: 'code' },
  { action: 'link', icon: Link2, titleKey: 'link' },
];

/** Áp dụng prefix cho từng dòng trong đoạn được chọn (dùng cho list/quote). */
function prefixLines(text: string, prefix: (index: number) => string) {
  return text
    .split('\n')
    .map((line, i) => `${prefix(i)}${line}`)
    .join('\n');
}

function applyFormat(
  textarea: HTMLTextAreaElement,
  action: FormatAction
): { value: string; selectionStart: number; selectionEnd: number } {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);
  let insertion = selected;
  let selectFrom = start;
  let selectTo = end;

  switch (action) {
    case 'bold': {
      const text = selected || 'bold text';
      insertion = `**${text}**`;
      selectFrom = start + 2;
      selectTo = selectFrom + text.length;
      break;
    }
    case 'italic': {
      const text = selected || 'italic text';
      insertion = `*${text}*`;
      selectFrom = start + 1;
      selectTo = selectFrom + text.length;
      break;
    }
    case 'strikethrough': {
      const text = selected || 'strikethrough text';
      insertion = `~~${text}~~`;
      selectFrom = start + 2;
      selectTo = selectFrom + text.length;
      break;
    }
    case 'unorderedList': {
      const text = selected || 'List item';
      insertion = prefixLines(text, () => '- ');
      selectFrom = start;
      selectTo = start + insertion.length;
      break;
    }
    case 'orderedList': {
      const text = selected || 'List item';
      insertion = prefixLines(text, i => `${i + 1}. `);
      selectFrom = start;
      selectTo = start + insertion.length;
      break;
    }
    case 'quote': {
      const text = selected || 'Quote';
      insertion = prefixLines(text, () => '> ');
      selectFrom = start;
      selectTo = start + insertion.length;
      break;
    }
    case 'code': {
      const text = selected || 'code';
      if (text.includes('\n')) {
        insertion = `\`\`\`\n${text}\n\`\`\``;
        selectFrom = start + 4;
      } else {
        insertion = `\`${text}\``;
        selectFrom = start + 1;
      }
      selectTo = selectFrom + text.length;
      break;
    }
    case 'link': {
      const text = selected || 'link text';
      insertion = `[${text}](url)`;
      selectFrom = start + text.length + 3;
      selectTo = selectFrom + 3;
      break;
    }
    case 'table': {
      const needsLeadingNewline = start > 0 && value[start - 1] !== '\n';
      insertion = `${needsLeadingNewline ? '\n' : ''}| Header | Header |\n| --- | --- |\n| Cell | Cell |\n`;
      selectFrom = start + insertion.length;
      selectTo = selectFrom;
      break;
    }
  }

  return {
    value: value.slice(0, start) + insertion + value.slice(end),
    selectionStart: selectFrom,
    selectionEnd: selectTo,
  };
}

function MarkdownToolbar({
  onFormat,
}: {
  onFormat: (action: FormatAction) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="toolbar"
      className="flex items-center gap-0.5 overflow-x-auto border-b border-line bg-fill/60 px-1.5 py-1"
    >
      {TOOLBAR_BUTTONS.map(({ action, icon: Icon, titleKey }) => {
        const label = t(`issueDetail.markdown.toolbar.${titleKey}`);
        return (
          <button
            key={action}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onFormat(action)}
            className="press inline-grid size-8 flex-none place-items-center rounded-[8px] text-muted transition-colors duration-200 ease-soft hover:bg-hover hover:text-ink"
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  className,
  classNameContainer,
  required,
  previewable = true,
  rows = 6,
  headerActions,
  mentionCandidates,
  flush = false,
  onSubmit,
  autoFocus,
  id,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorBoxRef = useRef<HTMLDivElement>(null);
  const mention = useMentionAutocomplete({
    value,
    onChange,
    textareaRef,
    anchorRef: editorBoxRef,
    candidates: mentionCandidates,
  });
  const suggestionsId = useId();
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const [isPreviewing, setIsPreviewing] = useState(false);
  const showPreview = previewable && isPreviewing;

  // Popup mention định vị fixed theo textarea → đo lại khi cuộn (mọi khung, capture)
  // hoặc đổi kích thước cửa sổ, nếu không popup sẽ "trôi" khỏi ô nhập.
  const { isOpen: isMentionOpen, syncFromCaret } = mention;
  useEffect(() => {
    if (!isMentionOpen) return;
    const reposition = () => syncFromCaret();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isMentionOpen, syncFromCaret]);

  const handleFormat = (action: FormatAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = applyFormat(textarea, action);
    onChange(result.value);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  return (
    <div className={cn('relative space-y-1.5', classNameContainer)}>
      {(label || previewable || headerActions) && (
        <div
          className={cn(
            'flex min-h-6 items-center justify-between gap-2',
            flush && 'px-3 pt-2'
          )}
        >
          {label ? (
            <label
              htmlFor={textareaId}
              className="text-[13px] font-semibold text-ink-2"
            >
              {label}
              {required && <span className="ml-1 text-danger">*</span>}
            </label>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            {headerActions}
            {previewable && (
              <button
                type="button"
                onClick={() => setIsPreviewing(p => !p)}
                aria-pressed={isPreviewing}
                className="press rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-accent transition-colors duration-200 ease-soft hover:bg-accent-soft"
              >
                {isPreviewing ? t('common.edit') : t('common.preview')}
              </button>
            )}
          </div>
        </div>
      )}
      <div
        ref={editorBoxRef}
        className={cn(
          'relative max-w-full overflow-hidden bg-card transition-[border-color,box-shadow] duration-200 ease-soft',
          flush
            ? ''
            : 'rounded-[10px] border border-line focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]',
          className
        )}
      >
        {showPreview ? (
          <div
            className={cn(
              MARKDOWN_PROSE_CLASSNAME,
              'min-h-[120px] bg-fill/40 px-3.5 py-3'
            )}
          >
            {value ? (
              <ReactMarkdown
                remarkPlugins={MARKDOWN_REMARK_PLUGINS}
                components={MENTION_MARKDOWN_COMPONENTS}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-muted">
                {t('issueDetail.markdown.nothingToPreview')}
              </span>
            )}
          </div>
        ) : (
          <>
            <MarkdownToolbar onFormat={handleFormat} />
            <textarea
              id={textareaId}
              ref={textareaRef}
              value={value}
              autoFocus={autoFocus}
              onChange={e => {
                onChange(e.target.value);
                mention.syncFromCaret(e.target.value);
              }}
              onKeyDown={e => {
                if (
                  onSubmit &&
                  e.key === 'Enter' &&
                  (e.ctrlKey || e.metaKey) &&
                  !mention.isOpen
                ) {
                  e.preventDefault();
                  onSubmit();
                  return;
                }
                mention.handleKeyDown(e);
              }}
              onKeyUp={() => mention.syncFromCaret()}
              onClick={() => mention.syncFromCaret()}
              onBlur={mention.close}
              aria-autocomplete={mentionCandidates ? 'list' : undefined}
              aria-expanded={mention.isOpen}
              aria-controls={mention.isOpen ? suggestionsId : undefined}
              placeholder={placeholder}
              rows={rows}
              className="block w-full min-h-[96px] resize-y border-0 bg-transparent px-3.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-faint focus:outline-none focus-visible:outline-none"
            />
          </>
        )}
      </div>
      {mention.isOpen && (
        <MentionSuggestions
          id={suggestionsId}
          items={mention.items}
          activeIndex={mention.activeIndex}
          placement={mention.placement}
          anchorRect={mention.anchorRect}
          onHover={mention.setActiveIndex}
          onSelect={mention.select}
        />
      )}
    </div>
  );
}
