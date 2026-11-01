import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { GoogleAuthStatus } from '@/config/enum';
import { toastHelpers } from '@/hooks/use-toast';
import { getSafeRedirectPath } from '@/lib/url';
import { useAppDispatch } from '@/redux/hooks';
import { loginWithGoogleAPI } from '@/redux/user/userSlice';

interface UseGoogleAuthOptions {
  /** Đường dẫn nội bộ cần quay lại sau khi đăng nhập (query `redirect`). */
  redirect?: string | null;
}

/**
 * Nhận Google ID token từ nút GIS, gọi BE rồi điều hướng:
 * - AUTHENTICATED → vào app như đăng nhập thường.
 * - PENDING_VERIFICATION → BE đã gửi mail xác minh, đưa về /login kèm `registeredEmail`
 *   như vừa đăng ký; mở liên kết trong mail là vào thẳng dashboard, không cần đăng nhập lại.
 */
export function useGoogleAuth({ redirect }: UseGoogleAuthOptions = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isPending, setPending] = useState(false);

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      setPending(true);
      try {
        const result = await dispatch(loginWithGoogleAPI({ idToken })).unwrap();

        if (result.status === GoogleAuthStatus.AUTHENTICATED) {
          toastHelpers.success({
            description: t('toast.success.userLoggedIn'),
          });
          router.push(getSafeRedirectPath(redirect));
          return;
        }

        toastHelpers.success({
          description: t('auth.google.pending', { email: result.email }),
        });

        const loginParams = new URLSearchParams({
          registeredEmail: result.email,
        });
        if (redirect) loginParams.set('redirect', redirect);
        router.push(`/login?${loginParams.toString()}`);
      } catch {
        // Lỗi API đã hiện toast ở interceptor axios.
      } finally {
        setPending(false);
      }
    },
    [dispatch, redirect, router, t]
  );

  return { signInWithGoogle, isPending };
}
