'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { resetUser, selectCurrentUser } from '@/redux/user/userSlice';
import { refreshAccessToken } from '@/utils/authorizeAxios';
import {
  getNotificationSocket,
  SOCKET_AUTH_ERRORS,
  SOCKET_EVENTS,
} from '@/lib/socket';
import {
  adjustUnreadCount,
  filterFromListKey,
  listAccepts,
  notificationQueryKeys,
  prependNotification,
  setUnreadCountFromServer,
  snapshotNotificationLists,
} from '@/hooks/use-notification';
import { NotificationSessionReason } from '@/config/enum';
import type {
  Notification,
  NotificationSessionEvent,
  UnreadCountResponse,
} from '@/config/interface';

/** Chặn loop refresh→connect→TOKEN_EXPIRED (vd lệch giờ server); reset về 0 khi connect thành công. */
const MAX_AUTH_REFRESH_ATTEMPTS = 2;
/** SERVER_ERROR / TOO_MANY_CONNECTIONS: thử lại đúng 1 lần sau khoảng này (README 4.6). */
const RETRY_AFTER_SERVER_ERROR_MS = 7000;

export const useNotificationSocket = () => {
  const queryClient = useQueryClient(); // instance module-level của client-provider → ổn định
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const userId = currentUser?.id;

  // ref để handler bên trong effect đọc user mới nhất mà không phải re-subscribe mỗi khi Redux đổi
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Token handshake: lib/socket đọc thẳng lib/auth-token mỗi lần connect, không
  // cần đẩy từ Redux (Redux không còn giữ token).

  // đổi user (A → null → B, hoặc A → B) → bỏ cache của user cũ
  const lastUserIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      lastUserIdRef.current !== undefined &&
      lastUserIdRef.current !== userId
    ) {
      queryClient.removeQueries({ queryKey: notificationQueryKeys.all });
    }
    lastUserIdRef.current = userId;
  }, [userId, queryClient]);

  useEffect(() => {
    if (!userId) return; // chưa đăng nhập → không tạo/connect socket
    const socket = getNotificationSocket();
    if (!socket) return; // SSR guard

    let authRefreshAttempts = 0;
    let hasConnectedBefore = false;
    let serverErrorRetried = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshThenReconnect = async () => {
      if (authRefreshAttempts >= MAX_AUTH_REFRESH_ATTEMPTS) {
        socket.disconnect();
        return;
      }
      authRefreshAttempts += 1;
      try {
        // dedupe với interceptor 410 của axios; token mới đã nằm trong lib/auth-token
        await refreshAccessToken();
        socket.connect();
      } catch {
        // refreshAccessToken đã toast + chuyển /login; không reconnect
      }
    };

    const handleConnect = () => {
      authRefreshAttempts = 0;
      serverErrorRetried = false;
      if (hasConnectedBefore && !socket.recovered) {
        // reconnect (mất mạng, server restart, sau refresh token): có thể đã lỡ event → REST là nguồn sự thật
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      }
      hasConnectedBefore = true;
    };

    const handleConnectError = (error: Error) => {
      switch (error.message) {
        case SOCKET_AUTH_ERRORS.TOKEN_EXPIRED:
          void refreshThenReconnect();
          break;
        case SOCKET_AUTH_ERRORS.UNAUTHORIZED:
        case SOCKET_AUTH_ERRORS.USER_INACTIVE:
          socket.disconnect(); // dừng hẳn, không retry (tránh storm)
          break;
        case SOCKET_AUTH_ERRORS.TOO_MANY_CONNECTIONS:
        case SOCKET_AUTH_ERRORS.SERVER_ERROR:
          // middleware từ chối → socket.active === false, không tự retry; thử lại đúng 1 lần
          if (!serverErrorRetried) {
            serverErrorRetried = true;
            retryTimer = setTimeout(
              () => socket.connect(),
              RETRY_AFTER_SERVER_ERROR_MS
            );
          }
          break;
        default:
          // lỗi transport: socket.active === true, Manager tự reconnect với backoff
          break;
      }
    };

    const handleNew = (notification: Notification) => {
      snapshotNotificationLists(queryClient).forEach(([key, data]) => {
        if (!data || !listAccepts(filterFromListKey(key), notification)) return;
        queryClient.setQueryData(key, prependNotification(data, notification));
      });
      if (notification.readAt === null) adjustUnreadCount(queryClient, 1);
      // list đang refetch (bắt đầu trước khi BE ghi DB) có thể trả về thiếu item vừa chèn → refetch lại
      if (
        queryClient.isFetching({ queryKey: notificationQueryKeys.lists() }) > 0
      ) {
        queryClient.invalidateQueries({
          queryKey: notificationQueryKeys.lists(),
        });
      }
    };

    const handleUnreadCount = ({ unreadCount }: UnreadCountResponse) => {
      // giá trị server ghi đè mọi optimistic/+1 trước đó
      setUnreadCountFromServer(queryClient, unreadCount);
    };

    const handleSession = ({ reason }: NotificationSessionEvent) => {
      // server sẽ disconnect(true) ngay sau event; chủ động ngắt trước để connect() sau đó không bị no-op
      socket.disconnect();
      if (reason === NotificationSessionReason.TOKEN_EXPIRED) {
        void refreshThenReconnect();
        return;
      }
      if (reason === NotificationSessionReason.LOGGED_OUT) {
        // logout từ tab khác: cookie đã bị xóa → dọn cache, AuthGuard đưa về /login
        queryClient.removeQueries({ queryKey: notificationQueryKeys.all });
        dispatch(resetUser());
      }
      // PASSWORD_CHANGED: không reconnect (README 4.6); tab đổi mật khẩu sẽ nối lại khi reload
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on(SOCKET_EVENTS.NEW, handleNew);
    socket.on(SOCKET_EVENTS.UNREAD_COUNT, handleUnreadCount);
    socket.on(SOCKET_EVENTS.SESSION, handleSession);
    socket.connect();

    return () => {
      clearTimeout(retryTimer);
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off(SOCKET_EVENTS.NEW, handleNew);
      socket.off(SOCKET_EVENTS.UNREAD_COUNT, handleUnreadCount);
      socket.off(SOCKET_EVENTS.SESSION, handleSession);
      socket.disconnect();
    };
  }, [userId, queryClient, dispatch]);
};
