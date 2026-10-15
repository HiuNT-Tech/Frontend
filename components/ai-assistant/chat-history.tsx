'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Group } from '@/components/ui/surface';
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

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const formatTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return isSameDay(date, new Date())
    ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
};

/**
 * Lịch sử hội thoại: phủ lên khung chat trong drawer. Ô tìm + nút chat mới
 * ở trên, danh sách nhóm (hôm nay / trước đó) kiểu Settings với hàng kẻ mảnh.
 */
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

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? conversations.filter(c => c.title.toLowerCase().includes(q))
      : conversations;
    const now = new Date();
    const today: AiConversationSummary[] = [];
    const earlier: AiConversationSummary[] = [];
    filtered.forEach(c => {
      const date = new Date(c.updatedAt);
      if (!Number.isNaN(date.getTime()) && isSameDay(date, now)) today.push(c);
      else earlier.push(c);
    });
    return [
      { key: 'today', items: today },
      { key: 'earlier', items: earlier },
    ].filter(group => group.items.length > 0);
  }, [conversations, query]);

  const isEmpty = groups.length === 0;

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
      className={cn('flex h-full min-h-0 flex-col bg-bg', className)}
      aria-label={t('aiAssistant.history.title')}
    >
      <div className="flex flex-none items-center gap-2 px-4 pb-2 pt-3.5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('aiAssistant.history.search')}
            aria-label={t('aiAssistant.history.search')}
            className="h-9 w-full rounded-[10px] border border-line bg-card pl-9 pr-3 text-sm text-ink transition-[border-color,box-shadow] duration-200 ease-soft placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNew}
          className="flex-none"
        >
          <Plus aria-hidden="true" />
          {t('aiAssistant.history.new')}
        </Button>
        <IconButton
          size="sm"
          onClick={onCollapse}
          aria-label={t('aiAssistant.history.hide')}
        >
          <X aria-hidden="true" />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 pt-2">
        {isLoading ? (
          <div
            className="rounded-card border border-line bg-card shadow-card"
            aria-busy="true"
          >
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 px-[18px] py-[15px]',
                  i > 0 && 'border-t border-line'
                )}
              >
                <div className="skel h-3 flex-1" />
                <div className="skel h-3 w-10" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState
            card
            title={t(
              query
                ? 'aiAssistant.history.noResults'
                : 'aiAssistant.history.emptyTitle'
            )}
            description={query ? undefined : t('aiAssistant.history.emptyHint')}
          />
        ) : (
          groups.map(group => (
            <Group
              key={group.key}
              title={t(`aiAssistant.history.${group.key}`)}
            >
              <ul>
                {group.items.map((conversation, index) => {
                  const isActive = conversation.id === activeId;
                  return (
                    <li
                      key={conversation.id}
                      className={cn(
                        'group relative',
                        index > 0 && 'border-t border-line'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        aria-current={isActive ? 'true' : undefined}
                        title={conversation.title}
                        className={cn(
                          'flex min-h-12 w-full items-center gap-3 py-[11px] pl-[18px] pr-12 text-left text-sm transition-colors duration-200 ease-soft',
                          isActive
                            ? 'bg-accent-soft text-accent-text'
                            : 'text-ink hover:bg-hover'
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {conversation.title}
                        </span>
                        <span
                          className={cn(
                            'flex-none text-[12.5px] tabular-nums',
                            isActive ? 'text-accent-text' : 'text-muted'
                          )}
                        >
                          {formatTime(conversation.updatedAt, i18n.language)}
                        </span>
                      </button>
                      <IconButton
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDelete(conversation)}
                        aria-label={t('aiAssistant.history.delete')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-danger focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                      >
                        <Trash2 aria-hidden="true" />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            </Group>
          ))
        )}
      </div>

      <div className="flex flex-none items-start gap-2 border-t border-line px-4 py-3 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
        <span className="text-pretty">{t('aiAssistant.history.privacy')}</span>
      </div>
    </div>
  );
}
