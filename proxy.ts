import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard'];

const guestOnlyRoutes = ['/login', '/register'];
const publicRoutes = [
  '/login',
  '/register',
  '/account/verification',
  '/invitations',
];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Chỉ còn cookie refreshToken (httpOnly); access token sống trong bộ nhớ tab.
  // Đây chỉ là gợi ý điều hướng, quyền thật do BE kiểm qua Bearer.
  const refreshToken = request.cookies.get('refreshToken');
  const hasAuth = !!refreshToken?.value;

  const isGuestOnlyRoute = guestOnlyRoutes.some(route =>
    pathname.startsWith(route)
  );
  if (isGuestOnlyRoute && hasAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!hasAuth) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
