'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { EntityId } from '@/config/interface';
import { useAiAssistant } from './ai-assistant-provider';
import { ChatThread } from './chat-thread';

interface AiDrawerProps {
  boardId: EntityId;
  className?: string;
}

/**
 * Panel trượt bên phải, KHÔNG modal (người dùng vẫn thao tác được với board
 * phía sau). Mobile: full màn hình dưới header.
 */
export function AiDrawer({ boardId, className }: AiDrawerProps) {
  const { t } = useTranslation();
  const { close } = useAiAssistant();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  return (
    <aside
      role="dialog"
      aria-label={t('aiAssistant.title')}
      className={cn(
        'fixed inset-y-0 right-0 z-40 flex h-dvh w-full flex-col border-l border-line bg-bg shadow-lift',
        'md:w-[min(560px,calc(100vw-2rem))]',
        'animate-slide-in-right',
        className
      )}
    >
      <ChatThread boardId={boardId} className="w-full" />
    </aside>
  );
}
