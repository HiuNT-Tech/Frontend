'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { resetUser, selectCurrentUser } from '@/redux/user/userSlice';
import { hasAccessToken } from '@/lib/auth-token';
import { refreshAccessToken } from '@/utils/authorizeAxios';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/account/verification',
  '/invitations',
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(route + '/')
  );
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const userId = currentUser?.id;

  // Access token chỉ sống trong bộ nhớ, nên sau khi tải lại trang phải đổi
  // cookie refreshToken lấy token mới TRƯỚC khi render phần cần đăng nhập;
  // nếu không, các query React Query bắn ra không có Bearer → 401 → bị đá ra.
  const [tokenReady, setTokenReady] = useState(
    () => !userId || hasAccessToken()
  );

  useEffect(() => {
    if (!userId) {
      setTokenReady(true);
      return;
    }
    if (hasAccessToken()) {
      setTokenReady(true);
      return;
    }

    let cancelled = false;
    refreshAccessToken()
      .then(() => {
        if (!cancelled) setTokenReady(true);
      })
      .catch(() => {
        // refreshAccessToken đã xoá token, toast và chuyển /login; bỏ user cũ
        // để guard không giữ người dùng ở trang cần đăng nhập.
        if (!cancelled) dispatch(resetUser());
      });

    return () => {
      cancelled = true;
    };
  }, [userId, dispatch]);

  useEffect(() => {
    if (currentUser) return;
    if (isPublicRoute(pathname)) return;
    router.push('/login');
  }, [currentUser, pathname, router]);

  if (isPublicRoute(pathname)) return <>{children}</>;
  if (currentUser && tokenReady) return <>{children}</>;
  return null;
}
