'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';

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

/** Ô nhập: Enter gửi, Shift+Enter xuống dòng, tự giãn tối đa 6 dòng. */
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
      el.style.height = 'auto';
      const lineHeight = 20;
      const max = lineHeight * MAX_ROWS + 16;
      el.style.height = `${Math.min(el.scrollHeight, max)}px`;
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
          'border-t border-theme-neutral-5/60 bg-theme-neutral-1 px-3 pb-2 pt-3',
          className
        )}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-theme-neutral-5 bg-theme-neutral-2 px-3 py-2 focus-within:border-theme-main-3">
          <textarea
            ref={innerRef}
            rows={1}
            value={value}
            disabled={disabled}
            placeholder={t('aiAssistant.placeholder')}
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
            className="max-h-[136px] min-h-[20px] flex-1 resize-none bg-transparent text-sm leading-5 text-theme-neutral-11 placeholder:text-theme-neutral-6 focus:outline-none disabled:cursor-not-allowed"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title={t('aiAssistant.stop')}
              aria-label={t('aiAssistant.stop')}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-neutral-10 text-white transition-colors hover:bg-theme-neutral-9"
            >
              <span className="block h-3 w-3 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              title={t('aiAssistant.send')}
              aria-label={t('aiAssistant.send')}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-theme-main text-white transition-colors hover:bg-theme-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Image
                src={Icons.SendHorizontal}
                alt=""
                width={16}
                height={16}
                className="brightness-0 invert"
              />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-theme-neutral-6">
          {t('aiAssistant.hint')}
        </p>
      </div>
    );
  }
);
Composer.displayName = 'Composer';
