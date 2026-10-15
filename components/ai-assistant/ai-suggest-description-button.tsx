'use client';

import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOptionalAiAssistant } from './ai-assistant-provider';

interface AiSuggestDescriptionButtonProps {
  /** Tiêu đề card đang nhập — để AI gợi ý mô tả sát hơn. */
  title?: string;
  className?: string;
}

/**
 * Nút "Gợi ý mô tả" ở form tạo/sửa card: mở drawer và nhờ AI soạn mô tả
 * theo tiêu đề. Kết quả hiện trong chat để người dùng copy vào editor.
 */
export function AiSuggestDescriptionButton({
  title,
  className,
}: AiSuggestDescriptionButtonProps) {
  const { t } = useTranslation();
  const assistant = useOptionalAiAssistant();

  if (!assistant?.boardId) return null;

  const trimmedTitle = title?.trim();

  const handleClick = () => {
    assistant.open({
      prompt: trimmedTitle
        ? t('aiAssistant.addIssue.promptWithTitle', { title: trimmedTitle })
        : t('aiAssistant.addIssue.promptNoTitle'),
      // Có tiêu đề thì gửi luôn; chưa có thì để người dùng bổ sung.
      autoSend: !!trimmedTitle,
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn('gap-1.5 px-2.5 text-[13px]', className)}
    >
      <Sparkles className="text-accent" aria-hidden="true" />
      {t('aiAssistant.addIssue.button')}
    </Button>
  );
}
