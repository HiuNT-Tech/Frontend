'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  House,
  ChartGantt,
  KanbanSquare,
  LayoutGrid,
  ListTodo,
  PanelLeft,
  Search,
  Settings,
  SquarePlus,
  Sparkles,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { BoardService } from '@/lib/apis/board';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentActiveBoard } from '@/redux/activeBoard/activeBoardSlice';
import { IconButton } from '@/components/ui/icon-button';
import { useOptionalAiAssistant } from '@/components/ai-assistant/ai-assistant-provider';
import {
  AppLogo,
  ProjectTile,
  SidebarButton,
  SidebarGroupLabel,
  SidebarLink,
} from './sidebar-item';
import { NotificationBell } from './notification-bell';
import { AccountMenu, ThemeToggle } from './account-menu';
import { useSidebar } from './sidebar-context';

const MAX_PROJECTS = 8;

const isActivePath = (pathname: string, href: string, exact?: boolean) =>
  exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

/** Ô tìm kiếm: Enter mở danh sách công việc của dự án với từ khoá; Ctrl/⌘ K để focus. */
function SidebarSearch({ projectId }: { projectId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!projectId) return null;

  const submit = (value: string) => {
    const keyword = value.trim();
    const params = new URLSearchParams();
    if (keyword) params.set('search', keyword);
    const qs = params.toString();
    router.push(`/project/${projectId}/issues${qs ? `?${qs}` : ''}`);
  };

  return (
    <form
      role="search"
      className="px-3 pt-0.5 pb-1.5"
      onSubmit={event => {
        event.preventDefault();
        submit(query);
      }}
    >
      <label className="flex h-9 cursor-text items-center gap-2 rounded-[10px] bg-card pr-1.5 pl-2.5 shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--accent-soft)]">
        <Search
          className="size-[15px] flex-none text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={t('shell.searchIssues')}
          aria-label={t('shell.searchIssues')}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none focus-visible:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              submit('');
            }}
            aria-label={t('shell.clearSearch')}
            className="grid size-5 place-items-center rounded-full bg-fill text-muted"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="rounded-[6px] px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted shadow-[inset_0_0_0_1px_var(--line)]">
            {t('shell.searchShortcut')}
          </kbd>
        )}
      </label>
    </form>
  );
}

/**
 * Source list bên trái (giống Mail / Reminders): logo · tìm kiếm · điều hướng trong dự án ·
 * danh sách dự án · cài đặt dự án · tài khoản + đổi sáng/tối.
 */
