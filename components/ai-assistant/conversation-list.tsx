'use client';

import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import dayjs from 'dayjs';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';
import StaticMethodConfirm from '@/components/modal/static-method-confirm';
import { useAiConversations } from '@/hooks/use-ai-conversations';
import type { EntityId } from '@/config/interface';

interface ConversationListProps {
  boardId: EntityId;
  activeId: EntityId | null;
  onSelect: (id: EntityId) => void;
  onNew: () => void;
  onDeleted: (id: EntityId) => void;
  className?: string;
}

const formatTime = (value: string) => {
  const date = dayjs(value);
  return date.isSame(dayjs(), 'day')
    ? date.format('HH:mm')
    : date.format('DD/MM');
};

/** Cột danh sách hội thoại ở trang full `/assistant`. */
export function ConversationList({
  boardId,
  activeId,
  onSelect,
  onNew,
  onDeleted,
  className,
}: ConversationListProps) {
  const { t } = useTranslation();
  const { conversations, isLoading, deleteConversation, isDeleting } =
    useAiConversations(boardId);

  const confirmDelete = (id: EntityId, title: string) => {
    StaticMethodConfirm.open({
      title: t('aiAssistant.conversations.deleteTitle'),
      content: t('aiAssistant.conversations.deleteConfirm', { title }),
      okText: t('common.delete'),
      type: 'delete',
      onOk: async () => {
        await deleteConversation(id);
        onDeleted(id);
      },
    });
  };

  return (
    <aside
      className={cn('flex min-h-0 flex-col bg-theme-neutral-2', className)}
    >
      <div className="flex items-center justify-between gap-2 border-b border-theme-neutral-5/60 px-3 py-3">
        <p className="text-sm font-semibold text-theme-neutral-11">
          {t('aiAssistant.conversations.title')}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onNew}
          disabled={activeId === null}
          title={t('aiAssistant.newChat')}
        >
          <Image
            src={Icons.Plus}
            alt=""
            width={14}
            height={14}
            className="mr-1"
          />
          {t('aiAssistant.conversations.new')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <StateMessage variant="block" spinner i18nKey="common.loading" />
        ) : conversations.length === 0 ? (
          <StateMessage
            variant="block"
            i18nKey="aiAssistant.conversations.empty"
          />
        ) : (
          <ul className="space-y-1">
            {conversations.map(conversation => {
              const isActive = conversation.id === activeId;
              return (
                <li key={conversation.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 pr-8 text-left transition-colors',
                      isActive
                        ? 'bg-theme-neutral-1 shadow-sm ring-1 ring-theme-main-3'
                        : 'hover:bg-theme-neutral-1'
                    )}
                  >
                    <span
                      className={cn(
                        'line-clamp-2 text-xs',
                        isActive
                          ? 'font-semibold text-theme-neutral-11'
                          : 'text-theme-neutral-10'
                      )}
                    >
                      {conversation.title}
                    </span>
                    <span className="text-[11px] text-theme-neutral-6">
                      {formatTime(conversation.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete(conversation.id, conversation.title)
                    }
                    disabled={isDeleting}
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                    className="absolute right-1.5 top-1.5 rounded p-1 opacity-0 transition-opacity hover:bg-theme-neutral-3 group-hover:opacity-100 focus:opacity-100"
                  >
                    <Image src={Icons.X} alt="" width={12} height={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
