'use client';

import { useEffect } from 'react';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { Users, Shapes, CircleDot, Milestone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { Pane, PaneContent } from '@/components/layout/pane';
import { EmptyState } from '@/components/ui/empty-state';
import { Segmented } from '@/components/ui/segmented';
import { useCurrentProject } from '@/hooks/use-current-project';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/use-media-query';
import { replaceWithUpdatedSearchParams } from '@/lib/url';
import { cn } from '@/lib/utils';
import { MembersTab } from './MembersTab';
import { IssueTypesTab } from './IssueTypesTab';
import { VersionsTab } from './VersionTab';
import {
  fetchBoardDetailsAPI,
  selectCurrentActiveBoard,
} from '@/redux/activeBoard/activeBoardSlice';
import type { AppDispatch } from '@/redux/store';
import { StatusesTab } from './StatusesTab';
import { toEntityIdOrUndefined } from '@/lib/entity-id';

type SettingsSection = 'members' | 'issueTypes' | 'statuses' | 'versions';

const SECTIONS: { key: SettingsSection; icon: React.ReactNode }[] = [
  { key: 'members', icon: <Users /> },
  { key: 'issueTypes', icon: <Shapes /> },
  { key: 'statuses', icon: <CircleDot /> },
  { key: 'versions', icon: <Milestone /> },
];

const toSection = (value: string | null): SettingsSection =>
  SECTIONS.some(s => s.key === value) ? (value as SettingsSection) : 'members';

export default function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const currentActiveBoard = useSelector(selectCurrentActiveBoard);
  const { title: projectTitle, code: projectCode } = useCurrentProject();
  const isDesktop = useMediaQuery(BREAKPOINTS.desktop);

  const boardId =
    toEntityIdOrUndefined(params?.projectId as string) ??
    toEntityIdOrUndefined(params?.id as string) ??
    toEntityIdOrUndefined(searchParams.get('boardId'));

  // Fetch board context if not already loaded
  useEffect(() => {
    if (boardId && !currentActiveBoard) {
      dispatch(fetchBoardDetailsAPI({ boardId }));
    }
  }, [dispatch, boardId, currentActiveBoard]);

  const currentTab = toSection(searchParams.get('tab'));

  const handleTabChange = (key: SettingsSection) => {
    replaceWithUpdatedSearchParams(router, pathname, searchParams, params => {
      params.set('tab', key);
    });
  };

  const subtitle =
    [projectCode, projectTitle ?? currentActiveBoard?.title]
      .filter(Boolean)
      .join(' · ') || undefined;

  const sectionLabel = (key: SettingsSection) => t(`settings.tabs.${key}`);

  if (!boardId) {
    return (
      <Pane title={t('settings.title')}>
        <PaneContent width="narrow">
          <EmptyState card title={t('settings.noBoardSelected')} />
        </PaneContent>
      </Pane>
    );
  }

  return (
    <Pane
      title={t('settings.title')}
      subtitle={subtitle}
      center={
        isDesktop ? undefined : (
          <Segmented<SettingsSection>
            label={t('settings.title')}
            value={currentTab}
            onChange={handleTabChange}
            size="sm"
            className="w-full max-w-[560px]"
            options={SECTIONS.map(section => ({
              value: section.key,
              label: sectionLabel(section.key),
            }))}
          />
        )
      }
    >
      <div className="flex min-h-full min-w-0">
        {/* Danh sách nguồn bên trái (≥1024px): cùng ngôn ngữ với sidebar chính */}
        {isDesktop && (
          <nav
            aria-label={t('settings.title')}
            className="w-[216px] flex-none border-r border-line px-3 pt-6 pb-8"
          >
            <div className="sticky top-6 flex flex-col gap-0.5">
              <div className="px-2.5 pb-2 text-[12.5px] font-semibold text-muted">
                {t('settings.title')}
              </div>
              {SECTIONS.map(section => {
                const active = section.key === currentTab;
                return (
                  <button
                    key={section.key}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => handleTabChange(section.key)}
                    className={cn(
                      'press flex h-9 w-full min-w-0 items-center gap-2.5 rounded-[9px] px-2.5 text-left text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft',
                      active
                        ? 'bg-card font-semibold text-ink shadow-hair ring-1 ring-line'
                        : 'font-medium text-ink-2 hover:bg-hover'
                    )}
                  >
                    <span
                      className={cn(
                        'grid flex-none place-items-center [&_svg]:size-[17px]',
                        active ? 'text-accent' : 'text-muted'
                      )}
                    >
                      {section.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {sectionLabel(section.key)}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <div className="min-w-0 flex-1">
          <PaneContent width="default" className="max-w-[960px] lg:mx-0">
            <div key={currentTab} className="animate-view-in">
              {currentTab === 'members' && <MembersTab boardId={boardId} />}
              {currentTab === 'issueTypes' && (
                <IssueTypesTab boardId={boardId} />
              )}
              {currentTab === 'statuses' && <StatusesTab boardId={boardId} />}
              {currentTab === 'versions' && <VersionsTab boardId={boardId} />}
            </div>
          </PaneContent>
        </div>
      </div>
    </Pane>
  );
}
