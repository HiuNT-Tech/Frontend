'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Pane, PaneContent } from '@/components/layout/pane';
import { Segmented } from '@/components/ui/segmented';
import { replaceWithUpdatedSearchParams } from '@/lib/url';
import { ProfileTab } from './ProfileTab';
import { PasswordTab } from './PasswordTab';
import { NotificationsTab } from './NotificationsTab';

type AccountTab = 'profile' | 'password' | 'notifications';
const TABS: AccountTab[] = ['profile', 'password', 'notifications'];

const toTab = (value: string | null): AccountTab =>
  TABS.includes(value as AccountTab) ? (value as AccountTab) : 'profile';

export default function AccountSettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = toTab(searchParams.get('tab'));

  const handleTabChange = (key: AccountTab) => {
    replaceWithUpdatedSearchParams(router, pathname, searchParams, params => {
      params.set('tab', key);
    });
  };

  return (
    <Pane
      title={t('accountSettings.title')}
      center={
        <Segmented<AccountTab>
          label={t('accountSettings.title')}
          value={currentTab}
          onChange={handleTabChange}
          className="w-full max-w-[420px]"
          options={TABS.map(key => ({
            value: key,
            label: t(`accountSettings.tabs.${key}`),
          }))}
        />
      }
    >
      <PaneContent width="narrow">
        <div key={currentTab} role="tabpanel" className="animate-view-in">
          {currentTab === 'profile' && <ProfileTab />}
          {currentTab === 'password' && <PasswordTab />}
          {currentTab === 'notifications' && <NotificationsTab />}
        </div>
      </PaneContent>
    </Pane>
  );
}
