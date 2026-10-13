'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StaticMethodConfirm from '@/components/modal/static-method-confirm';
import { useAiConversations } from '@/hooks/use-ai-conversations';
import type { EntityId } from '@/config/interface';
import type { AiConversationSummary } from '@/types/ai-assistant';

interface ChatHistoryProps {
  boardId: EntityId;
  activeId: EntityId | null;
  onSelect: (id: EntityId) => void;
  onNew: () => void;
  onDeleted: (id: EntityId) => void;
  onCollapse: () => void;
  className?: string;
}

const formatTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

/** Cột lịch sử hội thoại bên trái khung chat AI (tìm kiếm, chọn, xoá). */
export function ChatHistory({
  boardId,
  activeId,
  onSelect,
  onNew,
  onDeleted,
  onCollapse,
  className,
}: ChatHistoryProps) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const { conversations, isLoading, deleteConversation, isDeleting } =
    useAiConversations(boardId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const handleDelete = (conversation: AiConversationSummary) => {
    StaticMethodConfirm.open({
      title: t('aiAssistant.conversations.deleteTitle'),
      content: t('aiAssistant.conversations.deleteConfirm', {
        title: conversation.title,
      }),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'delete',
      onOk: async () => {
        await deleteConversation(conversation.id);
        onDeleted(conversation.id);
      },
    });
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col bg-theme-neutral-2/60',
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="relative min-w-0 flex-1">
          <Image
            src={Icons.Search}
            alt=""
            width={16}
            height={16}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50"
          />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('aiAssistant.history.search')}
            aria-label={t('aiAssistant.history.search')}
            className="h-9 rounded-lg pl-8 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={onCollapse}
          title={t('aiAssistant.history.hide')}
          aria-label={t('aiAssistant.history.hide')}
        >
          <Image src={Icons.PanelLeftClose} alt="" width={18} height={18} />
        </Button>
      </div>

      <button
        type="button"
        onClick={onNew}
        className="mx-3 mt-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-theme-neutral-11 hover:bg-theme-neutral-4/60"
      >
        <Image src={Icons.Plus} alt="" width={16} height={16} />
        {t('aiAssistant.history.new')}
      </button>

      <p className="px-5 pb-1 pt-4 text-xs font-semibold text-theme-neutral-9">
        {t('aiAssistant.history.title')}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {isLoading ? (
          <p className="px-2 py-3 text-xs text-theme-neutral-7">…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-theme-neutral-7">
            {t(
              query
                ? 'aiAssistant.history.noResults'
                : 'aiAssistant.history.empty'
            )}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filtered.map(conversation => {
              const isActive = conversation.id === activeId;
              return (
                <li key={conversation.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'bg-theme-main-1 text-theme-main-7'
                        : 'text-theme-neutral-9 hover:bg-theme-neutral-4/60'
                    )}
                    title={conversation.title}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {conversation.title}
                    </span>
                    <span className="flex-shrink-0 text-[11px] text-theme-neutral-7 group-hover:hidden">
                      {formatTime(conversation.updatedAt, i18n.language)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isDeleting}
                    onClick={() => handleDelete(conversation)}
                    className="absolute right-1 top-1/2 hidden h-7 w-7 -translate-y-1/2 group-hover:inline-flex"
                    title={t('aiAssistant.history.delete')}
                    aria-label={t('aiAssistant.history.delete')}
                  >
                    <Image src={Icons.Trash2} alt="" width={14} height={14} />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2 border-t border-theme-neutral-5/60 px-4 py-3 text-[11px] leading-relaxed text-theme-neutral-7">
        <Image
          src={Icons.ShieldCheck}
          alt=""
          width={14}
          height={14}
          className="mt-0.5 flex-shrink-0 opacity-60"
        />
        <span>{t('aiAssistant.history.privacy')}</span>
      </div>
    </div>
  );
}
