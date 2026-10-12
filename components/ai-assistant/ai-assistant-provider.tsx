'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, usePathname } from 'next/navigation';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import type { EntityId } from '@/config/interface';
import type { AiChatContext } from '@/types/ai-assistant';
import { AiDrawer } from './ai-drawer';

export interface OpenAiAssistantOptions {
  /** Câu hỏi đưa vào composer. `autoSend` = gửi luôn thay vì chỉ điền sẵn. */
  prompt?: string;
  autoSend?: boolean;
  /** Ghi đè ngữ cảnh suy ra từ URL (hiếm khi cần). */
  context?: AiChatContext;
}

export interface PendingPrompt {
  text: string;
  autoSend: boolean;
}

interface AiAssistantContextValue {
  boardId?: EntityId;
  isOpen: boolean;
  open: (options?: OpenAiAssistantOptions) => void;
  close: () => void;
  toggle: () => void;
  pendingPrompt: PendingPrompt | null;
  consumePendingPrompt: () => void;
  /** Ngữ cảnh trang hiện tại (card đang xem, board, issues…). */
  context: AiChatContext | undefined;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

const ASSISTANT_PAGE_PATTERN = /^\/project\/[^/]+\/assistant(\/|$)/;
const CARD_PAGE_PATTERN = /^\/project\/[^/]+\/issues\/(\d+)(\/|$)/;

/** Suy ngữ cảnh từ URL để system prompt biết người dùng đang nhìn gì. */
const contextFromPath = (pathname: string): AiChatContext | undefined => {
  const cardMatch = CARD_PAGE_PATTERN.exec(pathname);
  if (cardMatch) {
    return { page: 'card', cardId: Number(cardMatch[1]) };
  }
  if (/\/board(\/|$)/.test(pathname)) return { page: 'board' };
  if (/\/issues(\/|$)/.test(pathname)) return { page: 'issues' };
  if (/\/add-issue(\/|$)/.test(pathname)) return { page: 'add-issue' };
  if (/\/settings(\/|$)/.test(pathname)) return { page: 'settings' };
  return undefined;
};

/**
 * Giữ trạng thái drawer AI cho toàn bộ khu vực project. Drawer ẩn khi không
 * ở trong `/project/:id/*` hoặc đang ở trang full `/assistant`.
 */
export function AiAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ projectId?: string }>();
  const pathname = usePathname() ?? '';
  const [isOpen, setIsOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<PendingPrompt | null>(
    null
  );
  const [contextOverride, setContextOverride] = useState<
    AiChatContext | undefined
  >(undefined);

  const boardId = useMemo(() => {
    try {
      return toEntityIdOrUndefined(params?.projectId);
    } catch {
      return undefined;
    }
  }, [params?.projectId]);

  const isAssistantPage = ASSISTANT_PAGE_PATTERN.test(pathname);
  const derivedContext = useMemo(() => contextFromPath(pathname), [pathname]);

  // Đổi trang → bỏ ngữ cảnh ghi đè (ngữ cảnh mặc định luôn theo URL).
  useEffect(() => {
    setContextOverride(undefined);
  }, [pathname]);

  const open = useCallback((options?: OpenAiAssistantOptions) => {
    if (options?.prompt !== undefined) {
      setPendingPrompt({
        text: options.prompt,
        autoSend: options.autoSend ?? false,
      });
    }
    if (options?.context !== undefined) setContextOverride(options.context);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const consumePendingPrompt = useCallback(() => setPendingPrompt(null), []);

  // Ctrl/⌘ + J: bật/tắt drawer khi đang trong project.
  useEffect(() => {
    if (!boardId || isAssistantPage) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [boardId, isAssistantPage, toggle]);

  const value = useMemo<AiAssistantContextValue>(
    () => ({
      boardId,
      isOpen: isOpen && !!boardId && !isAssistantPage,
      open,
      close,
      toggle,
      pendingPrompt,
      consumePendingPrompt,
      context: contextOverride ?? derivedContext,
    }),
    [
      boardId,
      isOpen,
      isAssistantPage,
      open,
      close,
      toggle,
      pendingPrompt,
      consumePendingPrompt,
      contextOverride,
      derivedContext,
    ]
  );

  return (
    <AiAssistantContext.Provider value={value}>
      {children}
      {value.isOpen && boardId && <AiDrawer boardId={boardId} />}
    </AiAssistantContext.Provider>
  );
}

export const useAiAssistant = (): AiAssistantContextValue => {
  const ctx = useContext(AiAssistantContext);
  if (!ctx) {
    throw new Error('useAiAssistant must be used within AiAssistantProvider');
  }
  return ctx;
};

/** Dùng ở nơi provider có thể chưa mount (vd trang auth). */
export const useOptionalAiAssistant = () => useContext(AiAssistantContext);
