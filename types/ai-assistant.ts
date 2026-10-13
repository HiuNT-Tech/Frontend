import type { EntityId } from '@/config/interface';

/* ─── Mirror của BE `ai-stream-event.ts` ─── */

export interface AiCardSummary {
  id: EntityId;
  cardCode: string;
  title: string;
  priority: number | null;
  column: { id: EntityId; title: string; statusColor: string };
  assignee: { id: EntityId; displayName: string; avatar: string | null } | null;
  issueType: { id: EntityId; name: string } | null;
  version: { id: EntityId; name: string } | null;
  startDate: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  isDone: boolean;
}

export type AiProposalType = 'create_card' | 'update_card' | 'delete_card';

export interface AiProposalField {
  key: string;
  label: string;
  before?: string | null;
  after?: string | null;
}

export interface AiProposal {
  id: string;
  type: AiProposalType;
  payload: Record<string, unknown>;
  card?: AiCardSummary;
  fields: AiProposalField[];
  reason?: string;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  iterations: number;
}

export type AiUiLanguage = 'vi' | 'en';

/** Hành động phía client do AI yêu cầu (không lưu vào lịch sử). */
export type AiUiAction = { action: 'set_language'; language: AiUiLanguage };

export type AiStreamEvent =
  | { type: 'conversation'; id: EntityId; title: string; isNew: boolean }
  | ({ type: 'ui_action' } & AiUiAction)
  | { type: 'token'; text: string }
  | { type: 'tool_start'; id: string; name: string; label: string }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      ok: boolean;
      summary: string;
    }
  | { type: 'cards'; items: AiCardSummary[]; total: number }
  | { type: 'proposal'; proposal: AiProposal }
  | { type: 'done'; usage: AiUsage }
  | { type: 'error'; code: string; message: string };

/* ─── Request / REST ─── */

export interface AiChatContext {
  page?: string;
  cardId?: EntityId;
}

export interface AiAppliedAction {
  proposalId: string;
  type: AiProposalType;
  result: 'applied' | 'cancelled' | 'failed';
  cardId?: EntityId;
  cardCode?: string;
  error?: string;
}

export interface AiChatRequest {
  boardId: EntityId;
  /** Bỏ trống → BE tạo hội thoại mới và trả event `conversation`. */
  conversationId?: EntityId;
  content: string;
  /** Gửi lại lượt cuối sau lỗi (BE bỏ lượt trước rồi chèn lại). */
  retry?: boolean;
  context?: AiChatContext;
  appliedActions?: AiAppliedAction[];
}

export interface AiConversationSummary {
  id: EntityId;
  boardId: EntityId;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiStoredMessage {
  id: EntityId;
  role: 'USER' | 'ASSISTANT';
  content: string;
  blocks: AiMessageBlock[] | null;
  createdAt: string;
}

export interface AiConversationDetail extends AiConversationSummary {
  messages: AiStoredMessage[];
}

export interface AiConversationListResponse {
  items: AiConversationSummary[];
  total: number;
}

export interface AiProposalPatch {
  status: 'pending' | 'applied' | 'cancelled' | 'failed';
  resultCardId?: EntityId;
  resultCardCode?: string;
  error?: string;
}

/* ─── UI model (cũng là shape lưu trong `ai_messages.blocks`) ─── */

export type AiProposalStatus =
  | 'pending'
  | 'applying'
  | 'applied'
  | 'cancelled'
  | 'failed';

export interface AiProposalState {
  proposal: AiProposal;
  status: AiProposalStatus;
  resultCardId?: EntityId;
  resultCardCode?: string;
  error?: string;
}

export type AiMessageBlock =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool';
      id: string;
      name: string;
      label: string;
      status: 'running' | 'ok' | 'error';
      summary?: string;
    }
  | { kind: 'cards'; items: AiCardSummary[]; total: number }
  | { kind: 'proposal'; state: AiProposalState }
  | { kind: 'error'; code: string; message: string };

export interface AiChatMessage {
  id: string;
  /** Id trong DB (có khi message đã được lưu/tải lại). */
  dbId?: EntityId;
  role: 'user' | 'assistant';
  /** Text thuần (user) hoặc text gộp từ các block (assistant). */
  content: string;
  blocks: AiMessageBlock[];
  createdAt: number;
  streaming?: boolean;
}
