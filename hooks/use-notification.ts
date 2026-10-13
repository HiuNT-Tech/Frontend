'use client';

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import config from '@/config';
import { NotificationService } from '@/lib/apis/notification';
import { useAppSelector } from '@/redux/hooks';
import { selectIsAuthenticated } from '@/redux/user/userSlice';
import type {
  EntityId,
  MarkAllReadRequest,
  Notification,
  NotificationListFilter,
  NotificationListResponse,
  UnreadCountResponse,
} from '@/config/interface';

export const NOTIFICATION_PAGE_SIZE = 20;

/** Bỏ key undefined để 2 filter tương đương hash cùng một key. */
const normalizeFilter = (
  filter: NotificationListFilter
): NotificationListFilter => ({
  unreadOnly: filter.unreadOnly ?? false,
  ...(filter.boardId !== undefined ? { boardId: filter.boardId } : {}),
});

// README 4.8 (lists() để invalidate / đọc mọi list)
export const notificationQueryKeys = {
  all: ['notifications'] as const,
  lists: () => ['notifications', 'list'] as const,
  list: (filter: NotificationListFilter) =>
    ['notifications', 'list', normalizeFilter(filter)] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
  preferences: () => ['notifications', 'preferences'] as const, // phần 09 dùng
};

export type NotificationInfiniteData = InfiniteData<
  NotificationListResponse,
  string | null
>;

// ─── Cache helpers (pure; use-notification-socket.ts dùng lại) ───

/** Lấy filter từ query key ['notifications','list',filter]. */
export const filterFromListKey = (key: QueryKey): NotificationListFilter =>
  (key[2] as NotificationListFilter | undefined) ?? {};

/** Một notification có thuộc list với filter này không (để chèn từ socket đúng chỗ). */
export const listAccepts = (
  filter: NotificationListFilter,
  notification: Notification
): boolean =>
  (filter.boardId === undefined || filter.boardId === notification.boardId) &&
  (!filter.unreadOnly || notification.readAt === null);

/** Chèn lên đầu page 0; dedupe theo id trên mọi page; trả undefined nếu cache chưa có (setQueryData sẽ no-op). */
export const prependNotification = (
  data: NotificationInfiniteData | undefined,
  notification: Notification
): NotificationInfiniteData | undefined => {
  if (!data || data.pages.length === 0) return data;
  const exists = data.pages.some(page =>
    page.items.some(item => item.id === notification.id)
  );
  if (exists) return data;
  const [first, ...rest] = data.pages;
  return {
    ...data,
    pages: [
      {
        ...first,
        items: [notification, ...first.items],
        total: first.total + 1,
      },
      ...rest,
    ],
  };
};

export const patchNotificationInPages = (
  data: NotificationInfiniteData,
  predicate: (item: Notification) => boolean,
  patch: Partial<Notification>
): NotificationInfiniteData => ({
  ...data,
  pages: data.pages.map(page => ({
    ...page,
    items: page.items.map(item =>
      predicate(item) ? { ...item, ...patch } : item
    ),
  })),
});

export const removeNotificationFromPages = (
  data: NotificationInfiniteData,
  id: EntityId
): NotificationInfiniteData => ({
  ...data,
  pages: data.pages.map(page => {
    const items = page.items.filter(item => item.id !== id);
    const removed = page.items.length - items.length;
    return { ...page, items, total: Math.max(0, page.total - removed) };
  }),
});

export type NotificationListSnapshot = ReadonlyArray<
  [QueryKey, NotificationInfiniteData | undefined]
>;

export const snapshotNotificationLists = (
  queryClient: QueryClient
): NotificationListSnapshot =>
  queryClient.getQueriesData<NotificationInfiniteData>({
    queryKey: notificationQueryKeys.lists(),
  });

export const restoreNotificationLists = (
  queryClient: QueryClient,
  snapshot: NotificationListSnapshot
) => {
  snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
};

export const findNotificationInSnapshot = (
  snapshot: NotificationListSnapshot,
  id: EntityId
): Notification | undefined => {
  for (const [, data] of snapshot) {
    const found = data?.pages
      .flatMap(page => page.items)
      .find(item => item.id === id);
    if (found) return found;
  }
  return undefined;
};

