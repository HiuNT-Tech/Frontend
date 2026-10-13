'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useState } from 'react';
import Images from '@/assets';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const getMenuItems = (boardId?: string) => [
  {
    titleKey: 'sidebar.home',
    icon: Images.IconHome,
    href: boardId ? `/project/${boardId}` : '/dashboard',
    // href là tiền tố của mọi mục còn lại (/project/:id/issues, /board, ...)
    // nên phải so khớp chính xác, không thì Home sẽ "active" trên mọi trang con.
    exact: true,
  },
  {
    titleKey: 'sidebar.addIssue',
    icon: Images.IconCreate,
    href: boardId ? `/project/${boardId}/add-issue` : '/add-issue',
  },
  {
    titleKey: 'sidebar.issue',
    icon: Images.IconList,
    href: boardId ? `/project/${boardId}/issues` : '/issues',
  },
  {
    titleKey: 'sidebar.board',
    icon: Images.IconBoard,
    href: boardId ? `/project/${boardId}/board` : '/board',
  },
  {
    titleKey: 'sidebar.settings',
    icon: Images.IconSetting,
    href: boardId ? `/project/${boardId}/settings` : '/settings',
  },
];

const isPathActive = (
  href: string,
  currentPath: string,
  exact?: boolean
): boolean => {
  const normalizedHref = href.split('?')[0].split('#')[0];

  if (href.startsWith('#')) {
    return currentPath === href;
  }

  if (normalizedHref.startsWith('/')) {
    if (exact) return currentPath === normalizedHref;

    return (
      currentPath === normalizedHref ||
      currentPath.startsWith(normalizedHref + '/')
    );
  }

  return currentPath === normalizedHref;
};

const RowItem = ({
  item,
  isCollapsed,
}: {
  item: {
    titleKey: string;
    icon: string;
    href: string;
    exact?: boolean;
  };
  isCollapsed: boolean;
}) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isActive = isPathActive(item.href, pathname, item.exact);
  const router = useRouter();

  const handleRedirectLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    router.push(href);
  };

  const getFilterIcon = () => {
    if (isActive) {
      return 'var(--theme-filter-main)';
    }
    return 'brightness(0) invert(1)';
  };

  const getRowItemClassName = () => {
    if (isActive) {
      return 'border border-white/70 bg-white text-theme-neutral-11 shadow-[0_8px_20px_rgba(0,0,0,0.08)]';
    }
    return 'text-theme-neutral-1/90 hover:bg-white/12';
  };

  const linkContent = (
    <Link
      key={item.href}
      href={item.href}
      onClick={e => handleRedirectLink(e, item.href)}
      className={cn(
        'relative flex items-center text-sm font-medium rounded-xl transition-all duration-200',
        isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3',
        getRowItemClassName()
      )}
    >
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-theme-main" />
      )}
      <Image
        src={item.icon}
        alt={item.titleKey}
        className={cn('h-5 w-5 flex-shrink-0', !isCollapsed && 'mr-3')}
        width={20}
        height={20}
        style={{
          filter: getFilterIcon(),
        }}
      />
      {!isCollapsed && (
        <span className="truncate transition-opacity duration-200">
          {t(item.titleKey)}
        </span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          {t(item.titleKey)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
};

export function Sidebar(
  { inline = true }: { inline?: boolean } = { inline: true }
) {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const searchParams = useSearchParams();
  const params = useParams();

  // Get boardId from params (dynamic route) or URL (supports both ?id= and ?boardId= patterns)
  const boardId =
    (params?.projectId as string) ||
    (params?.id as string) ||
    searchParams.get('boardId') ||
    searchParams.get('id') ||
    undefined;
  const menuItems = getMenuItems(boardId);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex-shrink-0 bg-theme-main border-r border-theme-main-5/40 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-50',
          inline ? 'hidden md:block' : 'block'
        )}
      >
        {/* Header with title and collapse button */}
        <div
          className={cn(
            'flex items-center justify-end px-4 py-3',
            isCollapsed && 'justify-center'
          )}
        >
          {!isCollapsed && (
            <>
              <Button
                size="sm"
                onClick={toggleCollapse}
                className="-mr-4 py-2 px-1 h-auto hover:bg-theme-hover/80 transition-all duration-200 rounded-l-lg rounded-r-none"
              >
                <Image
                  src={Images.IconArrowCollapseSidebar}
                  alt="Toggle sidebar"
                  width={24}
                  height={24}
                  className={'transition-transform duration-200'}
                />
              </Button>
            </>
          )}
          {isCollapsed && (
            <Button
              size="sm"
              onClick={toggleCollapse}
              className="p-2 h-auto hover:bg-theme-hover/80 transition-all duration-200 border border-theme-neutral-1/60"
            >
              <Image
                src={Images.IconCollapsedSidebar}
                alt="Toggle sidebar"
                width={16}
                height={16}
                className={'transition-transform duration-200'}
              />
            </Button>
          )}
        </div>

        {/* Main menu section */}
        <div
          className={cn(
            'px-3 pb-4 transition-all duration-200',
            isCollapsed && 'px-2'
          )}
        >
          {isCollapsed && (
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="h-[1px] bg-gray-200 w-full"></div>
            </div>
          )}
          <nav className="space-y-2.5">
            {menuItems.map(item => (
              <RowItem key={item.href} item={item} isCollapsed={isCollapsed} />
            ))}
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}
