'use client';

import { useNotificationSocket } from '@/hooks/use-notification-socket';
import { useNotificationToast } from '@/hooks/use-notification-toast';

/** Component rỗng: chỉ để gọi hook dưới QueryClientProvider + Redux Provider (README 4.8). */
export function NotificationSocketBridge() {
  useNotificationSocket();
  // 07: toast sau khi 06 đã cập nhật cache (cùng component, thứ tự handler)
  useNotificationToast();
  return null;
}
