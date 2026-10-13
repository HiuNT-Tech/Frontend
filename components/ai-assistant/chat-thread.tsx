'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';
import { useAiChat } from '@/hooks/use-ai-chat';
import { useBoardRole } from '@/hooks/use-board-role';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentActiveBoard } from '@/redux/activeBoard/activeBoardSlice';
import type { Card, EntityId } from '@/config/interface';
import type { AiChatContext, AiUiAction } from '@/types/ai-assistant';
import { useIsMobile } from '@/components/ui/use-mobile';
import { useOptionalAiAssistant } from './ai-assistant-provider';
import { ChatHistory } from './chat-history';
import { Composer } from './composer';
import { MessageList } from './message-list';
import { SuggestionChips } from './suggestion-chips';

interface ChatThreadProps {
  boardId: EntityId;
  context?: AiChatContext;
  className?: string;
}

const iconMain = { filter: 'var(--theme-filter-main)' } as const;

/**
 * Khung chat trong drawer AI (Ctrl/⌘ + J): cột lịch sử hội thoại bên trái
 * (thu gọn được) + luồng chat bên phải.
 */
export function ChatThread({ boardId, context, className }: ChatThreadProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const assistant = useOptionalAiAssistant();
  const activeBoard = useAppSelector(selectCurrentActiveBoard);
  const { isGuest, isReady } = useBoardRole(boardId);
  const [draft, setDraft] = useState('');
  const isMobile = useIsMobile();
  // Desktop mặc định mở lịch sử; mobile mặc định ẩn (lịch sử phủ toàn khung).
  const [historyOpen, setHistoryOpen] = useState<boolean | null>(null);
  const showHistory = historyOpen ?? !isMobile;
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const consumedPromptRef = useRef<object | null>(null);

  const effectiveContext = context ?? assistant?.context;

  // AI gọi tool set_ui_language -> đổi ngôn ngữ giống dropdown trên header
  // (i18n + ?lang= trên URL để F5 vẫn giữ).
  const handleUiAction = useCallback(
    (action: AiUiAction) => {
      if (action.action !== 'set_language') return;
      if (i18n.language === action.language) return;
      void i18n.changeLanguage(action.language);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('lang', action.language);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [i18n, pathname, router, searchParams]
  );

  const chat = useAiChat(boardId, {
    context: effectiveContext,
    onUiAction: handleUiAction,
  });
  const { sendMessage, isLoadingConversation } = chat;

  // Prompt từ nơi khác (nút ✨ trong card detail / add-issue).
  const pendingPrompt = assistant?.pendingPrompt ?? null;
  useEffect(() => {
    if (!pendingPrompt || consumedPromptRef.current === pendingPrompt) return;
    if (isLoadingConversation) return; // chờ nạp xong hội thoại đang mở
    consumedPromptRef.current = pendingPrompt;
    assistant?.consumePendingPrompt();
    if (pendingPrompt.autoSend) {
      setDraft('');
      void sendMessage(pendingPrompt.text);
    } else {
      setDraft(pendingPrompt.text);
      composerRef.current?.focus();
    }
  }, [assistant, isLoadingConversation, pendingPrompt, sendMessage]);

  const boardTitle =
    activeBoard && activeBoard.id === boardId ? activeBoard.title : undefined;

  // Chip ngữ cảnh: đang xem card nào (lấy mã card từ cache nếu có).
  const contextCardId =
    effectiveContext?.page === 'card' ? effectiveContext.cardId : undefined;
  const contextCard = contextCardId
    ? queryClient.getQueryData<Card>(['card-detail', contextCardId])
    : undefined;

  const canWrite = !(isReady && isGuest);

  const handleSend = useCallback(
    async (text: string) => {
      setDraft('');
      await sendMessage(text);
    },
    [sendMessage]
  );

  const handleConversationDeleted = useCallback(
    (id: EntityId) => {
      if (id === chat.conversationId) chat.reset();
    },
    [chat]
  );

  const handleSelectConversation = useCallback(
    (id: EntityId) => {
      chat.selectConversation(id);
      if (isMobile) setHistoryOpen(false);
    },
    [chat, isMobile]
  );

  const handleNewFromHistory = useCallback(() => {
    chat.reset();
    if (isMobile) setHistoryOpen(false);
  }, [chat, isMobile]);

  const handleSuggestion = useCallback(
    (prompt: string) => {
      void handleSend(prompt);
    },
    [handleSend]
  );

  const header = (
    <div className="flex items-center justify-between gap-2 border-b border-theme-neutral-5/60 px-3 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {!showHistory && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setHistoryOpen(true)}
            title={t('aiAssistant.history.show')}
            aria-label={t('aiAssistant.history.show')}
          >
            <Image src={Icons.PanelLeftOpen} alt="" width={18} height={18} />
          </Button>
        )}
        <Image
          src={Icons.Sparkles}
          alt=""
          width={20}
          height={20}
          style={iconMain}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-theme-neutral-11">
            {t('aiAssistant.title')}
          </p>
          {boardTitle && (
            <p className="truncate text-xs text-theme-neutral-7">
              {boardTitle}
            </p>
          )}
        </div>
        {contextCardId && (
          <span
            className="ml-1 hidden max-w-[160px] truncate rounded-full bg-theme-main-1 px-2 py-0.5 text-[11px] font-medium text-theme-main-7 sm:inline-block"
            title={t('aiAssistant.contextCardHint')}
          >
            {t('aiAssistant.contextCard', {
              code: contextCard?.cardCode ?? `#${contextCardId}`,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={chat.reset}
          disabled={
            (!chat.hasMessages && !chat.conversationId) || chat.isStreaming
          }
          title={t('aiAssistant.newChat')}
        >
          <Image
            src={Icons.Plus}
            alt=""
            width={16}
            height={16}
            className="mr-1"
          />
          {t('aiAssistant.newChat')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => assistant?.close()}
          title={t('aiAssistant.close')}
          aria-label={t('aiAssistant.close')}
        >
          <Image src={Icons.X} alt="" width={16} height={16} />
        </Button>
      </div>
    </div>
  );

  const body = chat.isLoadingConversation ? (
    <StateMessage
      variant="block"
      spinner
      i18nKey="aiAssistant.loadingConversation"
    />
  ) : chat.hasMessages ? (
    <MessageList
      boardId={boardId}
      messages={chat.messages}
      isStreaming={chat.isStreaming}
      onApply={chat.applyProposal}
      onCancel={chat.cancelProposal}
      onRetryProposal={chat.retryProposal}
      onRetry={chat.retryLast}
    />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-theme-main-1">
        <Image
          src={Icons.Sparkles}
          alt=""
          width={24}
          height={24}
          style={iconMain}
        />
      </div>
      <div>
        <p className="text-base font-semibold text-theme-neutral-11">
          {t('aiAssistant.emptyTitle')}
        </p>
        <p className="mt-1 text-sm text-theme-neutral-7">
          {t('aiAssistant.emptyDescription')}
        </p>
      </div>
      <SuggestionChips canWrite={canWrite} onSelect={handleSuggestion} />
      {isReady && isGuest && (
        <p className="text-xs text-theme-neutral-7">
          {t('aiAssistant.guestNotice')}
        </p>
      )}
    </div>
  );

  const thread = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      <Composer
        ref={composerRef}
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        onStop={chat.stop}
        isStreaming={chat.isStreaming}
        disabled={!boardId || chat.isLoadingConversation}
      />
    </div>
  );

  return (
    <div className={cn('relative flex h-full min-h-0', className)}>
      {showHistory && (
        <ChatHistory
          boardId={boardId}
          activeId={chat.conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewFromHistory}
          onDeleted={handleConversationDeleted}
          onCollapse={() => setHistoryOpen(false)}
          className={cn(
            'border-r border-theme-neutral-5/60',
            // Mobile: phủ toàn bộ khung chat. Desktop: cột cố định bên trái.
            'absolute inset-0 z-10 md:static md:w-[260px] md:flex-shrink-0'
          )}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">{thread}</div>
    </div>
  );
}
