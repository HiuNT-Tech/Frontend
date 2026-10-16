'use client';

import { Suspense, useEffect } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthDivider } from '@/components/auth/auth-divider';
import {
  GoogleSignInButton,
  isGoogleSignInEnabled,
} from '@/components/auth/google-sign-in-button';
import { RegisterUserRequest } from '@/config/interface';
import { AuthService } from '@/lib/apis/auth';
import { cn } from '@/lib/utils';
import { toastHelpers } from '@/hooks/use-toast';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { registerFormSchema } from '@/validation/register-form-schemas';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface RegisterFormData extends RegisterUserRequest {
  passwordConfirmation: string;
}

type FormData = z.infer<typeof registerFormSchema>;

// Ô nhập 16px để Safari trên iPad/iPhone không tự phóng to khi focus.
const INPUT_CLASS = 'h-11 px-3.5 text-base';

const describedBy = (id: string, error?: string) =>
  error ? `${id}-error` : undefined;

/** Nhãn ở trên, ô nhập, lỗi (đỏ) ngay dưới ô. */
function AuthField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] leading-tight font-semibold text-ink-2"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-[12.5px] leading-snug font-medium text-danger"
        >
          {error}
        </p>
      ) : (
        hint && <p className="text-[12.5px] leading-snug text-muted">{hint}</p>
      )}
    </div>
  );
}

function RegisterForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationEmail = searchParams.get('email');
  const invitationToken = searchParams.get('invitationToken');
  const redirect = searchParams.get('redirect');
  const appName = t('shell.appName');
  // Đăng ký qua lời mời thì sau khi đăng nhập quay lại trang lời mời.
  const nextRedirect =
    redirect ?? (invitationToken ? `/invitations/${invitationToken}` : null);
  const googleEnabled = isGoogleSignInEnabled();
  const { signInWithGoogle, isPending: isGooglePending } = useGoogleAuth({
    redirect: nextRedirect,
  });

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: invitationEmail ?? '',
      password: '',
      passwordConfirmation: '',
    },
  });

  useEffect(() => {
    if (invitationEmail) {
      setValue('email', invitationEmail, { shouldValidate: true });
    }
  }, [invitationEmail, setValue]);

  // Email đã khoá theo lời mời thì đưa con trỏ thẳng vào ô mật khẩu.
  useEffect(() => {
    setFocus(invitationEmail ? 'password' : 'email');
  }, [invitationEmail, setFocus]);

  const getFieldError = (field: keyof FormData): string | undefined => {
    return errors[field]?.message;
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { email, password } = data;
      const response = await AuthService.registerUser({
        user: { email, password },
      });

      toastHelpers.success({
        description: t('auth.register.pending'),
      });

      const loginParams = new URLSearchParams({
        registeredEmail: response.email,
      });

      if (nextRedirect) {
        loginParams.set('redirect', nextRedirect);
      }

      router.push(`/login?${loginParams.toString()}`);
    } catch (error) {
      console.error('Register error:', error);
    }
  };

  const onError = (formErrors: typeof errors) => {
    setTimeout(() => {}, 200);
  };

  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : '/login';

  const emailError = getFieldError('email');
  const passwordError = getFieldError('password');
  const confirmationError = getFieldError('passwordConfirmation');
  const isBusy = isSubmitting || isGooglePending;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-ink">
        {t('auth.register.heading', { appName })}
      </h1>
      <p className="mt-1.5 text-sm leading-normal text-muted">
        {invitationEmail
          ? t('auth.register.invitedSubtitle')
          : t('auth.register.subtitle')}
      </p>

      {googleEnabled && (
        <div className="mt-6 flex flex-col gap-4">
          <GoogleSignInButton
            text="signup_with"
            onCredential={signInWithGoogle}
            busy={isBusy}
          />
          <AuthDivider label={t('auth.google.dividerRegister')} />
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit, onError)}
        className={cn('flex flex-col gap-3.5', googleEnabled ? 'mt-4' : 'mt-6')}
      >
        <AuthField
          id="register-email"
          label={t('auth.fields.email')}
          error={emailError}
          hint={
            invitationEmail ? t('auth.register.invitedEmailHint') : undefined
          }
        >
          <Input
            id="register-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t('auth.fields.emailPlaceholder')}
            className={INPUT_CLASS}
            error={emailError}
            notShowErrorMessage
            aria-describedby={describedBy('register-email', emailError)}
            {...register('email', {
              setValueAs: (value: string) => value?.trim() || '',
            })}
            readOnly={!!invitationEmail}
            disabled={isBusy}
          />
        </AuthField>

        <AuthField
          id="register-password"
          label={t('auth.fields.password')}
          error={passwordError}
        >
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.register.passwordPlaceholder')}
            className={INPUT_CLASS}
            error={passwordError}
            notShowErrorMessage
            aria-describedby={describedBy('register-password', passwordError)}
            {...register('password', {
              setValueAs: (value: string) => value?.trim() || '',
            })}
            disabled={isBusy}
          />
        </AuthField>

        <AuthField
          id="register-password-confirmation"
          label={t('auth.fields.confirmPassword')}
          error={confirmationError}
        >
          <Input
            id="register-password-confirmation"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            className={INPUT_CLASS}
            error={confirmationError}
            notShowErrorMessage
            aria-describedby={describedBy(
              'register-password-confirmation',
              confirmationError
            )}
            {...register('passwordConfirmation', {
              setValueAs: (value: string) => value?.trim() || '',
            })}
            disabled={isBusy}
          />
        </AuthField>

        <Button
          type="submit"
          size="lg"
          disabled={isBusy}
          className="mt-1.5 w-full"
        >
          {isSubmitting
            ? t('auth.register.submitting')
            : t('auth.register.submit')}
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        {t('auth.register.hasAccount')}{' '}
        <Link
          href={loginHref}
          className="-my-1.5 inline-block py-1.5 font-semibold text-accent transition-colors duration-200 ease-soft hover:text-accent-hover"
        >
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </div>
  );
}

/** Khung xương có hình dạng form thật, hiện khi đang đọc tham số URL. */
function RegisterSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel h-7 w-4/5" />
      <div className="skel mt-2.5 h-4 w-full" />
      <div className="mt-6 flex flex-col gap-3.5">
        {[0, 1, 2].map(item => (
          <div key={item} className="flex flex-col gap-2">
            <div className="skel h-3.5 w-24" />
            <div className="skel h-11 w-full rounded-[10px]" />
          </div>
        ))}
        <div className="skel mt-1.5 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterForm />
    </Suspense>
  );
}
