'use client';

import type React from 'react';

/** Đầu mỗi mục cài đặt: tiêu đề + một câu muted bên trái, hành động chính bên phải. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-[1_1_18em]">
        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-balance text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-[60ch] text-sm text-muted">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-none items-center">{action}</div>}
    </div>
  );
}
