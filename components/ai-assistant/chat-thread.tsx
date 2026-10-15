'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { History, SquarePen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import { StateMessage } from '@/components/ui/state-message';
import { useAiChat } from '@/hooks/use-ai-chat';
import { useBoardRole } from '@/hooks/use-board-role';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentActiveBoard } from '@/redux/activeBoard/activeBoardSlice';
import type { Card, EntityId } from '@/config/interface';
import type { AiChatContext, AiUiAction } from '@/types/ai-assistant';
import { useOptionalAiAssistant } from './ai-assistant-provider';
import { AiMark } from './ai-mark';
import { ChatHistory } from './chat-history';
import { Composer } from './composer';
import { MessageList } from './message-list';
import { SuggestionChips } from './suggestion-chips';

interface ChatThreadProps {
  boardId: EntityId;
  context?: AiChatContext;
  className?: string;
}

/**
 * Khung chat trong drawer AI (Ctrl/⌘ + J): đầu 60px (dấu AI, tên, dự án,
 * hành động), luồng tin ở giữa, ô hỏi ở dưới. Lịch sử hội thoại phủ lên
 * phần thân khi bật.
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
  const [historyOpen, setHistoryOpen] = useState(false);
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

  // Prompt từ nơi khác (nút AI trong card detail / add-issue).
  const pendingPrompt = assistant?.pendingPrompt ?? null;
  useEffect(() => {
    if (!pendingPrompt || consumedPromptRef.current === pendingPrompt) return;
    if (isLoadingConversation) return; // chờ nạp xong hội thoại đang mở
    consumedPromptRef.current = pendingPrompt;
    assistant?.consumePendingPrompt();
    setHistoryOpen(false);
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
      setHistoryOpen(false);
    },
    [chat]
  );

  const handleNewFromHistory = useCallback(() => {
    chat.reset();
    setHistoryOpen(false);
  }, [chat]);

  const handleSuggestion = useCallback(
    (prompt: string) => {
      void handleSend(prompt);
    },
    [handleSend]
  );

  const header = (
    <div className="flex h-[60px] flex-none items-center gap-3 border-b border-line bg-card pl-[18px] pr-3">
      <AiMark size={28} spin={chat.isStreaming} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-ink">
          {t('aiAssistant.title')}
        </p>
        {(boardTitle || contextCardId) && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] leading-tight text-muted">
            {boardTitle && <span className="truncate">{boardTitle}</span>}
            {contextCardId && (
              <>
                {boardTitle && (
                  <span aria-hidden="true" className="flex-none">
                    ·
                  </span>
                )}
                <span
                  className="truncate font-medium text-accent-text"
                  title={t('aiAssistant.contextCardHint')}
                >
                  {t('aiAssistant.contextCard', {
                    code: contextCard?.cardCode ?? `#${contextCardId}`,
                  })}
                </span>
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-0.5">
        <IconButton
          onClick={chat.reset}
          disabled={
            (!chat.hasMessages && !chat.conversationId) || chat.isStreaming
          }
          aria-label={t('aiAssistant.newChat')}
        >
          <SquarePen aria-hidden="true" />
        </IconButton>
        <IconButton
          onClick={() => setHistoryOpen(open => !open)}
          active={historyOpen}
          aria-pressed={historyOpen}
          aria-label={t(
            historyOpen
              ? 'aiAssistant.history.hide'
              : 'aiAssistant.history.show'
          )}
        >
          <History aria-hidden="true" />
        </IconButton>
        <IconButton
          onClick={() => assistant?.close()}
          aria-label={t('aiAssistant.close')}
        >
          <X aria-hidden="true" />
        </IconButton>
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
    <div className="animate-pop flex min-h-full flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <AiMark size={40} />
      <div>
        <p className="text-balance text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {t('aiAssistant.emptyTitle')}
        </p>
        <p className="mx-auto mt-1.5 max-w-[42ch] text-pretty text-sm text-muted">
          {t('aiAssistant.emptyDescription')}
        </p>
      </div>
      <SuggestionChips
        canWrite={canWrite}
        onSelect={handleSuggestion}
        className="max-w-[440px]"
      />
      {isReady && isGuest && (
        <p className="max-w-[42ch] text-pretty text-[12.5px] text-muted">
          {t('aiAssistant.guestNotice')}
        </p>
      )}
    </div>
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {header}
      <div className="relative flex min-h-0 flex-1 flex-col">
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
        {historyOpen && (
          <ChatHistory
            boardId={boardId}
            activeId={chat.conversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewFromHistory}
            onDeleted={handleConversationDeleted}
            onCollapse={() => setHistoryOpen(false)}
            className="animate-fade-in absolute inset-0 z-10"
          />
        )}
      </div>
    </div>
  );
}
