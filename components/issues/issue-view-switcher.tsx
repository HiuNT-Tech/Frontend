'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ChartGantt, KanbanSquare, Table2 } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';

/** Ba cách nhìn cùng một tập issue, mỗi cách là một route riêng nên link cũ vẫn dùng được. */
type View = 'issues' | 'board' | 'gantt';

const VIEW_PATHS: Record<View, string> = {
  issues: 'issues',
  board: 'board',
  gantt: 'gantt',
};

const viewFromPathname = (pathname: string): View => {
  if (/\/board(\/|$)/.test(pathname)) return 'board';
  if (/\/gantt(\/|$)/.test(pathname)) return 'gantt';
  return 'issues';
};

/** Segmented control trên toolbar: Table · Board · Gantt. */
export function IssueViewSwitcher() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useParams<{ projectId: string }>();
  const value = viewFromPathname(pathname);

  return (
    <Segmented<View>
      label={t('shell.views.label')}
      onCanvas
      value={value}
      onChange={next => {
        if (next === value) return;
        router.push(`/project/${params.projectId}/${VIEW_PATHS[next]}`);
      }}
      options={[
        { value: 'issues', label: t('shell.views.table'), icon: <Table2 /> },
        {
          value: 'board',
          label: t('shell.views.board'),
          icon: <KanbanSquare />,
        },
        { value: 'gantt', label: t('shell.views.gantt'), icon: <ChartGantt /> },
      ]}
      className="min-w-[276px]"
    />
  );
}
