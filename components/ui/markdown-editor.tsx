'use client';

import React, { useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';
import {
  MARKDOWN_PROSE_CLASSNAME,
  MARKDOWN_REMARK_PLUGINS,
} from '@/constant/markdown';

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
  title: string;
}[] = [
  { action: 'bold', icon: Bold, title: 'Bold' },
  { action: 'italic', icon: Italic, title: 'Italic' },
  { action: 'strikethrough', icon: Strikethrough, title: 'Strikethrough' },
  { action: 'unorderedList', icon: List, title: 'Bulleted list' },
  { action: 'orderedList', icon: ListOrdered, title: 'Numbered list' },
  { action: 'table', icon: Table2, title: 'Table' },
  { action: 'quote', icon: Quote, title: 'Quote' },
  { action: 'code', icon: Code2, title: 'Code' },
  { action: 'link', icon: Link2, title: 'Link' },
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
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-theme-neutral-5 bg-theme-neutral-2/40">
      {TOOLBAR_BUTTONS.map(({ action, icon: Icon, title }) => (
        <button
          key={action}
          type="button"
          title={title}
          onMouseDown={e => e.preventDefault()}
          onClick={() => onFormat(action)}
          className="p-1.5 rounded text-theme-neutral-8 hover:bg-theme-neutral-4 hover:text-theme-neutral-11 cursor-pointer"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
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
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const showPreview = previewable && isPreviewing;

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
    <div className={cn('space-y-1', classNameContainer)}>
      {(label || previewable || headerActions) && (
        <div className="flex items-center justify-between">
          {label ? (
            <label className="text-sm font-medium text-theme-neutral-11">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {headerActions}
            {previewable && (
              <button
                type="button"
                onClick={() => setIsPreviewing(p => !p)}
                className="text-xs text-theme-main hover:underline cursor-pointer"
              >
                {isPreviewing ? 'Edit' : 'Preview'}
              </button>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          'relative max-w-full border border-theme-neutral-5 rounded-lg overflow-hidden',
          { 'mt-1': !!label },
          className
        )}
      >
        {showPreview ? (
          <div
            className={cn(
              MARKDOWN_PROSE_CLASSNAME,
              'min-h-[120px] px-3 py-2 bg-theme-neutral-2/30'
            )}
          >
            {value ? (
              <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-theme-neutral-7 italic">
                Nothing to preview
              </span>
            )}
          </div>
        ) : (
          <>
            <MarkdownToolbar onFormat={handleFormat} />
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="w-full min-h-[120px] px-3 py-2 border-0 text-sm font-mono text-theme-neutral-11 focus:outline-none resize-y"
            />
          </>
        )}
      </div>
    </div>
  );
}
