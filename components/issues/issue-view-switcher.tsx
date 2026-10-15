'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { KanbanSquare, List, Table2 } from 'lucide-react';
import { Segmented } from '@/components/ui/segmented';

/** Chế độ hiển thị trong pane Issues (lưu ở localStorage); board là route riêng. */
export type IssuesListMode = 'list' | 'table';
type View = IssuesListMode | 'board';

const MODE_STORAGE_KEY = 'issues.viewMode';

const readMode = (): IssuesListMode => {
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    return saved === 'table' ? 'table' : 'list';
  } catch {
    return 'list';
  }
};

// Store nhỏ dùng chung: pane và layout (cột inspector) cùng đọc một chế độ.
const listeners = new Set<() => void>();
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};

const writeMode = (mode: IssuesListMode) => {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* chế độ riêng tư: chỉ giữ trong phiên */
  }
  listeners.forEach(listener => listener());
};

/** List / Table của pane Issues, nhớ lựa chọn trong trình duyệt (mặc định List). */
export function useIssuesListMode(): [
  IssuesListMode,
  (mode: IssuesListMode) => void,
] {
  // Server không biết localStorage → snapshot server luôn là 'list' (không lệch hydration).
  const mode = useSyncExternalStore<IssuesListMode>(
    subscribe,
    readMode,
    () => 'list'
  );
  const setMode = useCallback((next: IssuesListMode) => writeMode(next), []);
  return [mode, setMode];
}

/**
 * Segmented control trên toolbar: List · Table · Board.
 * List/Table là chế độ cục bộ của pane Issues; Board là route riêng nên link cũ vẫn dùng được.
 * Không truyền `mode` (vd. trên trang Board) thì chọn List/Table sẽ điều hướng về /issues
 * với chế độ đó.
 */
export function IssueViewSwitcher({
  mode,
  onModeChange,
}: {
  mode?: IssuesListMode;
  onModeChange?: (mode: IssuesListMode) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const params = useParams<{ projectId: string }>();
  const onBoard = /\/board(\/|$)/.test(pathname);
  const value: View = onBoard ? 'board' : (mode ?? 'list');

  return (
    <Segmented<View>
      label={t('shell.views.label')}
      onCanvas
      value={value}
      onChange={next => {
        if (next === value) return;
        if (next === 'board') {
          router.push(`/project/${params.projectId}/board`);
          return;
        }
        if (onBoard || !onModeChange) {
          writeMode(next);
          router.push(`/project/${params.projectId}/issues`);
          return;
        }
        onModeChange(next);
      }}
      options={[
        { value: 'list', label: t('shell.views.list'), icon: <List /> },
        { value: 'table', label: t('shell.views.table'), icon: <Table2 /> },
        {
          value: 'board',
          label: t('shell.views.board'),
          icon: <KanbanSquare />,
        },
      ]}
      className="min-w-[276px]"
    />
  );
}
