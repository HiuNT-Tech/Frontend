'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { NotificationService } from '@/lib/apis/notification';
import { notificationQueryKeys } from '@/hooks/use-notification';
import { toastHelpers } from '@/hooks/use-toast';
import type { NotificationChannel, NotificationType } from '@/config/enum';
import type {
  NotificationPreferenceItem,
  NotificationPreferencesResponse,
  UpdatePreferencesRequest,
} from '@/config/interface';

export const PREFERENCE_SAVE_DEBOUNCE_MS = 400;
const PREFERENCES_KEY = notificationQueryKeys.preferences();

export const preferenceKey = (
  type: NotificationType,
  channel: NotificationChannel
): string => `${type}:${channel}`;

const toStateMap = (
  items: NotificationPreferenceItem[]
): Map<string, boolean> =>
  new Map(items.map(i => [preferenceKey(i.type, i.channel), i.enabled]));

/** Pure: ghi enabled của `items` lên response; KHÔNG thêm cặp chưa có (BE quyết cặp hợp lệ). */
export const applyPreferenceItems = (
  current: NotificationPreferencesResponse | undefined,
  items: NotificationPreferenceItem[]
): NotificationPreferencesResponse | undefined => {
  if (!current || items.length === 0) return current;
  const patch = toStateMap(items);
  return {
    ...current,
    items: current.items.map(i => {
      const next = patch.get(preferenceKey(i.type, i.channel));
      return next === undefined || next === i.enabled
        ? i
        : { ...i, enabled: next };
    }),
  };
};

/**
 * Cache TanStack = trạng thái hiển thị (optimistic); serverStateRef = trạng thái server đã xác nhận.
 * Mọi lần bấm → pendingRef + timer 400 ms → gộp các ô khác server thành MỘT PUT, gửi tuần tự;
 * lỗi → rollback từng ô của batch (trừ ô đã bấm lại), hiện saveError inline (không toast trùng interceptor).
 */
export const useNotificationPreferences = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const serverStateRef = useRef<Map<string, boolean>>(new Map());
  const pendingRef = useRef<Map<string, NotificationPreferenceItem>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const flushRef = useRef<() => void>(() => {});
  const [saveError, setSaveError] = useState(false);

  const {
    data: preferencesData,
    isLoading: isPreferencesLoading,
    error: preferencesError,
    refetch: refetchPreferences,
  } = useQuery<NotificationPreferencesResponse>({
    queryKey: PREFERENCES_KEY,
    queryFn: async () => {
      const res = await NotificationService.getPreferences();
      serverStateRef.current = toStateMap(res.items); // chỉ ghi từ server
      return res;
    },
    staleTime: 30 * 1000,
  });

  const { mutate, isPending: isSavingPreferences } = useMutation({
    mutationKey: PREFERENCES_KEY,
    mutationFn: (payload: UpdatePreferencesRequest) =>
      NotificationService.updatePreferences(payload),
    onSuccess: data => {
      serverStateRef.current = toStateMap(data.items);
      setSaveError(false);
      // Ghi response nhưng giữ các ô còn chờ gửi ở giá trị optimistic
      queryClient.setQueryData<NotificationPreferencesResponse>(
        PREFERENCES_KEY,
        applyPreferenceItems(data, [...pendingRef.current.values()])
      );
      toastHelpers.success({
        description: t('settings.notifications.toast.saved'),
      });
    },
    onError: (_error, variables) => {
      setSaveError(true);
      const rollback = variables.items
        .filter(i => !pendingRef.current.has(preferenceKey(i.type, i.channel)))
        .map(i => ({
          ...i,
          enabled:
            serverStateRef.current.get(preferenceKey(i.type, i.channel)) ??
            !i.enabled,
        }));
      queryClient.setQueryData<NotificationPreferencesResponse>(
        PREFERENCES_KEY,
        current => applyPreferenceItems(current, rollback)
      );
      // Không toast: authorizeAxios đã toast message lỗi
    },
    onSettled: () => {
      inFlightRef.current = false;
      if (pendingRef.current.size > 0) flushRef.current();
    },
  });

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inFlightRef.current) return; // tuần tự; onSettled sẽ gọi lại
    const items = [...pendingRef.current.values()].filter(
      i =>
        serverStateRef.current.get(preferenceKey(i.type, i.channel)) !==
        i.enabled
    );
    pendingRef.current.clear();
    if (items.length === 0) return; // bấm đi bấm lại về trạng thái cũ → không gửi, không toast
    inFlightRef.current = true;
    mutate({ items });
  }, [mutate]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const togglePreference = useCallback(
    (
      type: NotificationType,
      channel: NotificationChannel,
      enabled: boolean
    ) => {
      const item: NotificationPreferenceItem = { type, channel, enabled };
      queryClient.setQueryData<NotificationPreferencesResponse>(
        PREFERENCES_KEY,
        current => applyPreferenceItems(current, [item])
      );
      pendingRef.current.set(preferenceKey(type, channel), item);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, PREFERENCE_SAVE_DEBOUNCE_MS);
    },
    [flush, queryClient]
  );

  // Rời tab trước khi hết debounce → gửi ngay (mutation vẫn chạy trong MutationCache sau unmount).
  useEffect(
    () => () => {
      if (timerRef.current) flushRef.current();
    },
    []
  );

  return {
    preferencesData,
    isPreferencesLoading,
    preferencesError,
    refetchPreferences,
    togglePreference,
    isSavingPreferences,
    saveError,
  };
};
