'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { KanbanSquare, ListTodo, Plus, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';

import { Pane, PaneContent } from '@/components/layout/pane';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Group } from '@/components/ui/surface';
import { useOptionalAiAssistant } from '@/components/ai-assistant/ai-assistant-provider';
import {
  ProgressHero,
  ProgressHeroSkeleton,
} from '@/components/project-home/progress-hero';
import {
  StatusStatsCard,
  StatusStatsSkeleton,
} from '@/components/project-home/status-stats';
import {
  ActivityRow,
  CompactIssueRow,
  MemberRow,
  QuickLinkRow,
} from '@/components/project-home/rows';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { BoardService } from '@/lib/apis/board';
import { useCard } from '@/hooks/use-card';
import { useColumn } from '@/hooks/use-column';
import { useUserBoard } from '@/hooks/use-user-board';
import { useVersion } from '@/hooks/use-version';
import type { Card, Column } from '@/config/interface';
import { HomeGanttChart } from './HomeGanttChart';

const RECENT_LIMIT = 100;

const formatAge = (value?: string | number | null): string => {
  if (!value) return '';
  const hours = dayjs().diff(dayjs(value), 'hour');
  if (hours < 1) return '<1h';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

export default function ProjectHomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const boardId = toEntityIdOrUndefined(params?.projectId);
  const assistant = useOptionalAiAssistant();

  useEffect(() => {
    if (!boardId) {
      router.replace('/dashboard');
    }
  }, [boardId, router]);

  const { data: board, isLoading: isBoardLoading } = useQuery({
    queryKey: ['board-detail', boardId],
    queryFn: () => BoardService.getBoardById(boardId!),
    enabled: !!boardId,
  });

  const { columns, isLoading: isColumnsLoading } = useColumn(boardId);
  const { cards: recentCards } = useCard(boardId, {
    limit: RECENT_LIMIT,
  });
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });
  const { versions } = useVersion(boardId, { skip: 0, limit: 100 });

  const sortedColumns = useMemo<Column[]>(
    () => [...columns].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [columns]
  );
  const lastColumn = sortedColumns[sortedColumns.length - 1];
  const secondColumn = sortedColumns[1];

  const totalCardCount = sortedColumns.reduce(
    (sum, col) => sum + (col._count?.cards ?? 0),
    0
  );

  // Sprint = version đang chạy (today nằm trong [startDate, endDate]); nếu
  // không có, lấy version sắp tới gần nhất. Không có version nào phù hợp thì
  // hero chuyển sang tiến độ toàn dự án.
  const activeVersion = useMemo(() => {
    const now = dayjs();
    const withDates = versions.filter(v => v.startDate && v.endDate);

    const running = withDates.find(v => {
      const start = dayjs(v.startDate);
      const end = dayjs(v.endDate);
      return !now.isBefore(start) && !now.isAfter(end);
    });
    if (running) return running;

    const upcoming = withDates
      .filter(v => dayjs(v.startDate).isAfter(now))
      .sort(
        (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf()
      );
    return upcoming[0];
  }, [versions]);

  const isVersionRunning =
    !!activeVersion && !dayjs(activeVersion.startDate).isAfter(dayjs());

  const { totalCount: sprintTotal } = useCard(
    activeVersion ? boardId : undefined,
    activeVersion
      ? { versionId: String(activeVersion.id), limit: 1 }
      : undefined
  );
  const { totalCount: sprintDone } = useCard(
    activeVersion && lastColumn ? boardId : undefined,
    activeVersion && lastColumn
      ? {
          versionId: String(activeVersion.id),
          columnId: String(lastColumn.id),
          limit: 1,
        }
      : undefined
  );

  const { cards: inProgressCards } = useCard(
    secondColumn ? boardId : undefined,
    secondColumn ? { columnId: String(secondColumn.id), limit: 8 } : undefined
  );

  const scheduledCards = useMemo(
    () => recentCards.filter(c => c.startDate && c.dueDate),
    [recentCards]
  );

  const recentIssues = useMemo(() => recentCards.slice(0, 8), [recentCards]);

  const memberMap = useMemo(
    () => new Map(listUser.items.map(u => [u.userId, u])),
    [listUser.items]
  );

  const stats = useMemo(
    () =>
      sortedColumns.map(col => {
        const value = col._count?.cards ?? 0;
        return {
          id: col.id,
          label: col.title,
          value,
          statusColor: col.statusColor,
          pct: totalCardCount ? Math.round((value / totalCardCount) * 100) : 0,
        };
      }),
    [sortedColumns, totalCardCount]
  );

  const getAssignee = (card: Card) => {
    if (card.assignee) return card.assignee;
    if (card.assigneeUserId) return memberMap.get(card.assigneeUserId);
    return undefined;
  };

  if (!boardId) return null;

  const isLoading = isBoardLoading || isColumnsLoading;
  const base = `/project/${boardId}`;

  // Hero: milestone đang chạy/sắp tới nếu có, không thì tiến độ toàn dự án
  // (công việc ở cột cuối = đã đóng).
  const closedCount = lastColumn?._count?.cards ?? 0;
  const heroDone = activeVersion ? sprintDone : closedCount;
  const heroTotal = activeVersion ? sprintTotal : totalCardCount;
  const heroPct = heroTotal > 0 ? Math.round((heroDone / heroTotal) * 100) : 0;
  const sprintDaysLeft = activeVersion?.endDate
    ? Math.max(0, dayjs(activeVersion.endDate).diff(dayjs(), 'day'))
    : null;
  const closedOfTotal = t('projectHome.sprint.closedOfTotal', {
    done: heroDone,
    total: heroTotal,
  });

  const quickLinks = [
    {
      key: 'board',
      label: t('shell.nav.board'),
      href: `${base}/board`,
      icon: <KanbanSquare />,
    },
    {
      key: 'issues',
      label: t('shell.nav.issues'),
      href: `${base}/issues`,
      icon: <ListTodo />,
    },
    ...(assistant?.boardId
      ? [
          {
            key: 'assistant',
            label: t('shell.nav.assistant'),
            onClick: assistant.toggle,
            icon: <Sparkles />,
          },
        ]
      : []),
  ];

  return (
    <Pane
      title={board?.title ?? t('shell.nav.home')}
      subtitle={board?.boardCode}
      actions={
        <Link
          href={`${base}/add-issue`}
          className={buttonVariants({ size: 'sm' })}
        >
          <Plus aria-hidden="true" />
          {t('shell.nav.newIssue')}
        </Link>
      }
    >
      <PaneContent width="full">
        {board?.description && (
          <p className="mb-5 max-w-[64ch] text-sm leading-[1.45] text-pretty text-muted">
            {board.description}
          </p>
        )}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Cột chính */}
          <div className="flex min-w-0 flex-col gap-3.5">
            {isLoading ? (
              <>
                <ProgressHeroSkeleton />
                <StatusStatsSkeleton />
              </>
            ) : (
              <>
                {activeVersion ? (
                  <ProgressHero
                    kicker={
                      isVersionRunning
                        ? t('projectHome.hero.milestone')
                        : t('projectHome.hero.upcomingMilestone')
                    }
                    active={isVersionRunning}
                    title={activeVersion.name}
                    description={[
                      sprintDaysLeft !== null
                        ? t('projectHome.sprint.daysLeft', {
                            count: sprintDaysLeft,
                          })
                        : null,
                      closedOfTotal,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    pct={heroPct}
                  />
                ) : (
                  <ProgressHero
                    kicker={t('projectHome.hero.overall')}
                    active={totalCardCount > 0}
                    title={closedOfTotal}
                    description={
                      lastColumn
                        ? t('projectHome.hero.overallHint', {
                            column: lastColumn.title,
                          })
                        : undefined
                    }
                    pct={heroPct}
                  />
                )}

                {stats.length > 0 && <StatusStatsCard stats={stats} />}
              </>
            )}

            <HomeGanttChart
              cards={scheduledCards}
              totalScheduledCount={
                // Không chắc BE có nhiều hơn RECENT_LIMIT card lịch trình hay
                // không, nên chỉ so sánh trong tập đã tải để quyết định có hiện
                // ghi chú "đã rút gọn" hay không.
                scheduledCards.length
              }
              columns={sortedColumns}
            />

            <Group
              className="animate-rise [animation-delay:120ms]"
              title={t('projectHome.recentIssues')}
              action={
                <Link
                  href={`${base}/issues`}
                  className="shrink-0 text-[13.5px] font-semibold text-accent transition-colors duration-200 ease-soft hover:text-accent-hover"
                >
                  {t('projectHome.viewAll')}
                </Link>
              }
            >
              {recentIssues.length === 0 ? (
                <EmptyState
                  title={t('projectHome.noIssues')}
                  description={t('projectHome.noIssuesHint')}
                />
              ) : (
                recentIssues.map((issue, index) => (
                  <ActivityRow
                    key={issue.id}
                    issue={issue}
                    href={`${base}/issues/${issue.id}`}
                    assignee={getAssignee(issue)}
                    age={formatAge(issue.updatedAt)}
                    index={index}
                  />
                ))
              )}
            </Group>
          </div>

          {/* Cột phụ: dưới xl xếp thành lưới 2 cột (md–lg), rồi 1 cột */}
          <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-1">
            {secondColumn && (
              <Group
                className="animate-rise [animation-delay:80ms]"
                title={secondColumn.title}
              >
                {inProgressCards.length === 0 ? (
                  <EmptyState
                    className="py-6"
                    title={t('projectHome.inProgressEmpty')}
                    description={t('projectHome.inProgressEmptyHint', {
                      column: secondColumn.title,
                    })}
                  />
                ) : (
                  inProgressCards.map((issue, index) => (
                    <CompactIssueRow
                      key={issue.id}
                      issue={issue}
                      href={`${base}/issues/${issue.id}`}
                      statusColor={secondColumn.statusColor}
                      assignee={getAssignee(issue)}
                      index={index}
                    />
                  ))
                )}
              </Group>
            )}

            <Group
              className="animate-rise [animation-delay:120ms]"
              title={t('projectHome.team')}
            >
              {listUser.items.length === 0 ? (
                <EmptyState
                  className="py-6"
                  title={t('projectHome.teamEmpty')}
                />
              ) : (
                listUser.items.map((member, index) => {
                  const assigned = recentCards.filter(
                    c =>
                      (c.assigneeUserId === member.userId ||
                        c.assignee?.id === member.userId) &&
                      c.column?.id !== lastColumn?.id
                  );
                  const inProg = secondColumn
                    ? assigned.filter(c => c.column?.id === secondColumn.id)
                        .length
                    : 0;
                  return (
                    <MemberRow
                      key={member.userId}
                      member={member}
                      open={assigned.length}
                      inProgress={inProg}
                      inProgressColor={secondColumn?.statusColor}
                      index={index}
                    />
                  );
                })
              )}
            </Group>

            <Group
              className="animate-rise [animation-delay:160ms]"
              title={t('projectHome.quickAccess')}
            >
              {quickLinks.map((link, index) => (
                <QuickLinkRow
                  key={link.key}
                  index={index}
                  icon={link.icon}
                  label={link.label}
                  href={link.href}
                  onClick={link.onClick}
                />
              ))}
            </Group>
          </div>
        </div>
      </PaneContent>
    </Pane>
  );
}
