import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AiHttpError, AiService } from '@/lib/apis/ai';
import { BoardService } from '@/lib/apis/board';
import { CardService } from '@/lib/apis/card';
import { readSseStream } from '@/lib/ai-sse';
import { toastHelpers } from '@/hooks/use-toast';
import { AI_CONVERSATIONS_QUERY_KEY } from '@/hooks/use-ai-conversations';
import type {
  Card,
  CreateNewCardRequest,
  EntityId,
  UpdateCardRequest,
} from '@/config/interface';
import type {
  AiAppliedAction,
  AiChatContext,
  AiChatMessage,
  AiMessageBlock,
  AiProposalPatch,
  AiProposalState,
  AiStoredMessage,
  AiStreamEvent,
} from '@/types/ai-assistant';

const ACTIVE_KEY_PREFIX = 'ai-chat:active:';

const genId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const textOfBlocks = (blocks: AiMessageBlock[]) =>
  blocks
    .filter(
      (b): b is Extract<AiMessageBlock, { kind: 'text' }> => b.kind === 'text'
    )
    .map(b => b.text)
    .join('\n')
    .trim();

/** Chuẩn hoá block tải từ DB: không còn trạng thái "đang chạy". */
const normalizeBlocks = (blocks: AiMessageBlock[]): AiMessageBlock[] =>
  blocks.map(b =>
    b.kind === 'tool' && b.status === 'running'
      ? { ...b, status: 'error' as const }
      : b.kind === 'proposal' && b.state.status === 'applying'
        ? { ...b, state: { ...b.state, status: 'pending' as const } }
        : b
  );

const fromStored = (message: AiStoredMessage): AiChatMessage => {
  const blocks =
    message.blocks && message.blocks.length > 0
      ? normalizeBlocks(message.blocks)
      : message.content
        ? [{ kind: 'text' as const, text: message.content }]
        : [];
  return {
    id: `db-${message.id}`,
    dbId: message.id,
    role: message.role === 'USER' ? 'user' : 'assistant',
    content: message.content,
    blocks,
    createdAt: Date.parse(message.createdAt) || Date.now(),
    streaming: false,
  };
};

const readActiveId = (boardId?: EntityId): EntityId | null => {
  if (!boardId || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${ACTIVE_KEY_PREFIX}${boardId}`);
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
};

const writeActiveId = (boardId: EntityId, id: EntityId | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${ACTIVE_KEY_PREFIX}${boardId}`;
    if (id) window.sessionStorage.setItem(key, String(id));
    else window.sessionStorage.removeItem(key);
  } catch {
    // sessionStorage có thể bị chặn (private mode) — bỏ qua.
  }
};

export interface UseAiChatOptions {
  context?: AiChatContext;
}

/**
 * Hội thoại với AI Assistant. Lịch sử lưu ở BE (`ai_conversations`); FE chỉ
 * giữ id hội thoại đang mở trong sessionStorage để F5 / mở lại drawer vẫn
 * tiếp tục đúng hội thoại.
 */
