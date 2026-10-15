'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { Columns3, Copy, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/icon-button';
import { Group } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { MemberRole } from '@/config/enum';
import type { Board } from '@/config/interface';
import { format } from '@/constant/format';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

/** BE trả thêm timestamp cho board; interface FE chưa khai báo nên đọc tùy chọn. */
type BoardWithTimestamps = Board & { updatedAt?: string; createdAt?: string };

interface BoardListProps {
  boards: Board[];
  onDuplicate?: (board: Board) => void;
}

const MANAGER_ROLES: string[] = [
  MemberRole.ADMINISTRATOR,
  MemberRole.PROJECT_MANAGER,
];

/** Ô vuông mã dự án: nền xám, viền trong mảnh, chữ đậm nhỏ (giống ProjectTile ở sidebar nhưng to hơn). */
function BoardTile({ code }: { code: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-fill text-[10px] leading-none font-bold uppercase text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]"
    >
      {code.slice(0, 4)}
    </span>
  );
}

function BoardRow({
  board,
  index,
  first,
  onDuplicate,
}: {
  board: BoardWithTimestamps;
  index: number;
  first: boolean;
  onDuplicate?: (board: Board) => void;
}) {
  const { t, i18n } = useTranslation();
  const href = `/project/${board.id}/issues`;
  const lang = i18n.language === 'vi' ? 'vi' : 'en';
  const updatedAt = board.updatedAt ?? board.createdAt;
  const memberCount = board.members?.length ?? 0;
  const columnCount = board.columns?.length ?? 0;

  return (
    <div
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        'group relative flex min-h-16 items-center gap-3 px-3 py-2.5 pr-3 transition-colors duration-200 ease-soft hover:bg-hover animate-rise md:gap-4 md:pl-[14px]',
        !first && 'border-t border-line'
      )}
    >
      <BoardTile code={board.boardCode} />

      <div className="min-w-0 flex-1">
        {/* Link ở tên dự án phủ toàn hàng bằng ::after (giữ được mở tab mới);
            nút nhân bản nổi lên trên bằng z-index. */}
        <Link
          href={href}
          className="block truncate text-[15px] leading-tight font-semibold text-ink transition-colors duration-200 after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
        >
          {board.title}
        </Link>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {board.description || t('dashboard.boardCard.noDescription')}
        </p>
      </div>

      {/* Cột phụ: ẩn dần khi hẹp, không bao giờ cuộn ngang */}
      <span className="hidden flex-none md:inline-flex">
        <Tag tone={board.type === 'PRIVATE' ? 'neutral' : 'accent'}>
          {t(`dashboard.boardType.${board.type}`, {
            defaultValue: board.type,
          })}
        </Tag>
      </span>

      <span
        className="hidden w-[92px] flex-none items-center gap-1.5 text-[12.5px] text-muted tabular-nums lg:inline-flex"
        title={t('dashboard.boardCard.memberCount', { count: memberCount })}
      >
        <Users aria-hidden="true" className="size-[15px] text-faint" />
        {t('dashboard.boardCard.memberCount', { count: memberCount })}
      </span>

      <span
        className="hidden w-[84px] flex-none items-center gap-1.5 text-[12.5px] text-muted tabular-nums xl:inline-flex"
        title={t('dashboard.boardCard.columnCount', { count: columnCount })}
      >
        <Columns3 aria-hidden="true" className="size-[15px] text-faint" />
        {t('dashboard.boardCard.columnCount', { count: columnCount })}
      </span>

      {updatedAt && (
        <time
          dateTime={updatedAt}
          title={format.dateTime(updatedAt)}
          className="hidden w-[92px] flex-none text-right text-[12.5px] text-muted tabular-nums md:block"
        >
          {dayjs(updatedAt).locale(lang).fromNow()}
        </time>
      )}

      {onDuplicate && (
        <IconButton
          size="sm"
          aria-label={t('dashboard.boardCard.duplicateAction')}
          onClick={e => {
            e.stopPropagation();
            onDuplicate(board);
          }}
          className="relative z-[1] -mr-1 text-muted focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        >
          <Copy aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}

/**
 * Danh sách dự án kiểu Settings: một thẻ trắng cho mỗi nhóm, các hàng cách
 * nhau bằng hairline. Nhóm theo vai trò của người dùng hiện tại (quản lý /
 * tham gia); khi chỉ có một nhóm thì gọi là "Tất cả dự án".
 */
export default function BoardList({ boards, onDuplicate }: BoardListProps) {
  const { t } = useTranslation();
  const currentUser = useAppSelector(selectCurrentUser);

  const groups = useMemo(() => {
    const managed: Board[] = [];
    const member: Board[] = [];
    for (const board of boards) {
      const mine = currentUser
        ? board.members?.find(m => m.userId === currentUser.id)
        : undefined;
      if (mine && MANAGER_ROLES.includes(mine.role)) managed.push(board);
      else member.push(board);
    }
    if (managed.length === 0 || member.length === 0) {
      return [{ key: 'all', title: t('dashboard.groups.all'), items: boards }];
    }
    return [
      { key: 'managed', title: t('dashboard.groups.managed'), items: managed },
      { key: 'member', title: t('dashboard.groups.member'), items: member },
    ];
  }, [boards, currentUser, t]);

  if (boards.length === 0) {
    return null;
  }

  let runningIndex = 0;

  return (
    <div className="flex flex-col gap-6">
      {groups.map(group => (
        <Group key={group.key} title={group.title}>
          {group.items.map((board, i) => (
            <BoardRow
              key={board.id}
              board={board}
              index={runningIndex++}
              first={i === 0}
              onDuplicate={onDuplicate}
            />
          ))}
        </Group>
      ))}
    </div>
  );
}
