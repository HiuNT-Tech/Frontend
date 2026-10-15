'use client';

import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useOptionalAiAssistant } from './ai-assistant-provider';

interface AiTriggerButtonProps {
  className?: string;
}

/**
 * Nút bật/tắt trợ lý (icon ngôi sao) — chỉ hiện khi đang trong một project.
 * Shell hiện dùng hàng "AI Assistant" riêng trong sidebar; nút này giữ lại cho
 * nơi nào cần một nút nhỏ.
 */
export function AiTriggerButton({ className }: AiTriggerButtonProps) {
  const { t } = useTranslation();
  const assistant = useOptionalAiAssistant();

  if (!assistant?.boardId) return null;

  return (
    <IconButton
      onClick={assistant.toggle}
      title={`${t('aiAssistant.title')} (Ctrl+J)`}
      aria-label={t('aiAssistant.title')}
      aria-pressed={assistant.isOpen}
      active={assistant.isOpen}
      className={className}
    >
      <Sparkles
        className={assistant.isOpen ? 'text-accent' : undefined}
        aria-hidden="true"
      />
    </IconButton>
  );
}
