'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/use-media-query';
import {
  FULL_VIEW_PARAM,
  FULL_VIEW_VALUE,
  IssueInspectorContext,
} from './issue-inspector';
import { IssuesListPane } from './issues-list-pane';
import { useIssuesListMode } from './issue-view-switcher';

/**
 * Màn Issues kiểu Mail: danh sách ở giữa │ chi tiết issue ở cột phải.
 * - ≥ 1280px: inspector là một cột cố định (hiện "chưa chọn" khi trống).
 * - < 1280px (iPad): inspector trượt ra phủ lên danh sách khi mở một issue.
 * URL vẫn là /project/:id/issues/:issueId nên link thông báo, AI… không đổi.
 */
export function IssuesWorkspace({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ projectId: string; id?: string }>();
  const isWide = useMediaQuery(BREAKPOINTS.wide);
  const [mode] = useIssuesListMode();
  const searchParams = useSearchParams();
  const hasDetail = Boolean(params?.id);
  // Bấm vào mã ticket → issue chiếm trọn pane (trang riêng), không còn danh sách bên cạnh.
  const fullPage =
    hasDetail && searchParams.get(FULL_VIEW_PARAM) === FULL_VIEW_VALUE;
  // Table: bảng rộng nên chiếm hết pane khi chưa chọn issue; cột chi tiết chỉ hiện khi đã chọn.
  // List: luôn giữ cột phải (hiện "chưa chọn issue") như thiết kế kiểu Mail.
  const showColumn = isWide && (hasDetail || mode !== 'table');

  const close = useCallback(() => {
    router.push(`/project/${params.projectId}/issues`);
  }, [router, params.projectId]);

  // Esc đóng inspector (trừ khi đang có hộp thoại phía trên)
  useEffect(() => {
    if (!hasDetail) return;
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
  }, [hasDetail, close]);

  const inspector = useMemo(
    () => ({ close, overlay: !isWide && !fullPage, fullPage }),
    [close, isWide, fullPage]
  );

  if (fullPage) {
    return (
      <IssueInspectorContext.Provider value={inspector}>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </IssueInspectorContext.Provider>
    );
  }

  return (
    <IssueInspectorContext.Provider value={inspector}>
      <div className="relative flex min-h-0 flex-1">
        <IssuesListPane selectedId={params?.id} />

        {showColumn ? (
          <aside
            aria-label={t('pageTitle.issueDetail')}
            className="flex w-[420px] flex-none flex-col overflow-hidden border-l border-line bg-bg 2xl:w-[480px]"
          >
            {children}
          </aside>
        ) : (
          !isWide &&
          hasDetail && (
            <>
              <div
                aria-hidden="true"
                onClick={close}
                className="animate-fade-in absolute inset-0 z-20 bg-backdrop/40"
              />
              <aside
                aria-label={t('pageTitle.issueDetail')}
                className="animate-slide-in-right absolute inset-y-0 right-0 z-30 flex w-[min(520px,100%)] flex-col overflow-hidden border-l border-line bg-bg shadow-lift"
              >
                {children}
              </aside>
            </>
          )
        )}
      </div>
    </IssueInspectorContext.Provider>
  );
}