export function AppSidebar({ overlay }: { overlay?: boolean }) {
  const { t } = useTranslation();
  const pathname = usePathname() ?? '';
  const params = useParams<{ projectId?: string }>();
  const projectId = params?.projectId;
  const sidebar = useSidebar();
  const assistant = useOptionalAiAssistant();
  const activeBoard = useAppSelector(selectCurrentActiveBoard);

  // Cùng key với Dashboard để dùng lại cache.
  const { data } = useQuery({
    queryKey: ['dashboard-boards'],
    queryFn: () => BoardService.getBoard(),
    staleTime: 30 * 1000,
  });
  const boards = data?.items ?? [];
  const currentBoard =
    boards.find(board => String(board.id) === projectId) ??
    (activeBoard && String(activeBoard.id) === projectId
      ? activeBoard
      : undefined);
  const projectCode = currentBoard?.boardCode ?? '';

  const base = projectId ? `/project/${projectId}` : '';
  const shownBoards = boards.slice(0, MAX_PROJECTS);
  // Dự án hiện tại luôn hiện trong danh sách, kể cả khi nằm ngoài 8 cái đầu.
  if (
    currentBoard &&
    !shownBoards.some(board => String(board.id) === projectId)
  ) {
    shownBoards.push(currentBoard);
  }

  return (
    <aside
      aria-label={t('shell.appName')}
      className={cn(
        'flex h-full flex-none flex-col border-r border-line bg-sidebar',
        overlay ? 'w-[min(300px,86vw)]' : 'w-[248px]'
      )}
    >
      {/* logo + ẩn sidebar */}
      <div className="flex h-14 flex-none items-center gap-2.5 pr-2 pl-4">
        <AppLogo />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[15px] font-bold tracking-[-0.01em] text-ink">
            {t('shell.appName')}
          </div>
          <div className="truncate text-xs text-muted">
            {currentBoard?.title ?? t('shell.workspace')}
          </div>
        </div>
        <IconButton
          aria-label={t('shell.hideSidebar')}
          onClick={sidebar.toggle}
        >
          <PanelLeft />
        </IconButton>
      </div>

      <SidebarSearch projectId={projectId} />

      <nav
        aria-label={t('shell.workspace')}
        className="min-h-0 flex-1 overflow-y-auto px-2.5 pt-1.5 pb-3"
      >
        {projectId && (
          <div className="flex flex-col gap-0.5">
            <SidebarLink
              href={base}
              active={isActivePath(pathname, base, true)}
              icon={<House />}
              label={t('shell.nav.home')}
            />
            <SidebarLink
              href={`${base}/issues`}
              active={isActivePath(pathname, `${base}/issues`)}
              icon={<ListTodo />}
              label={t('shell.nav.issues')}
            />
            <SidebarLink
              href={`${base}/board`}
              active={isActivePath(pathname, `${base}/board`)}
              icon={<KanbanSquare />}
              label={t('shell.nav.board')}
            />
            <SidebarLink
              href={`${base}/gantt`}
              active={isActivePath(pathname, `${base}/gantt`)}
              icon={<ChartGantt />}
              label={t('shell.nav.gantt')}
            />
            <SidebarLink
              href={`${base}/add-issue`}
              active={isActivePath(pathname, `${base}/add-issue`)}
              icon={<SquarePlus />}
              label={t('shell.nav.newIssue')}
            />
            {assistant?.boardId && (
              <SidebarButton
                onClick={assistant.toggle}
                active={assistant.isOpen}
                aria-pressed={assistant.isOpen}
                icon={<Sparkles />}
                label={t('shell.nav.assistant')}
                trailing={
                  <kbd className="font-sans text-[11px] font-semibold text-faint">
                    Ctrl J
                  </kbd>
                }
              />
            )}
          </div>
        )}

        <div className={cn('flex flex-col gap-0.5', projectId && 'mt-3')}>
          <SidebarLink
            href="/dashboard"
            active={isActivePath(pathname, '/dashboard')}
            icon={<LayoutGrid />}
            label={t('shell.nav.allProjects')}
          />
          <NotificationBell active={isActivePath(pathname, '/notifications')} />
        </div>

        {shownBoards.length > 0 && (
          <>
            <SidebarGroupLabel>{t('shell.projects')}</SidebarGroupLabel>
            <div className="flex flex-col gap-0.5">
              {shownBoards.map(board => {
                const active = String(board.id) === projectId;
                return (
                  <SidebarLink
                    key={board.id}
                    href={`/project/${board.id}`}
                    title={board.title}
                    active={false}
                    icon={
                      <ProjectTile code={board.boardCode} active={active} />
                    }
                    label={
                      <span
                        className={cn(
                          active ? 'font-semibold text-ink' : undefined
                        )}
                      >
                        {board.title}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* chân: cài đặt dự án · tài khoản · sáng/tối */}
      <div className="flex-none border-t border-line px-2.5 pt-2 pb-2.5">
        {projectId && (
          <SidebarLink
            href={`${base}/settings`}
            active={isActivePath(pathname, `${base}/settings`)}
            icon={<Settings />}
            label={
              projectCode
                ? t('shell.projectSettings', { code: projectCode })
                : t('sidebar.settings')
            }
          />
        )}
        <div className={cn('flex items-center gap-1', projectId && 'mt-1.5')}>
          <AccountMenu />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
