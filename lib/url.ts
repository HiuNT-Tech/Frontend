import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export const replaceWithUpdatedSearchParams = (
  router: AppRouterInstance,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  updater: (params: URLSearchParams) => void
) => {
  const params = new URLSearchParams(searchParams.toString());
  updater(params);
  const queryString = params.toString();

  router.replace(queryString ? `${pathname}?${queryString}` : pathname);
};

/**
 * Chỉ chấp nhận đường dẫn nội bộ (bắt đầu bằng "/" nhưng không phải "//")
 * cho query `redirect` sau đăng nhập, tránh open redirect sang domain khác.
 */
export const getSafeRedirectPath = (
  value: string | null | undefined,
  fallback = '/dashboard'
): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
};
