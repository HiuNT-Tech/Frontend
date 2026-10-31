'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetUser,
  selectCurrentUser,
  updateUser,
} from '@/redux/user/userSlice';
import { AuthService } from '@/lib/apis/auth';
import { hasAccessToken } from '@/lib/auth-token';
import { refreshAccessToken } from '@/utils/authorizeAxios';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/account/verification',
  '/invitations',
  '/privacy',
  '/terms',
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Access token chỉ sống trong bộ nhớ, nên với trang cần đăng nhập mà RAM chưa
 * có token (F5, tab mới, hoặc Redux trống vì localStorage bị dọn) guard phải
 * đổi cookie refreshToken (httpOnly) lấy token mới TRƯỚC khi render; nếu
 * Redux chưa có user thì lấy thêm /auth/me. Nếu refresh thất bại, BE đã xoá
 * cookie nên chuyển về /login không bị proxy đẩy ngược lại /dashboard.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const userId = currentUser?.id;
  const publicRoute = isPublicRoute(pathname);

  const [tokenReady, setTokenReady] = useState(() => hasAccessToken());

  useEffect(() => {
    if (publicRoute) return;
    if (hasAccessToken()) {
      setTokenReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await refreshAccessToken({ silent: true });
        if (!userId) {
          const me = await AuthService.me();
          if (cancelled) return;
          dispatch(updateUser(me));
        }
        if (!cancelled) setTokenReady(true);
      } catch {
        if (cancelled) return;
        dispatch(resetUser());
        router.push('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicRoute, userId, dispatch, router]);

  if (publicRoute) return <>{children}</>;
  if (currentUser && tokenReady) return <>{children}</>;
  return null;
}
