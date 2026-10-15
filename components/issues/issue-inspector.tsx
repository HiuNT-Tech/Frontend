'use client';

import { createContext, useContext } from 'react';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface IssueInspectorContextValue {
  /** Đóng inspector (về danh sách / board) */
  close: () => void;
  /** true khi inspector đang phủ lên nội dung (màn hẹp) thay vì đứng thành cột */
  overlay: boolean;
  /** true khi issue mở thành trang riêng toàn pane (bấm vào mã ticket, `?view=full`) */
  fullPage: boolean;
}

/** Tham số URL bật chế độ trang riêng cho chi tiết issue. */
export const FULL_VIEW_PARAM = 'view';
export const FULL_VIEW_VALUE = 'full';

/** Link mở issue thành trang riêng (dùng cho mã ticket). */
export const issueFullPageHref = (
  boardId: string | number,
  cardId: string | number
) =>
  `/project/${boardId}/issues/${cardId}?${FULL_VIEW_PARAM}=${FULL_VIEW_VALUE}`;

/** Lớp cho mã ticket dạng link: gạch chân + đổi màu khi rê chuột. */
export const ISSUE_KEY_LINK_CLASS =
  'rounded-[4px] text-muted underline-offset-2 transition-colors duration-150 hover:text-accent hover:underline focus-visible:text-accent focus-visible:underline';

export const IssueInspectorContext =
  createContext<IssueInspectorContextValue | null>(null);

/** Trang chi tiết issue dùng để biết mình đang nằm trong inspector và cách đóng nó. */
export const useIssueInspector = () => useContext(IssueInspectorContext);

/** Cột phải khi chưa chọn issue nào. */
export function IssueNoSelection() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in grid flex-1 place-items-center p-6 text-center">
      <div className="max-w-[280px] text-sm text-muted">
        <Inbox
          aria-hidden="true"
          strokeWidth={1.5}
          className="mx-auto mb-3 size-10 text-line-strong"
        />
        <b className="mb-1 block text-base font-semibold text-ink">
          {t('shell.noSelection.title')}
        </b>
        {t('shell.noSelection.description')}
      </div>
    </div>
  );
}
