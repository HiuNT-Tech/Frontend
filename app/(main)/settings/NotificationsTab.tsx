'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { StateMessage } from '@/components/ui/state-message';
import { Card, GroupTitle } from '@/components/ui/surface';
import { Switch } from '@/components/ui/switch';
import { NotificationChannel, NotificationType } from '@/config/enum';
import {
  preferenceKey,
  useNotificationPreferences,
} from '@/hooks/use-notification-preferences';
import { cn } from '@/lib/utils';

// Thứ tự khai báo enum = thứ tự README 4.1 → không cần hằng riêng
const TYPES = Object.values(NotificationType);
const CHANNELS = [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

/** Cột kênh: đủ rộng cho công tắc 46px và nhãn "Trong ứng dụng" ở đầu bảng. */
const CHANNEL_COL = 'flex w-[72px] flex-none justify-center sm:w-[92px]';

function NotificationsSkeleton() {
  return (
    <div className="rounded-card border border-line bg-card shadow-card">
      {Array.from({ length: TYPES.length }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 px-[18px] py-[15px]',
            i > 0 && 'border-t border-line'
          )}
        >
          <div className="skel h-4 flex-1 max-w-[220px]" />
          <div className={CHANNEL_COL}>
            <div className="skel h-7 w-[46px] rounded-full" />
          </div>
          <div className={CHANNEL_COL}>
            <div className="skel h-7 w-[46px] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsTab() {
  const { t } = useTranslation();
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
        <span
          className="text-[13px] text-faint"
          title={t('settings.notifications.notAvailable')}
          aria-label={t('settings.notifications.notAvailable')}
        >
          —
        </span>
      );
    }
    return (
      <Switch
        checked={enabled}
        onCheckedChange={checked => togglePreference(type, channel, checked)}
        label={`${typeLabel(type)} – ${channelLabel(channel)}`}
      />
    );
  };

  if (isPreferencesLoading) {
    return (
      <div>
        <GroupTitle>{t('settings.notifications.title')}</GroupTitle>
        <NotificationsSkeleton />
      </div>
    );
  }

  // Lỗi (500, mạng, 410 refresh thất bại...) → KHÔNG render Switch với trạng thái đoán
  if (preferencesError || !preferencesData) {
    return (
      <Card className="flex flex-col items-center gap-3 px-[18px] py-[34px] text-center">
        <StateMessage tone="danger" i18nKey="common.errorLoadingData" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refetchPreferences()}
        >
          {t('common.retry')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="px-1.5 text-sm text-muted">
        {t('settings.notifications.description')}
      </p>

      {saveError && (
        <StateMessage
          tone="danger"
          className="px-1.5"
          i18nKey="settings.notifications.toast.failed"
        />
      )}

      <section>
        {/* tiêu đề nhóm trên nền, nhãn hai kênh canh thẳng trên các công tắc */}
        <div className="flex items-end gap-3 px-1.5 pb-2 text-[13px] font-semibold text-muted">
          <span className="min-w-0 flex-1">
            {t('settings.notifications.title')}
          </span>
          {CHANNELS.map(channel => (
            <span
              key={channel}
              className={cn(CHANNEL_COL, 'text-center leading-tight')}
            >
              {channelLabel(channel)}
            </span>
          ))}
        </div>

        <Card className="overflow-hidden">
          {TYPES.map((type, index) => (
            <div
              key={type}
              className={cn(
                'flex min-h-[54px] items-center gap-3 px-[18px] py-3',
                index > 0 && 'border-t border-line'
              )}
            >
              <span className="min-w-0 flex-1 text-[15px] font-medium text-ink">
                {typeLabel(type)}
              </span>
              {CHANNELS.map(channel => (
                <div key={channel} className={CHANNEL_COL}>
                  {renderCell(type, channel)}
                </div>
              ))}
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
