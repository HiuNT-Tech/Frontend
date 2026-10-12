'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';
import { useOptionalAiAssistant } from './ai-assistant-provider';

interface AiSuggestDescriptionButtonProps {
  /** Tiêu đề card đang nhập — để AI gợi ý mô tả sát hơn. */
  title?: string;
  className?: string;
}

/**
 * Nút "✨ Gợi ý mô tả" ở form tạo/sửa card: mở drawer và nhờ AI soạn mô tả
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
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-theme-main-6 transition-colors hover:bg-theme-main-1',
        className
      )}
    >
      <Image
        src={Icons.Sparkles}
        alt=""
        width={14}
        height={14}
        className="h-3.5 w-3.5"
        style={{ filter: 'var(--theme-filter-main)' }}
      />
      {t('aiAssistant.addIssue.button')}
    </button>
  );
}
