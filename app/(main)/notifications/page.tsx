'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Pane, PaneContent } from '@/components/layout/pane';
import { Segmented } from '@/components/ui/segmented';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card } from '@/components/ui/surface';
import { NotificationListSkeleton } from '@/components/ui/skeletons';
import {
  formatUnreadBadge,
  NotificationList,
  type NotificationTab,
} from '@/components/shared/notifications/NotificationList';
import { useUnreadCount } from '@/hooks/use-notification';
import { BoardService } from '@/lib/apis/board';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { replaceWithUpdatedSearchParams } from '@/lib/url';

const parseBoardId = (raw: string | null) => {
  try {
    return toEntityIdOrUndefined(raw);
  } catch {
    return undefined; // ?boardId=abc → bỏ qua
  }
};

function NotificationsPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { unreadCount } = useUnreadCount();

  const tab: NotificationTab =
    searchParams.get('tab') === 'unread' ? 'unread' : 'all';
  const boardId = parseBoardId(searchParams.get('boardId'));

  // Cùng key với Dashboard/ProjectsDropdown để dùng lại cache.
  const {
    data: boardsData,
    isLoading: isBoardsLoading,
    error: boardsError,
  } = useQuery({
    queryKey: ['dashboard-boards'],
    queryFn: () => BoardService.getBoard(),
    staleTime: 30 * 1000,
  });

  const boardOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: t('notifications.filter.allBoards') },
      ...(boardsData?.items ?? []).map(b => ({
        value: String(b.id),
        label: `${b.title} (${b.boardCode})`,
      })),
    ],
    [boardsData, t]
  );

  const updateParams = (updater: (p: URLSearchParams) => void) =>
    replaceWithUpdatedSearchParams(router, pathname, searchParams, updater);

  return (
    <Pane
      title={t('notifications.title')}
      center={
        <Segmented<NotificationTab>
          onCanvas
          label={t('notifications.title')}
          value={tab}
          onChange={next =>
            updateParams(p => {
              if (next === 'all') p.delete('tab');
              else p.set('tab', next);
            })
          }
          options={[
            { value: 'all', label: t('notifications.tabs.all') },
            {
              value: 'unread',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {t('notifications.tabs.unread')}
                  {unreadCount > 0 && (
                    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent tabular-nums">
                      {formatUnreadBadge(unreadCount)}
                    </span>
                  )}
                </span>
              ),
            },
          ]}
        />
      }
      actions={
        <div
          role="group"
          aria-label={t('notifications.filter.board')}
          className="w-[200px] md:w-[240px]"
        >
          <Select
            options={boardOptions}
            value={boardId ? String(boardId) : ''}
            // Select coi '' là "chưa chọn" nên nhãn "Tất cả" phải hiện qua placeholder
            placeholder={t('notifications.filter.allBoards')}
            disabled={isBoardsLoading || !!boardsError}
            allowClear={false}
            onValueChange={value =>
              updateParams(p => {
                if (value) p.set('boardId', value);
                else p.delete('boardId');
              })
            }
          />
        </div>
      }
    >
      <PaneContent width="narrow">
        <Card className="animate-pop overflow-hidden">
          <NotificationList
            variant="page"
            showTabs={false}
            tab={tab}
            onTabChange={next =>
              updateParams(p => {
                if (next === 'all') p.delete('tab');
                else p.set('tab', next);
              })
            }
            boardId={boardId}
          />
        </Card>
      </PaneContent>
    </Pane>
  );
}

function NotificationsPageFallback() {
  const { t } = useTranslation();
  return (
    <Pane title={t('notifications.title')}>
      <PaneContent width="narrow">
        <Card className="overflow-hidden">
          <NotificationListSkeleton rows={6} />
        </Card>
      </PaneContent>
    </Pane>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsPageFallback />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
