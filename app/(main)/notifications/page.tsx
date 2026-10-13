'use client';

import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Select, type SelectOption } from '@/components/ui/select';
import { PageSkeleton } from '@/components/ui/skeletons';
import {
  NotificationList,
  type NotificationTab,
} from '@/components/shared/notifications/NotificationList';
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
    <div className="min-h-full w-full bg-theme-neutral-3">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold text-theme-neutral-11">
            {t('notifications.title')}
          </h1>
          <div className="w-full sm:w-72">
            <Select
              label={t('notifications.filter.board')}
              options={boardOptions}
              value={boardId ? String(boardId) : ''}
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
        </div>

        <div className="overflow-hidden rounded-2xl border border-theme-neutral-4 bg-theme-neutral-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <NotificationList
            variant="page"
            tab={tab}
            onTabChange={next =>
              updateParams(p => {
                if (next === 'all') p.delete('tab');
                else p.set('tab', next);
              })
            }
            boardId={boardId}
          />
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
