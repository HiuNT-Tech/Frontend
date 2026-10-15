'use client';

import { useTranslation } from 'react-i18next';
import { Dropdown, type MenuProps } from 'antd';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EntityId } from '@/config/interface';
import { useOptionalAiAssistant } from './ai-assistant-provider';

interface AiCardActionsProps {
  cardId: EntityId;
  cardCode?: string | null;
  /** Người dùng được sửa card → hiện thêm "Viết lại mô tả". */
  canContribute?: boolean;
  className?: string;
}

type ActionKey =
  | 'summarize'
  | 'nextSteps'
  | 'rewriteDescription'
  | 'draftComment';

/**
 * Nút "AI" ở header card detail: mở drawer với prompt gửi sẵn, ngữ cảnh
 * là card đang xem (system prompt sẽ ưu tiên card này).
 */
export function AiCardActions({
  cardId,
  cardCode,
  canContribute = false,
  className,
}: AiCardActionsProps) {
  const { t } = useTranslation();
  const assistant = useOptionalAiAssistant();

  if (!assistant?.boardId) return null;

  const keys: ActionKey[] = canContribute
    ? ['summarize', 'nextSteps', 'rewriteDescription', 'draftComment']
    : ['summarize', 'nextSteps', 'draftComment'];

  const items: MenuProps['items'] = keys.map(key => ({
    key,
    label: t(`aiAssistant.cardActions.${key}`),
  }));

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    assistant.open({
      prompt: t(`aiAssistant.cardActions.prompts.${key}`, {
        code: cardCode || `#${cardId}`,
      }),
      autoSend: true,
      context: { page: 'card', cardId },
    });
  };

  return (
    <Dropdown
      menu={{ items, onClick: handleClick }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('gap-1.5', className)}
        title={t('aiAssistant.cardActions.title')}
        aria-label={t('aiAssistant.cardActions.title')}
      >
        <Sparkles className="text-accent" aria-hidden="true" />
        AI
        <ChevronDown className="size-3.5 text-muted" aria-hidden="true" />
      </Button>
    </Dropdown>
  );
}
