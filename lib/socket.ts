import { io, type Socket } from 'socket.io-client';
import config from '@/config';
import { API_ROOT } from '@/utils/constants';
import type {
  Notification,
  NotificationSessionEvent,
  UnreadCountResponse,
} from '@/config/interface';

/** Khớp SOCKET_NAMESPACE / SOCKET_EVENTS / SOCKET_AUTH_ERRORS của BE (README 4.6). */
export const NOTIFICATION_SOCKET_NAMESPACE = '/notifications';
export const DEFAULT_SOCKET_PATH = '/socket.io';

export const NOTIFICATION_SOCKET_EVENTS = {
  NEW: 'notification.new',
  UNREAD_COUNT: 'notification.unread-count',
  SESSION: 'notification.session',
} as const;
/** Alias ngắn; cùng object với NOTIFICATION_SOCKET_EVENTS. */
export const SOCKET_EVENTS = NOTIFICATION_SOCKET_EVENTS;

export const SOCKET_AUTH_ERRORS = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_INACTIVE: 'USER_INACTIVE',
  TOO_MANY_CONNECTIONS: 'TOO_MANY_CONNECTIONS',
  /** Lỗi hạ tầng lúc handshake (DB down, thiếu secret) → thử lại sau, khác UNAUTHORIZED (D39). */
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export interface NotificationServerToClientEvents {
  [NOTIFICATION_SOCKET_EVENTS.NEW]: (notification: Notification) => void;
  [NOTIFICATION_SOCKET_EVENTS.UNREAD_COUNT]: (
    payload: UnreadCountResponse
  ) => void;
  [NOTIFICATION_SOCKET_EVENTS.SESSION]: (
    payload: NotificationSessionEvent
  ) => void;
}

/** README D18: không có event client → server. */
export type NotificationClientToServerEvents = Record<never, never>;

export type NotificationSocket = Socket<
  NotificationServerToClientEvents,
  NotificationClientToServerEvents
>;

let socket: NotificationSocket | null = null;
/** Token fallback cho handshake khi cookie không đi kèm (prod khác domain, README 4.6). */
let authToken: string | null = null;

export const setNotificationSocketToken = (token: string | null) => {
  authToken = token;
};

/**
 * Origin của API: API_ROOT chứa '/api' nên phải bỏ path; khi API_ROOT là đường
 * dẫn tương đối (deploy qua rewrite) thì lấy origin của trang.
 */
const resolveApiOrigin = (): string => {
  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(API_ROOT, base).origin;
};

/** README D16: dev → http://localhost:8017; production nên đặt NEXT_PUBLIC_SOCKET_URL. */
export const getNotificationSocketUrl = (): string => {
  const origin = config.socketUrl || resolveApiOrigin();
  return `${origin}${NOTIFICATION_SOCKET_NAMESPACE}`;
};

/**
 * Singleton: trả cùng instance trong suốt vòng đời trang (không tái tạo khi
 * logout/login; handler do hook on/off). Trả null khi SSR. Không tự connect
 * (autoConnect: false); hook quyết định thời điểm.
 */
export const getNotificationSocket = (): NotificationSocket | null => {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  socket = io(getNotificationSocketUrl(), {
    path: config.socketPath || DEFAULT_SOCKET_PATH,
    withCredentials: true, // cookie accessToken đi kèm handshake
    autoConnect: false,
    transports: ['websocket', 'polling'],
    // tránh storm khi BE down lâu
    reconnectionAttempts: 20,
    // hàm được gọi lại mỗi lần connect → luôn lấy token mới nhất
    auth: cb => cb(authToken ? { token: authToken } : {}),
  });

  return socket;
};

export const disconnectNotificationSocket = () => {
  socket?.disconnect();
};