/** Cập nhật unread count tương đối, clamp >= 0; no-op nếu cache chưa có (không tự tạo giá trị sai). */
export const adjustUnreadCount = (queryClient: QueryClient, delta: number) => {
  queryClient.setQueryData<UnreadCountResponse>(
    notificationQueryKeys.unreadCount(),
    prev =>
      prev === undefined
        ? undefined
        : { unreadCount: Math.max(0, prev.unreadCount + delta) }
  );
};

/** Ghi giá trị tuyệt đối từ server (socket unread-count, response read-all/delete). */
export const setUnreadCountFromServer = (
  queryClient: QueryClient,
  unreadCount: number
) => {
  queryClient.setQueryData<UnreadCountResponse>(
    notificationQueryKeys.unreadCount(),
    { unreadCount: Math.max(0, unreadCount) }
  );
};

/** Lấy readAt từ server rồi ghi lên mọi list (sau markRead thành công). */
const applyServerReadAt = (
  queryClient: QueryClient,
  notification: Notification
) => {
  snapshotNotificationLists(queryClient).forEach(([key, data]) => {
    if (!data) return;
    queryClient.setQueryData(
      key,
      patchNotificationInPages(data, item => item.id === notification.id, {
        readAt: notification.readAt,
      })
    );
  });
};

type MutationContext = {
  lists: NotificationListSnapshot;
  unread: UnreadCountResponse | undefined;
};

const cancelAndSnapshot = async (
  queryClient: QueryClient
): Promise<MutationContext> => {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: notificationQueryKeys.lists() }),
    queryClient.cancelQueries({
      queryKey: notificationQueryKeys.unreadCount(),
    }),
  ]);
  return {
    lists: snapshotNotificationLists(queryClient),
    unread: queryClient.getQueryData<UnreadCountResponse>(
      notificationQueryKeys.unreadCount()
    ),
  };
};

const rollback = (
  queryClient: QueryClient,
  context: MutationContext | undefined
) => {
  if (!context) return;
  restoreNotificationLists(queryClient, context.lists);
  if (context.unread) {
    queryClient.setQueryData(
      notificationQueryKeys.unreadCount(),
      context.unread
    );
  }
};

/** 404 ở PATCH/DELETE = dòng đã biến mất ở tab khác → bỏ khỏi cache im lặng (README D48). */
const isNotFoundError = (error: unknown): boolean =>
  typeof error === 'string' && /not found/i.test(error);

// ─── Queries ───

export const useNotifications = (
  filter: NotificationListFilter = {},
  options?: { enabled?: boolean }
) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isEnabled = isAuthenticated && (options?.enabled ?? true);

  const query = useInfiniteQuery({
    queryKey: notificationQueryKeys.list(filter),
    queryFn: async ({ pageParam }) =>
      await NotificationService.getList({
        ...normalizeFilter(filter),
        cursor: pageParam ?? undefined,
        limit: NOTIFICATION_PAGE_SIZE,
      }),
    initialPageParam: null as string | null,
    // nextCursor null → undefined → hasNextPage = false
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData, // đổi tab all/unread không nhấp nháy
  });

  const notifications = query.data?.pages.flatMap(page => page.items) ?? [];

  return {
    notifications,
    notificationsTotal: query.data?.pages[0]?.total ?? 0,
    isNotificationsLoading: query.isLoading,
    isNotificationsFetching: query.isFetching,
    isFetchingNextNotifications: query.isFetchingNextPage,
    isFetchNextNotificationsError: query.isFetchNextPageError,
    hasNextNotifications: query.hasNextPage,
    fetchNextNotifications: query.fetchNextPage,
    notificationsError: query.error,
    refetchNotifications: query.refetch,
  };
};

