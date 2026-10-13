'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import type { Notification } from '@/config/interface';
import { toastHelpers } from '@/hooks/use-toast';
import {
  getNotificationSocket,
  NOTIFICATION_SOCKET_EVENTS,
} from '@/lib/socket';
import { getNotificationText } from '@/components/shared/notifications/notification-text';
import { isViewingCard } from '@/components/shared/notifications/notification-link';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';

/** Nhiều thông báo trong cửa sổ này → 1 toast gộp "Bạn có N thông báo mới". */
export const TOAST_GROUP_WINDOW_MS = 3000;

type ToastGroup = {
  id: string;
  count: number;
  update: (props: { id: string; title?: string; description?: string }) => void;
  timer: ReturnType<typeof setTimeout>;
};

/** Toast info khi nhận notification.new (06 đã cập nhật cache); gộp 3 giây; bỏ qua khi đang mở đúng card. */
export const useNotificationToast = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const currentUser = useAppSelector(selectCurrentUser);
  const userId = currentUser?.id;
  const pathnameRef = useRef(pathname);
  const groupRef = useRef<ToastGroup | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;
    const socket = getNotificationSocket();
    if (!socket) return;

    const resetGroup = () => {
      groupRef.current = null;
    };

    const handleNew = (raw: unknown) => {
      try {
        const n = raw as Notification;
        if (!n || typeof n.type !== 'string') return;
        // Đang mở đúng card → chỉ badge (06 đã tăng), không toast.
        if (isViewingCard(pathnameRef.current, n.cardId)) return;

        const group = groupRef.current;
        if (group) {
          group.count += 1;
          group.update({
            id: group.id,
            title: t('notifications.toast.newMany', { count: group.count }),
            description: undefined,
          });
          clearTimeout(group.timer);
          group.timer = setTimeout(resetGroup, TOAST_GROUP_WINDOW_MS);
          return;
        }

        const { id, update } = toastHelpers.info({
          title: t('notifications.title'),
          description: t('notifications.toast.new', {
            text: getNotificationText(n, t),
          }),
        });
        groupRef.current = {
          id,
          count: 1,
          update,
          timer: setTimeout(resetGroup, TOAST_GROUP_WINDOW_MS),
        };
      } catch {
        // payload lạ → bỏ qua, không làm crash bridge
      }
    };

    socket.on(NOTIFICATION_SOCKET_EVENTS.NEW, handleNew);
    return () => {
      socket.off(NOTIFICATION_SOCKET_EVENTS.NEW, handleNew);
      if (groupRef.current) clearTimeout(groupRef.current.timer);
      groupRef.current = null;
    };
  }, [userId, t]);
};
