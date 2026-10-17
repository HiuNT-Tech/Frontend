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
  setPasswordFormSchema,
  type ChangePasswordFormData,
} from '@/validation/settings-form-schemas';

/**
 * Tài khoản tạo bằng Google chưa có mật khẩu: form "Đặt mật khẩu" (không hỏi mật
 * khẩu hiện tại). Có mật khẩu rồi: form "Đổi mật khẩu" như cũ. `key` theo
 * `hasPassword` để form (schema + giá trị) dựng lại khi chuyển chế độ.
 */
export function PasswordTab() {
  const { profile } = useMe();
  // Chưa tải xong hồ sơ: coi như đã có mật khẩu để không nháy sang form "Đặt".
  const hasPassword = profile?.hasPassword ?? true;

  return <PasswordForm key={String(hasPassword)} hasPassword={hasPassword} />;
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useTranslation();
  const { changePassword, isChangePasswordPending } = useMe();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(
      hasPassword ? changePasswordFormSchema : setPasswordFormSchema
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
      // Đặt lần đầu thì không gửi currentPassword (BE bỏ qua kiểm tra).
      ...(hasPassword ? { currentPassword: data.currentPassword } : {}),
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
        title={t(
          hasPassword
            ? 'accountSettings.password.heading'
            : 'accountSettings.password.setHeading'
        )}
        hint={
          hasPassword
            ? t('validation.passwordRule')
            : t('accountSettings.password.setHint')
        }
      >
        {hasPassword && (
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
        )}
        <div
          className={
            hasPassword
              ? 'grid gap-4 border-t border-line px-[18px] py-4 sm:grid-cols-2'
              : 'grid gap-4 px-[18px] py-4 sm:grid-cols-2'
          }
        >
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
          {t(
            hasPassword
              ? 'accountSettings.password.save'
              : 'accountSettings.password.setSave'
          )}
        </Button>
      </div>
    </form>
  );
}
