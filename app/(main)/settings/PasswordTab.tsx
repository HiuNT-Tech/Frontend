'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Group } from '@/components/ui/surface';
import { useMe } from '@/hooks/use-me';
import {
  changePasswordFormSchema,
  type ChangePasswordFormData,
} from '@/validation/settings-form-schemas';

export function PasswordTab() {
  const { t } = useTranslation();
  const { changePassword, isChangePasswordPending } = useMe();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(
      changePasswordFormSchema
    ) as Resolver<ChangePasswordFormData>,
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const getFieldError = (
    field: keyof ChangePasswordFormData
  ): string | undefined => {
    const msg = errors[field]?.message;
    return typeof msg === 'string' ? msg : undefined;
  };

  const onSubmit = async (data: ChangePasswordFormData) => {
    await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      autoComplete="off"
      noValidate
      className="space-y-5"
    >
      <Group
        title={t('accountSettings.password.heading')}
        hint={t('validation.passwordRule')}
      >
        <div className="px-[18px] py-4">
          <Input
            type="password"
            label={t('accountSettings.password.currentPasswordLabel')}
            requiredIndicator
            error={getFieldError('currentPassword')}
            {...register('currentPassword')}
            disabled={isChangePasswordPending}
            autoComplete="current-password"
          />
        </div>
        <div className="grid gap-4 border-t border-line px-[18px] py-4 sm:grid-cols-2">
          <Input
            type="password"
            label={t('accountSettings.password.newPasswordLabel')}
            requiredIndicator
            error={getFieldError('newPassword')}
            {...register('newPassword')}
            disabled={isChangePasswordPending}
            autoComplete="new-password"
          />
          <Input
            type="password"
            label={t('accountSettings.password.confirmPasswordLabel')}
            requiredIndicator
            error={getFieldError('confirmPassword')}
            {...register('confirmPassword')}
            disabled={isChangePasswordPending}
            autoComplete="new-password"
          />
        </div>
      </Group>

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={isChangePasswordPending}
        >
          {t('accountSettings.password.save')}
        </Button>
      </div>
    </form>
  );
}
