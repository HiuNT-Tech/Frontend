import {
  refreshAccessToken,
  sendDelete,
  sendGet,
  sendPatch,
} from '@/utils/authorizeAxios';
import { authorizationHeader } from '@/lib/auth-token';
import { API_ROOT } from '@/utils/constants';
import type { EntityId } from '@/config/interface';
import type {
  AiChatRequest,
  AiConversationDetail,
  AiConversationListResponse,
  AiProposalPatch,
  AiProposalState,
} from '@/types/ai-assistant';

export class AiHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = 'AiHttpError';
  }
}

const readErrorBody = async (
  res: Response
): Promise<{ message?: string; errorCode?: string }> => {
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      errorCode?: string;
    };
    return {
      message: Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message,
      errorCode: body.errorCode,
    };
  } catch {
    return {};
  }
};

const postChat = (request: AiChatRequest, signal?: AbortSignal) =>
  fetch(`${API_ROOT}/v1/ai/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...authorizationHeader(), // BE chỉ nhận Bearer; token lấy từ bộ nhớ
    },
    body: JSON.stringify(request),
    signal,
  });

export const AiService = {
  /**
   * Mở stream SSE. Không dùng axios helper (không stream được). Tự xử lý 410
   * (hết hạn access token → refresh rồi gọi lại 1 lần) giống interceptor axios.
   */
  streamChat: async (
    request: AiChatRequest,
    signal?: AbortSignal
  ): Promise<Response> => {
    let res = await postChat(request, signal);

    if (res.status === 410) {
      // Dùng chung promise refresh với interceptor axios (dedupe + lưu token mới).
      await refreshAccessToken();
      res = await postChat(request, signal);
    }

    if (!res.ok || !res.body) {
      const { message, errorCode } = await readErrorBody(res);
      throw new AiHttpError(
        res.status,
        message ?? `Request failed (${res.status})`,
        errorCode
      );
    }

    return res;
  },

  listConversations: async (
    boardId: EntityId
  ): Promise<AiConversationListResponse> => {
    return await sendGet(`${API_ROOT}/v1/ai/conversations`, { boardId });
  },

  getConversation: async (id: EntityId): Promise<AiConversationDetail> => {
    return await sendGet(`${API_ROOT}/v1/ai/conversations/${id}`);
  },

  deleteConversation: async (id: EntityId): Promise<{ id: EntityId }> => {
    return await sendDelete(`${API_ROOT}/v1/ai/conversations/${id}`);
  },

  /** Lưu trạng thái đề xuất (đã áp dụng/huỷ) để tải lại không hiện nút Áp dụng. */
  updateProposal: async (
    conversationId: EntityId,
    proposalId: string,
    patch: AiProposalPatch
  ): Promise<AiProposalState> => {
    return await sendPatch(
      `${API_ROOT}/v1/ai/conversations/${conversationId}/proposals/${encodeURIComponent(proposalId)}`,
      patch
    );
  },
};