export const useUnreadCount = (options?: { enabled?: boolean }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const query = useQuery<UnreadCountResponse>({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: async () => await NotificationService.getUnreadCount(),
    enabled: isAuthenticated && (options?.enabled ?? true),
    // socket là nguồn nhanh, refetch khi focus là nguồn đúng (README mục 3)
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15 * 1000,
    // NEXT_PUBLIC_NOTIFICATION_POLL_MS > 0 → polling dự phòng khi socket không dùng được
    refetchInterval:
      config.notificationPollMs > 0 ? config.notificationPollMs : false,
  });

  return {
    unreadCount: query.data?.unreadCount ?? 0,
    isUnreadCountLoading: query.isLoading,
    unreadCountError: query.error,
    refetchUnreadCount: query.refetch,
  };
};

// ─── Mutations (optimistic + rollback; không toast — authorizeAxios đã toast lỗi) ───

export const useMarkRead = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: EntityId) => await NotificationService.markRead(id),
    onMutate: async id => {
      const context = await cancelAndSnapshot(queryClient);
      const target = findNotificationInSnapshot(context.lists, id);
      const readAt = new Date().toISOString();

      context.lists.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(
          key,
          patchNotificationInPages(
            data,
            item => item.id === id && item.readAt === null,
            { readAt }
          )
        );
      });
      // chỉ giảm khi biết chắc item đang unread; không có trong cache → để server/socket quyết
      if (target?.readAt === null) adjustUnreadCount(queryClient, -1);

      return context;
    },
    onError: (error, id, context) => {
      rollback(queryClient, context);
      if (isNotFoundError(error)) {
        snapshotNotificationLists(queryClient).forEach(([key, data]) => {
          if (!data) return;
          queryClient.setQueryData(key, removeNotificationFromPages(data, id));
        });
      }
    },
    onSuccess: notification => {
      applyServerReadAt(queryClient, notification);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      });
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.lists(),
        refetchType: 'none',
      });
    },
  });

  return {
    markRead: mutation.mutateAsync,
    isMarkReadPending: mutation.isPending,
  };
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: MarkAllReadRequest) =>
      await NotificationService.markAllRead(payload),
    onMutate: async payload => {
      const context = await cancelAndSnapshot(queryClient);
      const readAt = new Date().toISOString();
      const matches = (item: Notification) =>
        item.readAt === null &&
        (payload.boardId === undefined || item.boardId === payload.boardId);

      context.lists.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(
          key,
          patchNotificationInPages(data, matches, { readAt })
        );
      });
      if (payload.boardId === undefined) {
        setUnreadCountFromServer(queryClient, 0);
      }
      // có boardId: không đoán; server trả unreadCount ở onSuccess
      return context;
    },
    onError: (_error, _payload, context) => rollback(queryClient, context),
    onSuccess: result => {
      setUnreadCountFromServer(queryClient, result.unreadCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.lists(),
        refetchType: 'none',
      });
    },
  });

  return {
    // wrapper để gọi markAllRead() không tham số vẫn type-check
    markAllRead: (boardId?: EntityId) =>
      mutation.mutateAsync(boardId !== undefined ? { boardId } : {}),
    isMarkAllReadPending: mutation.isPending,
  };
};

export const useRemoveNotification = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: EntityId) => await NotificationService.remove(id),
    onMutate: async id => {
      const context = await cancelAndSnapshot(queryClient);
      const target = findNotificationInSnapshot(context.lists, id);

      context.lists.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, removeNotificationFromPages(data, id));
      });
      if (target?.readAt === null) adjustUnreadCount(queryClient, -1);

      return context;
    },
    onError: (error, id, context) => {
      // 404 = tab khác đã xóa: giữ nguyên trạng thái đã bỏ khỏi cache, không rollback
      if (isNotFoundError(error)) {
        queryClient.invalidateQueries({
          queryKey: notificationQueryKeys.unreadCount(),
        });
        return;
      }
      rollback(queryClient, context);
    },
    onSuccess: result => {
      setUnreadCountFromServer(queryClient, result.unreadCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.lists(),
        refetchType: 'none',
      });
    },
  });

  return {
    removeNotification: mutation.mutateAsync,
    isRemoveNotificationPending: mutation.isPending,
  };
};
