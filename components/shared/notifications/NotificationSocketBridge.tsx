'use client';

import { useNotificationSocket } from '@/hooks/use-notification-socket';

/** Component rỗng: chỉ để gọi hook dưới QueryClientProvider + Redux Provider (README 4.8). */
export function NotificationSocketBridge() {
  useNotificationSocket();
  return null;
}
