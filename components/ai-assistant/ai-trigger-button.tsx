'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';
import { useOptionalAiAssistant } from './ai-assistant-provider';

interface AiTriggerButtonProps {
  className?: string;
}

/** Nút ✨ ở header — chỉ hiện khi đang trong một project. */
export function AiTriggerButton({ className }: AiTriggerButtonProps) {
  const { t } = useTranslation();
  const assistant = useOptionalAiAssistant();

  if (!assistant?.boardId) return null;

  return (
    <button
      type="button"
      onClick={assistant.toggle}
      title={`${t('aiAssistant.title')} (Ctrl+J)`}
      aria-label={t('aiAssistant.title')}
      aria-pressed={assistant.isOpen}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        assistant.isOpen
          ? 'bg-theme-main text-white'
          : 'bg-white/10 hover:bg-white/20',
        className
      )}
    >
      <Image
        src={Icons.Sparkles}
        alt=""
        width={20}
        height={20}
        className="brightness-0 invert"
      />
    </button>
  );
}
