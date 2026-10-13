'use client';

import { useMemo } from 'react';
import { Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';
import { TableSkeleton } from '@/components/ui/skeletons';
import { useIsMobile } from '@/components/ui/use-mobile';
import { NotificationChannel, NotificationType } from '@/config/enum';
import {
  preferenceKey,
  useNotificationPreferences,
} from '@/hooks/use-notification-preferences';

// Thứ tự khai báo enum = thứ tự README 4.1 → không cần hằng riêng
const TYPES = Object.values(NotificationType);
const CHANNELS = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

const SWITCH_CLASS =
  '[&.ant-switch-checked]:bg-theme-main! [&.ant-switch-checked:hover:not(.ant-switch-disabled)]:bg-theme-hover!';

export function NotificationsTab() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const {
    preferencesData,
    isPreferencesLoading,
    preferencesError,
    refetchPreferences,
    togglePreference,
    saveError,
  } = useNotificationPreferences();

  // Map "TYPE:CHANNEL" → enabled; cặp không có trong response (vd BOARD_INVITED:EMAIL) = không áp dụng
  const enabledByKey = useMemo(
    () =>
      new Map(
        (preferencesData?.items ?? []).map(i => [
          preferenceKey(i.type, i.channel),
          i.enabled,
        ])
      ),
    [preferencesData]
  );

  const typeLabel = (type: NotificationType) =>
    t(`settings.notifications.type.${type}`);
  const channelLabel = (channel: NotificationChannel) =>
    t(`settings.notifications.channel.${channel}`);

  const renderCell = (type: NotificationType, channel: NotificationChannel) => {
    const enabled = enabledByKey.get(preferenceKey(type, channel));
    if (enabled === undefined) {
      return (
        <span className="text-xs text-theme-neutral-7">
          {t('settings.notifications.notAvailable')}
        </span>
      );
    }
    return (
      <Switch
        size="small"
        checked={enabled}
        onChange={checked => togglePreference(type, channel, checked)}
        aria-label={`${typeLabel(type)} – ${channelLabel(channel)}`}
        className={SWITCH_CLASS}
      />
    );
  };

  if (isPreferencesLoading) {
    return <TableSkeleton rows={TYPES.length} cols={3} />;
  }

  // Lỗi (500, mạng, 410 refresh thất bại...) → KHÔNG render Switch với trạng thái đoán
  if (preferencesError || !preferencesData) {
    return (
      <div className="space-y-4">
        <StateMessage tone="danger" i18nKey="common.errorLoadingData" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-theme-neutral-5 text-theme-neutral-9"
          onClick={() => void refetchPreferences()}
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-theme-neutral-11">
          {t('settings.notifications.title')}
        </h2>
        <p className="text-sm text-theme-neutral-8">
          {t('settings.notifications.description')}
        </p>
      </div>

      {saveError && (
        <StateMessage
          tone="danger"
          i18nKey="settings.notifications.toast.failed"
        />
      )}

      {isMobile ? (
        <ul className="space-y-3">
          {TYPES.map(type => (
            <li
              key={type}
              className="rounded-lg border border-theme-neutral-4 bg-theme-neutral-1 p-4"
            >
              <p className="mb-3 text-sm font-medium text-theme-neutral-11">
                {typeLabel(type)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map(channel => (
                  <div
                    key={channel}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-theme-neutral-8">
                      {channelLabel(channel)}
                    </span>
                    {renderCell(type, channel)}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-theme-neutral-4 text-left text-xs font-semibold uppercase tracking-wide text-theme-neutral-7">
              <th className="py-2 pr-4">{t('notifications.title')}</th>
              {CHANNELS.map(channel => (
                <th key={channel} className="w-36 py-2 text-center">
                  {channelLabel(channel)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map(type => (
              <tr
                key={type}
                className="border-b border-theme-neutral-3 last:border-0"
              >
                <td className="py-3 pr-4 text-theme-neutral-11">
                  {typeLabel(type)}
                </td>
                {CHANNELS.map(channel => (
                  <td key={channel} className="py-3 text-center">
                    {renderCell(type, channel)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
