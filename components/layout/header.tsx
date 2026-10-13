'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Images from '@/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dropdown, type MenuProps, Select } from 'antd';
import { Title } from '@/components/ui/title';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ProjectsDropdown } from '@/components/layout/projects-dropdown';
import { AiTriggerButton } from '@/components/ai-assistant/ai-trigger-button';
import { NotificationBell } from '@/components/layout/notification-bell';

const LANGUAGE_OPTIONS = [
  {
    value: 'vi',
    label: (
      <div className="flex justify-center items-center gap-2">
        <Image
          src={Images.FlagVN}
          alt="flag"
          width={18}
          height={18}
          className="cursor-pointer"
        />
        <span>VI</span>
      </div>
    ),
  },
  {
    value: 'en',
    label: (
      <div className="flex justify-center items-center gap-2">
        <Image
          src={Images.FlagUSA}
          alt="flag"
          width={18}
          height={18}
          className="cursor-pointer"
        />
        <span>EN</span>
      </div>
    ),
  },
];

const SUPPORTED_LANGS = ['vi', 'en'];

export function Header() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const langFromUrl = searchParams.get('lang');
  const currentLang =
    langFromUrl && SUPPORTED_LANGS.includes(langFromUrl)
      ? langFromUrl
      : i18n.language === 'vi'
        ? 'vi'
        : 'en';

  useEffect(() => {
    const langFromUrl = searchParams.get('lang');
    if (
      langFromUrl &&
      SUPPORTED_LANGS.includes(langFromUrl) &&
      i18n.language !== langFromUrl
    ) {
      i18n.changeLanguage(langFromUrl);
    }
  }, [searchParams, i18n]);

  const handleChangeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', lng);

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleUserMenuClick: MenuProps['onClick'] = async ({ key }) => {
    if (key === 'personalSettings') {
      router.push('/settings');
    }
    if (key === 'logout') {
      await logout();
    }
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'personalSettings',
      label: t('appBar.userMenu.personalSettings'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: t('appBar.userMenu.logout'),
    },
  ];

  return (
    <div className="bg-theme-header flex justify-between sticky top-0 z-10">
      <div className="flex gap-3 items-center p-3">
        <button className="px-2">
          <Image src={Images.IconDashboard} alt="logo" width={24} height={24} />
        </button>
        <button
          className="cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          <Title>{t('appBar.title.dashboard')}</Title>
        </button>
        <ProjectsDropdown />
      </div>
      <div className="flex gap-5 items-center p-3">
        <Input
          placeholder={t('appBar.placeholder.search')}
          prefixIcon={Images.gray.Search}
        />
        <AiTriggerButton />
        <NotificationBell />
        <div>
          <Select
            className="cursor-pointer z-50 w-23"
            options={LANGUAGE_OPTIONS}
            value={currentLang}
            onChange={value => handleChangeLanguage(value)}
          />
        </div>
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="button"
            className="w-10 h-10 p-0 rounded-full bg-theme-neutral-1 hover:bg-theme-neutral-2 border border-theme-neutral-5 cursor-pointer"
          >
            <Image
              src={Images.defaultAvatar}
              alt="avatar"
              width={24}
              height={24}
            />
          </Button>
        </Dropdown>
      </div>
    </div>
  );
}