export const useAiChat = (boardId?: EntityId, options?: UseAiChatOptions) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<EntityId | null>(() =>
    readActiveId(boardId)
  );
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(
    () => readActiveId(boardId) !== null
  );
  const abortRef = useRef<AbortController | null>(null);
  const pendingActionsRef = useRef<AiAppliedAction[]>([]);
  const conversationIdRef = useRef<EntityId | null>(conversationId);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const invalidateConversations = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [AI_CONVERSATIONS_QUERY_KEY, boardId],
    });
  }, [boardId, queryClient]);

  const updateMessage = useCallback(
    (id: string, updater: (message: AiChatMessage) => AiChatMessage) => {
      setMessages(prev => prev.map(m => (m.id === id ? updater(m) : m)));
    },
    []
  );

  /* ─── Tải / chọn hội thoại ─── */

  const loadConversation = useCallback(
    async (id: EntityId | null) => {
      if (!boardId) return;
      abortRef.current?.abort();
      pendingActionsRef.current = [];
      const seq = ++loadSeqRef.current;

      if (!id) {
        setConversationId(null);
        setMessages([]);
        setIsLoadingConversation(false);
        writeActiveId(boardId, null);
        return;
      }

      setIsLoadingConversation(true);
      try {
        const detail = await AiService.getConversation(id);
        if (seq !== loadSeqRef.current) return; // đã chọn hội thoại khác
        if (detail.boardId !== boardId) {
          // Id lưu trong storage thuộc board khác → bỏ.
          setConversationId(null);
          setMessages([]);
          writeActiveId(boardId, null);
          return;
        }
        setConversationId(detail.id);
        setMessages(detail.messages.map(fromStored));
        writeActiveId(boardId, detail.id);
      } catch {
        if (seq !== loadSeqRef.current) return;
        // 404 (đã xoá) hoặc lỗi mạng → bắt đầu hội thoại mới.
        setConversationId(null);
        setMessages([]);
        writeActiveId(boardId, null);
      } finally {
        if (seq === loadSeqRef.current) setIsLoadingConversation(false);
      }
    },
    [boardId]
  );

  // Mount / đổi board → nạp hội thoại đang mở của board đó (nếu có).
  useEffect(() => {
    void loadConversation(readActiveId(boardId));
  }, [boardId, loadConversation]);

  const selectConversation = useCallback(
    (id: EntityId) => {
      if (id === conversationIdRef.current) return;
      void loadConversation(id);
    },
    [loadConversation]
  );

  /** Bắt đầu hội thoại mới (BE tạo khi gửi message đầu tiên). */
  const reset = useCallback(() => {
    void loadConversation(null);
  }, [loadConversation]);

  /* ─── Stream ─── */

  const applyEvent = useCallback(
    (assistantId: string, event: AiStreamEvent) => {
      if (event.type === 'conversation') {
        setConversationId(event.id);
        conversationIdRef.current = event.id;
        if (boardId) writeActiveId(boardId, event.id);
        if (event.isNew) invalidateConversations();
        return;
      }
      if (event.type === 'done') {
        invalidateConversations(); // sắp xếp lại theo updatedAt
        return;
      }

      updateMessage(assistantId, message => {
        const blocks = [...message.blocks];
        const last = blocks[blocks.length - 1];
        switch (event.type) {
          case 'token': {
            if (last && last.kind === 'text') {
              blocks[blocks.length - 1] = {
                ...last,
                text: last.text + event.text,
              };
            } else {
              blocks.push({ kind: 'text', text: event.text });
            }
            break;
          }
          case 'tool_start':
            blocks.push({
              kind: 'tool',
              id: event.id,
              name: event.name,
              label: event.label,
              status: 'running',
            });
            break;
          case 'tool_result': {
            const index = blocks.findIndex(
              b => b.kind === 'tool' && b.id === event.id
            );
            if (index !== -1) {
              const block = blocks[index];
              if (block.kind === 'tool') {
                blocks[index] = {
                  ...block,
                  status: event.ok ? 'ok' : 'error',
                  summary: event.summary,
                };
              }
            }
            break;
          }
          case 'cards':
            blocks.push({
              kind: 'cards',
              items: event.items,
              total: event.total,
            });
            break;
          case 'proposal':
            blocks.push({
              kind: 'proposal',
              state: { proposal: event.proposal, status: 'pending' },
            });
            break;
          case 'error':
            blocks.push({
              kind: 'error',
              code: event.code,
              message: event.message,
            });
            break;
        }
        return { ...message, blocks, content: textOfBlocks(blocks) };
      });
    },
    [boardId, invalidateConversations, updateMessage]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runRequest = useCallback(
    async (content: string, assistantId: string, retry: boolean) => {
      if (!boardId) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      const appliedActions = pendingActionsRef.current;
      pendingActionsRef.current = [];

      const restoreActions = () => {
        pendingActionsRef.current = [
          ...appliedActions,
          ...pendingActionsRef.current,
        ];
      };

      try {
        const res = await AiService.streamChat(
          {
            boardId,
            conversationId: conversationIdRef.current ?? undefined,
            content,
            retry: retry || undefined,
            context: options?.context,
            appliedActions: appliedActions.length ? appliedActions : undefined,
          },
          controller.signal
        );
        await readSseStream(res.body!, event => applyEvent(assistantId, event));
      } catch (error) {
        if (controller.signal.aborted) {
          // Người dùng bấm Dừng — giữ phần đã nhận (BE vẫn lưu phần đó).
        } else if (error instanceof AiHttpError) {
          if (error.status === 401 && typeof window !== 'undefined') {
            const currentPath =
              window.location.pathname + window.location.search;
            window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            return;
          }
          if (
            error.status === 404 &&
            error.errorCode === 'AI_CONVERSATION_NOT_FOUND'
          ) {
            // Hội thoại đã bị xoá ở nơi khác → tách thành hội thoại mới.
            setConversationId(null);
            conversationIdRef.current = null;
            writeActiveId(boardId, null);
          }
          const code =
            error.status === 429
              ? 'RATE_LIMITED'
              : (error.errorCode ?? `HTTP_${error.status}`);
          applyEvent(assistantId, {
            type: 'error',
            code,
            message: error.message,
          });
          restoreActions();
        } else {
          applyEvent(assistantId, {
            type: 'error',
            code: 'NETWORK',
            message: error instanceof Error ? error.message : String(error),
          });
          restoreActions();
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsStreaming(false);
        updateMessage(assistantId, m => ({ ...m, streaming: false }));
      }
    },
    [applyEvent, boardId, options?.context, updateMessage]
  );

  const pushTurn = useCallback((content: string, base: AiChatMessage[]) => {
    const userMessage: AiChatMessage = {
      id: genId(),
      role: 'user',
      content,
      blocks: [{ kind: 'text', text: content }],
      createdAt: Date.now(),
    };
    const assistantMessage: AiChatMessage = {
      id: genId(),
      role: 'assistant',
      content: '',
      blocks: [],
      createdAt: Date.now(),
      streaming: true,
    };
    setMessages([...base, userMessage, assistantMessage]);
    return assistantMessage.id;
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !boardId || isStreaming || isLoadingConversation) return;
      const assistantId = pushTurn(trimmed, messages);
      await runRequest(trimmed, assistantId, false);
    },
    [
      boardId,
      isLoadingConversation,
      isStreaming,
      messages,
      pushTurn,
      runRequest,
    ]
  );

  /** Gửi lại lượt cuối (sau lỗi): bỏ cặp user/assistant cuối rồi gửi lại. */
  const retryLast = useCallback(async () => {
    if (isStreaming || !boardId) return;
    const lastUserIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;
    const content = messages[lastUserIndex].content;
    const assistantId = pushTurn(content, messages.slice(0, lastUserIndex));
    await runRequest(content, assistantId, true);
  }, [boardId, isStreaming, messages, pushTurn, runRequest]);

  /* ─── Đề xuất (propose-then-apply) ─── */

  const setProposalState = useCallback(
    (
      messageId: string,
      proposalId: string,
      patch: Partial<AiProposalState>
    ) => {
      updateMessage(messageId, message => ({
        ...message,
        blocks: message.blocks.map(block =>
          block.kind === 'proposal' && block.state.proposal.id === proposalId
            ? { ...block, state: { ...block.state, ...patch } }
            : block
        ),
      }));
    },
    [updateMessage]
  );

  /** Lưu trạng thái đề xuất lên BE để tải lại không hiện nút Áp dụng nữa. */
  const persistProposal = useCallback(
    (proposalId: string, patch: AiProposalPatch) => {
      const id = conversationIdRef.current;
      if (!id) return;
      AiService.updateProposal(id, proposalId, patch).catch(() => {
        // Đã có toast từ interceptor; trạng thái local vẫn đúng.
      });
    },
    []
  );

  const invalidateCards = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cards'] });
    queryClient.invalidateQueries({ queryKey: ['card-detail'] });
    queryClient.invalidateQueries({ queryKey: ['boards'] });
  }, [queryClient]);

  /** Người dùng bấm "Áp dụng": FE gọi REST hiện có, LLM không ghi trực tiếp. */
  const applyProposal = useCallback(
    async (messageId: string, state: AiProposalState) => {
      if (state.status !== 'pending') return;
      const { proposal } = state;
      setProposalState(messageId, proposal.id, { status: 'applying' });

      try {
        let resultCardId: EntityId | undefined;
        let resultCardCode: string | undefined;

        if (proposal.type === 'create_card') {
          const created = (await BoardService.createNewCard(
            proposal.payload as unknown as CreateNewCardRequest
          )) as Card;
          resultCardId = created?.id;
          resultCardCode = created?.cardCode;
        } else if (proposal.type === 'update_card') {
          const payload = proposal.payload as {
            cardId: EntityId;
            changes: UpdateCardRequest;
          };
          const updated = await CardService.update(
            payload.cardId,
            payload.changes
          );
          resultCardId = updated?.id ?? payload.cardId;
          resultCardCode = updated?.cardCode ?? proposal.card?.cardCode;
        } else {
          const payload = proposal.payload as { cardId: EntityId };
          await CardService.delete(payload.cardId);
          resultCardId = payload.cardId;
          resultCardCode = proposal.card?.cardCode;
        }

        setProposalState(messageId, proposal.id, {
          status: 'applied',
          resultCardId,
          resultCardCode,
        });
        persistProposal(proposal.id, {
          status: 'applied',
          resultCardId,
          resultCardCode,
        });
        pendingActionsRef.current.push({
          proposalId: proposal.id,
          type: proposal.type,
          result: 'applied',
          cardId: resultCardId,
          cardCode: resultCardCode,
        });
        invalidateCards();
        toastHelpers.success({
          description: t(`aiAssistant.proposal.toast.${proposal.type}`, {
            code: resultCardCode ?? '',
          }),
        });
      } catch (error) {
        const message =
          typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : t('aiAssistant.error.generic');
        setProposalState(messageId, proposal.id, {
          status: 'failed',
          error: message,
        });
        persistProposal(proposal.id, { status: 'failed', error: message });
        pendingActionsRef.current.push({
          proposalId: proposal.id,
          type: proposal.type,
          result: 'failed',
          error: message,
        });
      }
    },
    [invalidateCards, persistProposal, setProposalState, t]
  );

  const cancelProposal = useCallback(
    (messageId: string, state: AiProposalState) => {
      if (state.status !== 'pending' && state.status !== 'failed') return;
      setProposalState(messageId, state.proposal.id, { status: 'cancelled' });
      persistProposal(state.proposal.id, { status: 'cancelled' });
      pendingActionsRef.current.push({
        proposalId: state.proposal.id,
        type: state.proposal.type,
        result: 'cancelled',
      });
    },
    [persistProposal, setProposalState]
  );

  const retryProposal = useCallback(
    (messageId: string, state: AiProposalState) => {
      if (state.status !== 'failed') return;
      setProposalState(messageId, state.proposal.id, {
        status: 'pending',
        error: undefined,
      });
      persistProposal(state.proposal.id, { status: 'pending' });
    },
    [persistProposal, setProposalState]
  );

  const hasMessages = messages.length > 0;
  const lastError = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return null;
    const errorBlock = last.blocks.find(b => b.kind === 'error');
    return errorBlock && errorBlock.kind === 'error' ? errorBlock : null;
  }, [messages]);

  return {
    conversationId,
    messages,
    hasMessages,
    isStreaming,
    isLoadingConversation,
    lastError,
    sendMessage,
    retryLast,
    stop,
    reset,
    selectConversation,
    applyProposal,
    cancelProposal,
    retryProposal,
  };
};
