'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiMark } from './ai-mark';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void | Promise<void>;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  className?: string;
}

const MAX_ROWS = 6;
/** Chữ 16px (không zoom trên iOS) với line-height 24px. */
const LINE_HEIGHT = 24;
/** padding dọc của textarea (py-2) — 1 dòng = 40px. */
const PADDING_Y = 16;
const MIN_HEIGHT = LINE_HEIGHT + PADDING_Y;
const MAX_HEIGHT = LINE_HEIGHT * MAX_ROWS + PADDING_Y;

/**
 * Ô hỏi — phần tử "to" duy nhất của trợ lý: ô trắng lớn, sáng viền accent khi focus.
 * Enter gửi, Shift+Enter xuống dòng, tự giãn tối đa 6 dòng.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(
  (
    { value, onChange, onSend, onStop, isStreaming, disabled, className },
    ref
  ) => {
    const { t } = useTranslation();
    const innerRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      // Khi rỗng, placeholder dài có thể xuống dòng và làm scrollHeight phình
      // lên -> luôn giữ 1 dòng (placeholder thừa bị cắt).
      if (!el.value) {
        el.style.height = `${MIN_HEIGHT}px`;
        el.style.overflowY = 'hidden';
        return;
      }
      el.style.height = 'auto';
      const next = Math.min(el.scrollHeight, MAX_HEIGHT);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
    }, []);

    useEffect(() => {
      resize();
    }, [value, resize]);

    const submit = () => {
      if (disabled || isStreaming) return;
      const text = value.trim();
      if (!text) return;
      void onSend(text);
    };

    const canSend = !disabled && !isStreaming && value.trim().length > 0;

    return (
      <div
        className={cn(
          'flex-none border-t border-line bg-bg px-4 pb-3 pt-3',
          className
        )}
      >
        <div className="flex items-end gap-2.5 rounded-2xl border border-line bg-card py-1.5 pl-3 pr-1.5 shadow-card transition-[border-color,box-shadow] duration-200 ease-soft focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft),var(--shadow-card)]">
          <AiMark size={28} spin={isStreaming} className="mb-1.5" />
          <textarea
            ref={innerRef}
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={t('aiAssistant.placeholder')}
            aria-label={t('aiAssistant.placeholder')}
            onChange={event => onChange(event.target.value)}
            onKeyDown={event => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            className="max-h-[160px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-base leading-6 text-ink placeholder:text-faint focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title={t('aiAssistant.stop')}
              aria-label={t('aiAssistant.stop')}
              className="press mb-0.5 grid size-9 flex-none place-items-center rounded-[10px] bg-ink text-card transition-[opacity,transform] duration-200 ease-soft hover:opacity-90"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title={t('aiAssistant.send')}
              aria-label={t('aiAssistant.send')}
              className="press mb-0.5 grid size-9 flex-none place-items-center rounded-[10px] bg-accent text-on-accent transition-[background-color,opacity,transform] duration-200 ease-soft hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowUp className="size-[18px]" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-xs text-muted">{t('aiAssistant.hint')}</p>
      </div>
    );
  }
);
Composer.displayName = 'Composer';
