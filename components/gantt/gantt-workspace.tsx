'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, Plus } from 'lucide-react';

import { Pane } from '@/components/layout/pane';
import { Button, buttonVariants } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import IssuesFilter from '@/components/shared/filters/IssuesFilter';
import { IssueViewSwitcher } from '@/components/issues/issue-view-switcher';
import { IssueInspectorContext } from '@/components/issues/issue-inspector';
import { useCard } from '@/hooks/use-card';
import { useVersion } from '@/hooks/use-version';
import { getRoleFlags } from '@/hooks/use-board-role';
import { useUserBoard } from '@/hooks/use-user-board';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { useCurrentProject } from '@/hooks/use-current-project';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/use-media-query';
import { toastHelpers } from '@/hooks/use-toast';
import { CardService } from '@/lib/apis/card';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { cn } from '@/lib/utils';
import type {
  Card,
  CardListParams,
  CardListResponse,
  EntityId,
} from '@/config/interface';
import { GanttChart, LABEL_WIDTH } from './gantt-chart';
import {
  DAY_WIDTH,
  applyDrag,
  buildRange,
  getCardSpan,
  groupByVersion,
  sortBySchedule,
  splitScheduled,
  toApiDate,
  type DragMode,
  type GanttScale,
} from './gantt-timeline';

/** API phân trang; Gantt cần cả tập nên lấy một trang lớn theo bộ lọc. */
const GANTT_LIMIT = 200;
const SCALE_STORAGE_KEY = 'gantt.scale';
/** Issue đang mở ở cột phải, giữ trên URL để Back / chia sẻ link vẫn đúng. */
const ISSUE_PARAM = 'issue';
const SCALES: GanttScale[] = ['week', 'month', 'quarter'];

const readScale = (): GanttScale => {
  try {
    const saved = localStorage.getItem(SCALE_STORAGE_KEY);
    return SCALES.includes(saved as GanttScale)
      ? (saved as GanttScale)
      : 'month';
  } catch {
    return 'month';
  }
};

const parseIssueParam = (raw: string | null): EntityId | undefined => {
  try {
    return toEntityIdOrUndefined(raw);
  } catch {
    return undefined; // ?issue=abc → bỏ qua
  }
};

export interface GanttWorkspaceProps {
  /** Chi tiết issue hiển thị ở cột phải; trang route cung cấp để component không phụ thuộc vào `app/`. */
  renderInspector: (cardId: EntityId, close: () => void) => ReactNode;
}

/**
 * Tab Gantt của dự án: bộ lọc dùng chung với Issues, thang tuần / tháng / quý,
 * nhóm theo version, kéo thanh đổi ngày (optimistic) và inspector bên phải.
 */
