import { sendDelete, sendGet, sendPutFormData } from '@/utils/authorizeAxios';
import { API_ROOT } from '@/utils/constants';
import type {
  Card,
  CardListParams,
  CardListResponse,
  EntityId,
  UpdateCardRequest,
} from '@/config/interface';

export const CardService = {
  getList: async (
    boardId: EntityId,
    params?: CardListParams
  ): Promise<CardListResponse> => {
    return await sendGet(`${API_ROOT}/v1/boards/${boardId}/cards`, params);
  },

  getDetail: async (cardId: EntityId): Promise<Card> => {
    return await sendGet(`${API_ROOT}/v1/cards/${cardId}`);
  },

  update: async (cardId: EntityId, data: UpdateCardRequest): Promise<Card> => {
    // Multipart để hỗ trợ thêm/gỡ file đính kèm khi sửa ticket
    const { attachments, removeAttachmentIds, ...fields } = data;
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    (attachments ?? []).forEach(file => {
      formData.append('attachments', file, file.name);
    });
    (removeAttachmentIds ?? []).forEach(id => {
      formData.append('removeAttachmentIds', String(id));
    });
    return await sendPutFormData(`${API_ROOT}/v1/cards/${cardId}`, formData);
  },

  delete: async (cardId: EntityId): Promise<{ id: EntityId }> => {
    return await sendDelete(`${API_ROOT}/v1/cards/${cardId}`);
  },
};
