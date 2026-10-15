'use client';

import { useTranslation } from 'react-i18next';

/** Khung xương board: vài cột mờ với thẻ trống, giữ đúng bố cục khi đang tải. */
export function BoardSkeleton() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-label={t('board.loading')}
      className="flex h-full min-h-0 items-start gap-3.5 overflow-hidden px-4 pt-4 pb-5 lg:px-5"
    >
      {[3, 2, 1, 2].map((cards, column) => (
        <div
          key={column}
          className="flex w-[288px] flex-none flex-col gap-2 rounded-card bg-track p-2"
        >
          <div className="skel mx-1 my-2 h-4 w-28" />
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="skel h-[92px] rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