export function GanttWorkspace({ renderInspector }: GanttWorkspaceProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const params = useParams<{ projectId: string }>();
  const boardId = toEntityIdOrUndefined(params?.projectId);
  const { code, title } = useCurrentProject();
  const isWide = useMediaQuery(BREAKPOINTS.wide);
  const queryClient = useQueryClient();

  const [filterParams, setFilterParams] = useState<CardListParams>({});
  // Server không biết localStorage: render 'month' trước rồi mới đọc lựa chọn đã lưu.
  const [scale, setScaleState] = useState<GanttScale>('month');
  useEffect(() => {
    setScaleState(readScale());
  }, []);
  const setScale = useCallback((next: GanttScale) => {
    setScaleState(next);
    try {
      localStorage.setItem(SCALE_STORAGE_KEY, next);
    } catch {
      /* chế độ riêng tư: chỉ giữ trong phiên */
    }
  }, []);

  const queryParams = useMemo<CardListParams>(
    () => ({ ...filterParams, skip: 0, limit: GANTT_LIMIT }),
    [filterParams]
  );
  const { cards, totalCount, isLoading } = useCard(boardId, queryParams);
  const { versions } = useVersion(boardId, { skip: 0, limit: 100 });
  // Quyền lấy từ danh sách thành viên (như issue detail) vì activeBoard chỉ được nạp ở trang Board.
  const currentUser = useAppSelector(selectCurrentUser);
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });
  const myMember = listUser.items.find(m => m.userId === currentUser?.id);
  const { isContributor } = getRoleFlags(myMember?.role ?? null);

  const sortedCards = useMemo(() => sortBySchedule(cards), [cards]);
  const { scheduled, unscheduled } = useMemo(
    () => splitScheduled(sortedCards),
    [sortedCards]
  );
  const groups = useMemo(
    () => groupByVersion(scheduled, versions),
    [scheduled, versions]
  );
  const range = useMemo(
    () =>
      buildRange({
        spans: scheduled.map(card => getCardSpan(card)!),
        versions,
        scale,
      }),
    [scheduled, versions, scale]
  );

  /* ─── Inspector: ?issue=<id> ─── */
  const selectedId = parseIssueParam(searchParams.get(ISSUE_PARAM));

  const open = useCallback(
    (card: Card) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(ISSUE_PARAM, String(card.id));
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(ISSUE_PARAM);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  // Esc đóng inspector (trừ khi đang có hộp thoại phía trên hoặc đang gõ)
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"], .ant-dropdown-open'))
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedId, close]);

  const inspector = useMemo(
    () => ({ close, overlay: !isWide, fullPage: false }),
    [close, isWide]
  );

  /* ─── Kéo đổi ngày: cập nhật cache trước, lỗi thì trả lại ─── */
  const [updatingIds, setUpdatingIds] = useState<ReadonlySet<EntityId>>(
    () => new Set()
  );

  const handleDateChange = useCallback(
    async (card: Card, mode: DragMode, deltaDays: number) => {
      const span = getCardSpan(card);
      if (!span || !boardId) return;
      const next = applyDrag(span, mode, deltaDays);
      const payload = {
        startDate: toApiDate(next.start),
        dueDate: toApiDate(next.end),
      };
      // Cùng key với useCard để thanh nhảy ngay sang vị trí mới.
      const queryKey = ['cards', boardId, queryParams];
      const snapshot = queryClient.getQueryData<CardListResponse>(queryKey);
      queryClient.setQueryData<CardListResponse>(queryKey, current =>
        current
          ? {
              ...current,
              items: current.items.map(item =>
                item.id === card.id ? { ...item, ...payload } : item
              ),
            }
          : current
      );
      setUpdatingIds(prev => new Set(prev).add(card.id));
      try {
        await CardService.update(card.id, payload);
        queryClient.invalidateQueries({ queryKey: ['cards'] });
        queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] });
        queryClient.invalidateQueries({ queryKey: ['boards'] });
      } catch {
        if (snapshot) queryClient.setQueryData(queryKey, snapshot);
        toastHelpers.error({ title: t('gantt.updateFailed') });
      } finally {
        setUpdatingIds(prev => {
          const nextSet = new Set(prev);
          nextSet.delete(card.id);
          return nextSet;
        });
      }
    },
    [boardId, queryClient, queryParams, t]
  );

  /* ─── Cuộn tới hôm nay ─── */
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToToday = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const element = scrollRef.current;
      if (!element) return;
      const viewport = Math.max(element.clientWidth - LABEL_WIDTH, 0);
      element.scrollTo({
        left: Math.max(range.todayIndex * DAY_WIDTH[scale] - viewport / 3, 0),
        behavior,
      });
    },
    [range.todayIndex, scale]
  );
  useEffect(() => {
    if (!isLoading) scrollToToday('auto');
  }, [isLoading, scrollToToday]);

  const summary = !isLoading
    ? t('gantt.summary', {
        scheduled: scheduled.length,
        unscheduled: unscheduled.length,
      })
    : undefined;
  const truncated = !isLoading && totalCount > cards.length;

  return (
    <Pane
      title={t('shell.nav.gantt')}
      subtitle={[code, title].filter(Boolean).join(' · ') || undefined}
      center={<IssueViewSwitcher />}
      scroll={false}
      actions={
        boardId ? (
          <Link
            href={`/project/${boardId}/add-issue`}
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus aria-hidden="true" />
            {t('shell.nav.newIssue')}
          </Link>
        ) : undefined
      }
    >
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-3 px-4 pt-4 md:px-5">
            <IssuesFilter
              boardId={boardId}
              onSearch={setFilterParams}
              summary={summary}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Segmented<GanttScale>
                size="sm"
                label={t('gantt.scale.label')}
                value={scale}
                onChange={setScale}
                options={[
                  { value: 'week', label: t('gantt.scale.week') },
                  { value: 'month', label: t('gantt.scale.month') },
                  { value: 'quarter', label: t('gantt.scale.quarter') },
                ]}
              />
              <div className="flex min-w-0 items-center gap-3">
                {truncated && (
                  <span className="truncate text-[12.5px] text-warn">
                    {t('gantt.truncated', {
                      shown: cards.length,
                      total: totalCount,
                    })}
                  </span>
                )}
                {isContributor && (
                  <span className="hidden text-[12.5px] text-faint lg:inline">
                    {t('gantt.dragHint')}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToToday()}
                >
                  <CalendarCheck aria-hidden="true" />
                  {t('gantt.today')}
                </Button>
              </div>
            </div>
          </div>

          {boardId && (
            <GanttChart
              boardId={boardId}
              groups={groups}
              unscheduled={unscheduled}
              range={range}
              scale={scale}
              selectedId={selectedId}
              canEdit={isContributor}
              updatingIds={updatingIds}
              loading={isLoading}
              scrollRef={scrollRef}
              onOpen={open}
              onDateChange={handleDateChange}
              className="animate-pop mx-4 mt-3 mb-4 rounded-card border border-line bg-card shadow-card md:mx-5"
            />
          )}
        </div>

        {selectedId && (
          <IssueInspectorContext.Provider value={inspector}>
            {!isWide && (
              <div
                aria-hidden="true"
                onClick={close}
                className="animate-fade-in absolute inset-0 z-20 bg-backdrop/40"
              />
            )}
            <aside
              aria-label={t('pageTitle.issueDetail')}
              className={cn(
                'animate-slide-in-right flex flex-col overflow-hidden border-l border-line bg-bg',
                isWide
                  ? 'w-[420px] flex-none 2xl:w-[480px]'
                  : 'absolute inset-y-0 right-0 z-30 w-[min(520px,100%)] shadow-lift'
              )}
            >
              {renderInspector(selectedId, close)}
            </aside>
          </IssueInspectorContext.Provider>
        )}
      </div>
    </Pane>
  );
}
