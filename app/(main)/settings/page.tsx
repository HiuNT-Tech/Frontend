'use client';

import { Tabs } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { replaceWithUpdatedSearchParams } from '@/lib/url';
import { ProfileTab } from './ProfileTab';
import { PasswordTab } from './PasswordTab';
import { NotificationsTab } from './NotificationsTab';

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'profile';

  const handleTabChange = (key: string) => {
    replaceWithUpdatedSearchParams(router, pathname, searchParams, params => {
      params.set('tab', key);
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#f6f7f9]">
      <div className="mx-auto w-full max-w-4xl px-8 py-8">
        <div className="mb-6 rounded-2xl border border-theme-neutral-4 bg-white px-8 py-7 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-theme-neutral-7">
            {t('accountSettings.title')}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-theme-neutral-11">
            {t('accountSettings.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-neutral-8">
            {t('accountSettings.description')}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-theme-neutral-4 bg-theme-neutral-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Tabs
            activeKey={currentTab}
            onChange={handleTabChange}
            items={[
              {
                key: 'profile',
                label: t('accountSettings.tabs.profile'),
                children: <ProfileTab />,
              },
              {
                key: 'password',
                label: t('accountSettings.tabs.password'),
                children: <PasswordTab />,
              },
              {
                key: 'notifications',
                label: t('accountSettings.tabs.notifications'),
                children: <NotificationsTab />,
              },
            ]}
            className="[&_.ant-tabs-nav]:mb-0 [&_.ant-tabs-nav]:border-b [&_.ant-tabs-nav]:border-theme-neutral-4 [&_.ant-tabs-nav]:px-8 [&_.ant-tabs-nav]:pt-3 [&_.ant-tabs-tab]:py-4 [&_.ant-tabs-tab+.ant-tabs-tab]:ml-8 [&_.ant-tabs-tab-btn]:text-sm [&_.ant-tabs-tab-btn]:font-medium [&_.ant-tabs-tab-btn]:text-theme-neutral-8 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-theme-neutral-11 [&_.ant-tabs-ink-bar]:bg-theme-main [&_.ant-tabs-content-holder]:px-8 [&_.ant-tabs-content-holder]:py-6"
          />
        </div>
      </div>
    </div>
  );
}
