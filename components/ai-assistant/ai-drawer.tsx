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
        'fixed right-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-full flex-col border-l border-theme-neutral-5/60 bg-theme-neutral-1 shadow-[-8px_0_24px_rgba(0,0,0,0.08)]',
        'md:w-auto md:min-w-[440px] md:max-w-[calc(100vw-2rem)]',
        'animate-in slide-in-from-right duration-200',
        className
      )}
    >
      <ChatThread boardId={boardId} className="md:w-[700px] md:max-w-full" />
    </aside>
  );
}
