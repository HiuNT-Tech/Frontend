'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Dropdown, type MenuProps } from 'antd';
import {
  Bell,
  Check,
  ChevronUp,
  Globe,
  LogOut,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { UserAvatar } from '@/components/ui/user-avatar';
import { IconButton } from '@/components/ui/icon-button';
import { useTheme } from '@/components/providers/theme-provider';

export const SUPPORTED_LANGS = ['vi', 'en'] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

const isLang = (value: string | null): value is Lang =>
  !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);

/** Ngôn ngữ đi theo tham số `?lang=` trên URL (giữ hành vi cũ của header). */
export function useLanguage() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const langFromUrl = searchParams.get('lang');

  const current: Lang = isLang(langFromUrl)
    ? langFromUrl
    : i18n.language === 'vi'
      ? 'vi'
      : 'en';

  const change = (lng: Lang) => {
    i18n.changeLanguage(lng);
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', lng);
    router.push(`${pathname}?${params.toString()}`);
  };

  return { current, change };
}

/** Đồng bộ i18n với `?lang=` khi mở link có sẵn tham số. */
export function LanguageSync() {
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();

  useEffect(() => {
    const langFromUrl = searchParams.get('lang');
    if (isLang(langFromUrl) && i18n.language !== langFromUrl) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [searchParams, i18n]);

  return null;
}

/** Nút mặt trăng / mặt trời: đổi sáng ↔ tối, nhớ trong trình duyệt. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';
  return (
    <IconButton
      aria-label={isDark ? t('shell.switchToLight') : t('shell.switchToDark')}
      onClick={toggle}
    >
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  );
}

const MENU_ICON = 'size-4 text-muted';

/** Tài khoản ở chân sidebar: avatar + tên, mở menu lên trên. */
export function AccountMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const { logout } = useAuth();
  const user = useAppSelector(selectCurrentUser);
  const language = useLanguage();

  const items: MenuProps['items'] = [
    {
      key: 'personalSettings',
      icon: <UserRound className={MENU_ICON} />,
      label: t('appBar.userMenu.personalSettings'),
    },
    {
      key: 'notifications',
      icon: <Bell className={MENU_ICON} />,
      label: t('shell.nav.notifications'),
    },
    {
      key: 'language',
      icon: <Globe className={MENU_ICON} />,
      label: t('shell.language'),
      children: SUPPORTED_LANGS.map(lng => ({
        key: `lang:${lng}`,
        label: (
          <span className="flex items-center justify-between gap-6">
            {t(`shell.languages.${lng}`)}
            {language.current === lng && (
              <Check className="size-4 text-accent" />
            )}
          </span>
        ),
      })),
    },
    { type: 'divider' },
    {
      key: 'logout',
      danger: true,
      icon: <LogOut className="size-4" />,
      label: t('appBar.userMenu.logout'),
    },
  ];

  const onClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'personalSettings') router.push('/settings');
    else if (key === 'notifications') router.push('/notifications');
    else if (key.startsWith('lang:')) {
      language.change(key.slice(5) as Lang);
    } else if (key === 'logout') await logout();
  };

  const name = user?.displayName || user?.email || t('shell.account');

  return (
    <Dropdown menu={{ items, onClick }} trigger={['click']} placement="topLeft">
      <button
        type="button"
        aria-label={t('shell.account')}
        className="press group flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors hover:bg-hover aria-expanded:bg-hover"
      >
        <UserAvatar name={name} src={user?.avatar} size={30} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold text-ink">
            {name}
          </span>
          {user?.email && (
            <span className="block truncate text-xs text-muted">
              {user.email}
            </span>
          )}
        </span>
        <ChevronUp
          aria-hidden="true"
          className="size-4 flex-none rotate-180 text-muted transition-transform duration-300 ease-soft group-aria-expanded:rotate-0"
        />
      </button>
    </Dropdown>
  );
}
