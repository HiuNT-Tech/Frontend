'use client';

import type React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ColorDot, ColorTag, colorTagClass } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import type { Card, User, UserBoardMember } from '@/config/interface';

type Assignee = Pick<User, 'displayName' | 'avatar'> | UserBoardMember;

/** Đường kẻ mảnh giữa các hàng trong thẻ (hàng đầu không có). */
const rowLine = (index: number) => index > 0 && 'border-t border-line';

/** Hàng "công việc gần đây": mã · tiêu đề · loại · trạng thái · người làm · tuổi. */
export function ActivityRow({
  issue,
  href,
  assignee,
  age,
  index,
}: {
  issue: Card;
  href: string;
  assignee?: Assignee | null;
  age: string;
  index: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'animate-rise flex min-h-12 items-center gap-3 px-[18px] py-3 text-ink transition-colors duration-200 ease-soft hover:bg-hover',
        rowLine(index)
      )}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <ColorDot color={issue.column?.statusColor} />
      <span className="min-w-[58px] shrink-0 text-[12.5px] leading-none font-medium text-muted tabular-nums">
        {issue.cardCode ?? '—'}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm leading-[1.4] font-medium">
        {issue.title}
      </span>
      {issue.issueType && (
        <ColorTag
          color={issue.issueType.statusColor}
          dot={false}
          className="hidden shrink-0 md:inline-flex"
        >
          {issue.issueType.name}
        </ColorTag>
      )}
      {issue.column && (
        <ColorTag color={issue.column.statusColor} className="shrink-0">
          {issue.column.title}
        </ColorTag>
      )}
      {assignee && (
        <span title={assignee.displayName} className="flex shrink-0">
          <UserAvatar
            name={assignee.displayName}
            src={assignee.avatar}
            size={24}
          />
        </span>
      )}
      <span className="min-w-7 shrink-0 text-right text-[12.5px] leading-none text-muted tabular-nums">
        {age}
      </span>
    </Link>
  );
}

/** Hàng ngắn ở cột phải: chấm trạng thái · tiêu đề · người làm. */
export function CompactIssueRow({
  issue,
  href,
  statusColor,
  assignee,
  index,
}: {
  issue: Card;
  href: string;
  statusColor?: string | null;
  assignee?: Assignee | null;
  index: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[46px] items-center gap-2.5 px-4 py-[11px] text-ink transition-colors duration-200 ease-soft hover:bg-hover',
        rowLine(index)
      )}
    >
      <ColorDot color={statusColor} className="size-[7px]" />
      <span className="min-w-0 flex-1 truncate text-[13.5px] leading-[1.35] font-medium">
        {issue.title}
      </span>
      {assignee && (
        <span title={assignee.displayName} className="flex shrink-0">
          <UserAvatar
            name={assignee.displayName}
            src={assignee.avatar}
            size={22}
          />
        </span>
      )}
    </Link>
  );
}

/** Hàng thành viên: ảnh · tên · "{open} đang mở · {inProgress} đang làm" · thanh tỉ lệ. */
export function MemberRow({
  member,
  open,
  inProgress,
  inProgressColor,
  index,
}: {
  member: UserBoardMember;
  open: number;
  inProgress: number;
  /** statusColor của cột "đang làm" — tô thanh tỉ lệ */
  inProgressColor?: string | null;
  index: number;
}) {
  const { t } = useTranslation();
  const share = open ? (inProgress / open) * 100 : 0;

  return (
    <div
      className={cn(
        'flex min-h-[52px] items-center gap-[11px] px-4 py-2.5',
        rowLine(index)
      )}
    >
      <UserAvatar name={member.displayName} src={member.avatar} size={30} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm leading-[1.25] font-semibold text-ink">
          {member.displayName}
        </div>
        <div className="text-[12.5px] leading-[1.3] text-muted tabular-nums">
          {t('projectHome.openInProgress', { open, inProgress })}
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(share)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('projectHome.teamShare', { inProgress, open })}
        title={t('projectHome.teamShare', { inProgress, open })}
        className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-fill"
      >
        <div
          className={cn(
            'tag-dot h-full rounded-full transition-[width] duration-500 ease-soft',
            colorTagClass(inProgressColor)
          )}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}

const quickLinkClass = (index: number) =>
  cn(
    'press flex min-h-12 w-full items-center gap-[11px] pr-3.5 pl-4 text-left text-sm leading-none font-medium text-ink transition-colors duration-200 ease-soft hover:bg-hover',
    rowLine(index)
  );

/** Hàng liên kết nhanh: icon · nhãn · chevron. Có `href` thì là Link, không thì là button. */
export function QuickLinkRow({
  icon,
  label,
  href,
  onClick,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  index: number;
}) {
  const body = (
    <>
      <span className="grid text-muted [&_svg]:size-[17px]">{icon}</span>
      {label}
      <ChevronRight
        aria-hidden="true"
        className="ml-auto size-3.5 text-faint"
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={quickLinkClass(index)}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={quickLinkClass(index)}>
      {body}
    </button>
  );
}
