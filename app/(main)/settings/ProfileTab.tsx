'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Group, SettingsRow } from '@/components/ui/surface';
import { ImageUpload } from '@/components/shared/image-upload';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useMe } from '@/hooks/use-me';
import {
  updateProfileFormSchema,
  type UpdateProfileFormData,
} from '@/validation/settings-form-schemas';

/** Khung xương giống bố cục thật: avatar + hai dòng, rồi bốn hàng. */
function ProfileSkeleton() {
  return (
    <div className="rounded-card border border-line bg-card shadow-card">
      <div className="flex items-center gap-4 px-[18px] py-[18px]">
        <div className="skel size-[72px] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skel h-5 w-40" />
          <div className="skel h-3.5 w-56" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-t border-line px-[18px] py-[13px]"
        >
          <div className="skel h-4 w-28" />
          <div className="skel h-9 w-48" />
        </div>
      ))}
    </div>
  );
}

export function ProfileTab() {
  const { t } = useTranslation();
  const {
    profile,
    isProfileLoading,
    updateProfile,
    isUpdateProfilePending,
    uploadAvatar,
  } = useMe();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(
      updateProfileFormSchema
    ) as Resolver<UpdateProfileFormData>,
    defaultValues: { displayName: '', phone: '' },
  });

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName,
        phone: profile.phone ?? '',
      });
    }
  }, [profile, reset]);

  const displayName = watch('displayName');

  const getFieldError = (
    field: keyof UpdateProfileFormData
  ): string | undefined => {
    const msg = errors[field]?.message;
    return typeof msg === 'string' ? msg : undefined;
  };

  const onSubmit = async (data: UpdateProfileFormData) => {
    await updateProfile({
      displayName: data.displayName,
      phone: data.phone || undefined,
    });
  };

  if (isProfileLoading) {
    return <ProfileSkeleton />;
  }

  const joinedOn = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Group
        title={t('accountSettings.profile.heading')}
        hint={t('accountSettings.profile.hint')}
      >
        {/* Khối nhận diện: ảnh + tên + email, không phải một hàng cài đặt */}
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3 px-[18px] py-[18px]">
          <ImageUpload
            value={profile?.avatar}
            onUpload={uploadAvatar}
            size={72}
            alt={displayName || profile?.email || ''}
            fallback={
              <UserAvatar
                name={displayName || profile?.email}
                size={72}
                className="shadow-none"
              />
            }
          />
          <div className="min-w-0 flex-[1_1_14em]">
            <div className="truncate text-lg font-bold tracking-[-0.01em] text-ink">
              {displayName || profile?.displayName || profile?.email}
            </div>
            <div className="mt-1 truncate text-[13px] text-muted">
              {[
                profile?.email,
                joinedOn &&
                  t('accountSettings.profile.joinedOn', { date: joinedOn }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        </div>

        <SettingsRow label={t('accountSettings.profile.emailLabel')}>
          <span className="truncate text-[15px] text-muted">
            {profile?.email ?? ''}
          </span>
        </SettingsRow>

        {profile?.userCode && (
          <SettingsRow label={t('accountSettings.profile.userCodeLabel')}>
            <span className="text-[15px] text-muted tabular-nums">
              {profile.userCode}
            </span>
          </SettingsRow>
        )}

        <SettingsRow label={t('accountSettings.profile.displayNameLabel')}>
          <Input
            aria-label={t('accountSettings.profile.displayNameLabel')}
            placeholder={t('accountSettings.profile.displayNamePlaceholder')}
            error={getFieldError('displayName')}
            {...register('displayName')}
            disabled={isUpdateProfilePending}
            classNameContainer="w-full sm:w-[280px]"
          />
        </SettingsRow>

        <SettingsRow label={t('accountSettings.profile.phoneLabel')}>
          <Input
            type="tel"
            aria-label={t('accountSettings.profile.phoneLabel')}
            placeholder={t('accountSettings.profile.phonePlaceholder')}
            error={getFieldError('phone')}
            {...register('phone')}
            disabled={isUpdateProfilePending}
            classNameContainer="w-full sm:w-[280px]"
          />
        </SettingsRow>
      </Group>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={isUpdateProfilePending}
        >
          {t('accountSettings.profile.save')}
        </Button>
      </div>
    </form>
  );
}
