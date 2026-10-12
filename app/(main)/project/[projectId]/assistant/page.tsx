'use client';

import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { StateMessage } from '@/components/ui/state-message';
import { ChatThread } from '@/components/ai-assistant/chat-thread';
import { toEntityIdOrUndefined } from '@/lib/entity-id';

export default function AssistantPage() {
  const { t } = useTranslation();
  const params = useParams<{ projectId: string }>();
  const boardId = toEntityIdOrUndefined(params.projectId);

  if (!boardId) {
    return (
      <StateMessage variant="block">{t('aiAssistant.noBoard')}</StateMessage>
    );
  }

  return (
    <div className="flex h-full justify-center bg-theme-neutral-2 px-0 md:px-6 md:py-4">
      <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-theme-neutral-1 md:rounded-2xl md:border md:border-theme-neutral-5/60 md:shadow-sm">
        <ChatThread boardId={boardId} variant="page" />
      </div>
    </div>
  );
}
