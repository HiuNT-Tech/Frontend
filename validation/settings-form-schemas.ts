import { z } from 'zod';
import i18n from '@/i18n';
import regex from '@/constant/regex';

export const updateProfileFormSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, i18n.t('validation.fieldRequired'))
    .min(2, i18n.t('accountSettings.profile.validation.displayNameMin')),
  phone: z.string().trim(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileFormSchema>;

const newPasswordFields = {
  newPassword: z
    .string()
    .trim()
    .min(1, i18n.t('validation.fieldRequired'))
    .refine(value => regex.password.test(value), {
      message: i18n.t('validation.passwordRule'),
    }),
  confirmPassword: z.string().trim().min(1, i18n.t('validation.fieldRequired')),
};

const passwordsMatch = {
  check: (data: { newPassword: string; confirmPassword: string }) =>
    data.newPassword === data.confirmPassword,
  options: {
    message: i18n.t('validation.passwordConfirmation'),
    path: ['confirmPassword'],
  },
};

/** Đổi mật khẩu: bắt buộc nhập mật khẩu hiện tại. */
export const changePasswordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .trim()
      .min(1, i18n.t('validation.fieldRequired')),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);

/** Đặt mật khẩu lần đầu (tài khoản Google chưa có mật khẩu): không có mật khẩu hiện tại. */
export const setPasswordFormSchema = z
  .object({
    currentPassword: z.string().trim().optional(),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.options);

/** Dạng chung cho cả hai form; `currentPassword` chỉ bắt buộc khi đã có mật khẩu. */
export type ChangePasswordFormData = z.infer<typeof setPasswordFormSchema>;
