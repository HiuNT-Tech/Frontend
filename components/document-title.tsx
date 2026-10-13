'use client';

import { useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentActiveBoard } from '@/redux/activeBoard/activeBoardSlice';

const APP_NAME = 'Backlog';

const PAGE_KEY: Array<[RegExp, string]> = [
  [/^\/dashboard/, 'dashboard'],
  [/^\/settings/, 'account'],
  [/^\/login/, 'login'],
  [/^\/register/, 'register'],
  [/^\/account\/verification/, 'verification'],
  [/^\/invitations\//, 'invitation'],
  [/^\/project\/[^/]+\/add-issue/, 'addIssue'],
  [/^\/project\/[^/]+\/issues\/[^/]+/, 'issueDetail'],
  [/^\/project\/[^/]+\/issues/, 'issues'],
  [/^\/project\/[^/]+\/board/, 'board'],
  [/^\/project\/[^/]+\/settings/, 'projectSettings'],
  [/^\/project\/[^/]+/, 'board'],
];

/**
 * Đặt tiêu đề tab theo trang + ngôn ngữ + tên board, vì toàn bộ page là
 * client component nên không export `metadata` được. Dạng:
 * "Bảng · PIPC Board | Backlog" hoặc "Đăng nhập | Backlog".
 */
export function DocumentTitle() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname() ?? '';
  const params = useParams<{ projectId?: string }>();
  const activeBoard = useAppSelector(selectCurrentActiveBoard);

  const key = PAGE_KEY.find(([pattern]) => pattern.test(pathname))?.[1];
  const boardTitle =
    params?.projectId &&
    activeBoard &&
    String(activeBoard.id) === params.projectId
      ? activeBoard.title
      : undefined;

  useEffect(() => {
    const parts: string[] = [];
    if (key) parts.push(t(`pageTitle.${key}`));
    if (boardTitle) parts.push(boardTitle);
    const title = parts.length
      ? `${parts.join(' · ')} | ${APP_NAME}`
      : APP_NAME;

    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    document.documentElement.lang = i18n.language === 'vi' ? 'vi' : 'en';

    // Next stream <title> của `metadata` xuống SAU nội dung trang nên sẽ đè
    // lên tiêu đề vừa đặt -> theo dõi <head> và đặt lại khi bị ghi đè.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [key, boardTitle, t, i18n.language]);

  return null;
}
