'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { toastHelpers } from '@/hooks/use-toast';
import { buttonVariants } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks';
import { verifyAccountAPI } from '@/redux/user/userSlice';

/** Trạng thái trước, rồi điều gì xảy ra tiếp theo — cùng kiểu thẻ với đăng nhập. */
function VerifyState({
  spinner,
  title,
  description,
  action,
}: {
  spinner?: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in" role="status" aria-live="polite">
      {spinner && (
        <span
          aria-hidden="true"
          className="mb-5 block size-8 animate-spin rounded-full border-[2.5px] border-line border-t-accent"
        />
      )}
      <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-ink">
        {title}
      </h1>
      <p className="mt-1.5 text-sm leading-normal text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function VerifyContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [verified, setVerified] = useState(false);
  // Token xác minh dùng một lần: chốt để effect (StrictMode chạy 2 lần ở dev)
  // không bắn 2 request song song, lần sau sẽ bị BE từ chối.
  const requested = useRef(false);

  // Xác minh xong là BE đã cấp phiên (cookie + access token, user vào Redux),
  // nên vào thẳng dashboard thay vì bắt đăng nhập lại.
  useEffect(() => {
    const verifyAccount = async () => {
      if (email && token) {
        if (requested.current) return;
        requested.current = true;
        try {
          await dispatch(verifyAccountAPI({ email, token })).unwrap();
          setVerified(true);
          toastHelpers.success({
            description: t('toast.success.userVerified'),
          });
          router.replace('/dashboard');
        } catch (error) {
          toastHelpers.error({
            description: t('toast.error.userVerificationFailed'),
          });
          router.push('/404');
        }
      }
    };

    verifyAccount();
  }, [email, token, dispatch, router, t]);

  // Link thiếu email/token: nói rõ thay vì quay vô tận.
  if (!email || !token) {
    return (
      <VerifyState
        title={t('auth.verification.incompleteTitle')}
        description={t('auth.verification.incompleteDescription')}
        action={
          <Link
            href="/login"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {t('auth.verification.goToLogin')}
          </Link>
        }
      />
    );
  }

  if (verified) {
    return (
      <VerifyState
        spinner
        title={t('auth.verification.doneTitle')}
        description={t('auth.verification.doneDescription')}
      />
    );
  }

  return (
    <VerifyState
      spinner
      title={t('auth.verification.loading')}
      description={t('auth.verification.loadingDescription', { email })}
    />
  );
}

function VerifySkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel mb-5 size-8 rounded-full" />
      <div className="skel h-7 w-3/4" />
      <div className="skel mt-2.5 h-4 w-full" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifySkeleton />}>
      <VerifyContent />
    </Suspense>
  );
}
