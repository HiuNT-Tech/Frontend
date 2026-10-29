'use client';

import { Suspense, useEffect, useState } from 'react';
import type React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AuthDivider } from '@/components/auth/auth-divider';
import {
  GoogleSignInButton,
  isGoogleSignInEnabled,
} from '@/components/auth/google-sign-in-button';
import { LoginUserRequest } from '@/config/interface';
import { useRouter } from 'next/navigation';
import { EMAIL_RULE, PASSWORD_RULE } from '@/utils/validators';
import { toastHelpers } from '@/hooks/use-toast';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { useAppDispatch } from '@/redux/hooks';
import { loginUserAPI } from '@/redux/user/userSlice';
import { getSafeRedirectPath } from '@/lib/url';
import { cn } from '@/lib/utils';

// Ô nhập 16px để Safari trên iPad/iPhone không tự phóng to khi focus.
const INPUT_CLASS = 'h-11 px-3.5 text-base';

const describedBy = (id: string, error?: string) =>
  error ? `${id}-error` : undefined;

/** Nhãn ở trên, ô nhập, lỗi (đỏ) ngay dưới ô. */
function AuthField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
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
      {error && (
        <p
          id={`${id}-error`}
          className="text-[12.5px] leading-snug font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Thông báo trạng thái ngắn phía trên form (vừa xác minh / vừa đăng ký). */
function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent';
  children: React.ReactNode;
}) {
  return (
    <p
      role="status"
      className={cn(
        'mt-5 rounded-xl px-3.5 py-2.5 text-[13px] leading-normal break-words',
        tone === 'accent'
          ? 'bg-accent-soft text-accent-text'
          : 'bg-fill text-ink-2'
      )}
    >
      {children}
    </p>
  );
}

function LoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const registeredEmail = searchParams.get('registeredEmail');
  const verifiedEmail = searchParams.get('verifiedEmail');
  const redirect = searchParams.get('redirect');
  const prefilledEmail = verifiedEmail || registeredEmail || '';

  const dispatch = useAppDispatch();
  const router = useRouter();
  const appName = t('shell.appName');
  const [showPassword, setShowPassword] = useState(false);
  const googleEnabled = isGoogleSignInEnabled();
  const { signInWithGoogle, isPending: isGooglePending } = useGoogleAuth({
    redirect,
  });

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginUserRequest>({
    defaultValues: {
      email: prefilledEmail,
    },
  });

  // Email đã được điền sẵn (vừa đăng ký / xác minh) thì đưa con trỏ vào ô mật khẩu.
  useEffect(() => {
    setFocus(prefilledEmail ? 'password' : 'email');
  }, [prefilledEmail, setFocus]);

  const submitLogin = async (data: LoginUserRequest) => {
    try {
      await dispatch(loginUserAPI(data)).unwrap();

      toastHelpers.success({
        description: t('toast.success.userLoggedIn'),
      });

      router.push(getSafeRedirectPath(redirect));
    } catch (error) {}
  };

  const registerHref = redirect
    ? `/register?redirect=${encodeURIComponent(redirect)}`
    : '/register';

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;
  const isBusy = isSubmitting || isGooglePending;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-ink">
        {t('auth.login.heading', { appName })}
      </h1>
      <p className="mt-1.5 text-sm leading-normal text-muted">
        {t('auth.login.subtitle')}
      </p>

      {verifiedEmail && (
        <Notice tone="accent">
          {t('auth.login.verifiedEmail', { email: verifiedEmail })}
        </Notice>
      )}

      {registeredEmail && (
        <Notice>
          {t('auth.login.registeredEmail', { email: registeredEmail })}
        </Notice>
      )}

      {googleEnabled && (
        <div className="mt-[26px] flex flex-col gap-4">
          <GoogleSignInButton
            text="continue_with"
            onCredential={signInWithGoogle}
            busy={isBusy}
          />
          <AuthDivider label={t('auth.google.dividerLogin')} />
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(submitLogin)}
        className={cn(
          'flex flex-col gap-4',
          googleEnabled ? 'mt-4' : 'mt-[26px]'
        )}
      >
        <AuthField
          id="login-email"
          label={t('auth.fields.email')}
          error={emailError}
        >
          <Input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t('auth.fields.emailPlaceholder')}
            className={INPUT_CLASS}
            error={emailError}
            notShowErrorMessage
            aria-describedby={describedBy('login-email', emailError)}
            {...register('email', {
              required: t('validation.fieldRequired'),
              pattern: {
                value: EMAIL_RULE,
                message: t('validation.email'),
              },
            })}
          />
        </AuthField>

        <AuthField
          id="login-password"
          label={t('auth.fields.password')}
          error={passwordError}
        >
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('auth.login.passwordPlaceholder')}
            className={cn(INPUT_CLASS, 'pr-11')}
            error={passwordError}
            notShowErrorMessage
            aria-describedby={describedBy('login-password', passwordError)}
            {...register('password', {
              required: t('validation.fieldRequired'),
              pattern: {
                value: PASSWORD_RULE,
                message: t('validation.passwordRule'),
              },
            })}
            customNode={
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={
                  showPassword
                    ? t('auth.fields.hidePassword')
                    : t('auth.fields.showPassword')
                }
                aria-pressed={showPassword}
                className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" aria-hidden="true" />
                ) : (
                  <Eye className="size-[18px]" aria-hidden="true" />
                )}
              </button>
            }
          />
        </AuthField>

        <Button
          type="submit"
          size="lg"
          disabled={isBusy}
          className="mt-1.5 w-full"
        >
          {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
        {t('auth.login.noAccount', { appName })}{' '}
        <Link
          href={registerHref}
          className="-my-1.5 inline-block py-1.5 font-semibold text-accent transition-colors duration-200 ease-soft hover:text-accent-hover"
        >
          {t('auth.login.createAccount')}
        </Link>
      </p>
    </div>
  );
}

/** Khung xương có hình dạng form thật, hiện khi đang đọc tham số URL. */
function LoginSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel h-7 w-3/4" />
      <div className="skel mt-2.5 h-4 w-full" />
      <div className="mt-[26px] flex flex-col gap-4">
        {[0, 1].map(item => (
          <div key={item} className="flex flex-col gap-2">
            <div className="skel h-3.5 w-20" />
            <div className="skel h-11 w-full rounded-[10px]" />
          </div>
        ))}
        <div className="skel mt-1.5 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
