import {
  sendDelete,
  sendGet,
  sendPatch,
  sendPost,
  sendPut,
} from '@/utils/authorizeAxios';
import { API_ROOT } from '@/utils/constants';
import type {
  DeleteNotificationResponse,
  EntityId,
  MarkAllReadRequest,
  MarkAllReadResponse,
  Notification,
  NotificationListParams,
  NotificationListResponse,
  NotificationPreferencesResponse,
  UnreadCountResponse,
  UpdatePreferencesRequest,
} from '@/config/interface';

const NOTIFICATIONS_URL = `${API_ROOT}/v1/me/notifications`;
const PREFERENCES_URL = `${API_ROOT}/v1/me/notification-preferences`;

export const NotificationService = {
  /** Body giữ nguyên (đi nhánh paginated của ResponseInterceptor nhờ total). */
  getList: async (
    params: NotificationListParams = {}
  ): Promise<NotificationListResponse> => {
    return await sendGet(NOTIFICATIONS_URL, params);
  },

  /** BE trả { item: { unreadCount } } → sendGet bóc item → { unreadCount }. */
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    return await sendGet(`${NOTIFICATIONS_URL}/unread-count`);
  },

  /** Idempotent; { item: NotificationDto } → Notification. 404 nếu không thuộc user / đã xóa. */
  markRead: async (id: EntityId): Promise<Notification> => {
    return await sendPatch(`${NOTIFICATIONS_URL}/${id}/read`);
  },

  /** { item: { updated, unreadCount } } → MarkAllReadResponse. Body {} khi không truyền boardId. */
  markAllRead: async (
    payload: MarkAllReadRequest = {}
  ): Promise<MarkAllReadResponse> => {
    return await sendPost(`${NOTIFICATIONS_URL}/read-all`, payload);
  },

  /** Soft delete; { item: { deleted, unreadCount } } → DeleteNotificationResponse. */
  remove: async (id: EntityId): Promise<DeleteNotificationResponse> => {
    return await sendDelete(`${NOTIFICATIONS_URL}/${id}`);
  },

  /** { items, total } → giữ nguyên (ResponseInterceptor nhánh paginated). */
  getPreferences: async (): Promise<NotificationPreferencesResponse> => {
    return await sendGet(PREFERENCES_URL);
  },

  /** Body đúng UpdatePreferencesRequest (BE forbidNonWhitelisted). Trả về như GET. */
  updatePreferences: async (
    payload: UpdatePreferencesRequest
  ): Promise<NotificationPreferencesResponse> => {
    return await sendPut(PREFERENCES_URL, payload);
  },
};
