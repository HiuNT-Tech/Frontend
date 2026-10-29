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

/** Origin giả để phân giải đường dẫn tương đối; không bao giờ là origin thật. */
const LOCAL_ORIGIN = 'http://local.invalid';

/** Trang đăng nhập: không redirect ngược về đây để tránh vòng lặp. */
const LOGIN_PATH = '/login';

/**
 * Backslash (WHATWG URL coi "\" như "/" với scheme http), ký tự điều khiển
 * (< 0x20) và khoảng trắng: URL parser bỏ hoặc chuẩn hoá chúng nên
 * "/\evil.com" hay "/<tab>/evil.com" có thể thành "//evil.com".
 */
const hasUnsafeChar = (value: string): boolean =>
  /[\\\s]/.test(value) ||
  Array.from(value).some(char => char.charCodeAt(0) < 0x20);

/**
 * Chỉ chấp nhận đường dẫn nội bộ cho query `redirect` sau đăng nhập, tránh
 * open redirect sang domain khác. Giá trị nhận vào đã được percent-decode
 * (từ `searchParams.get`).
 *
 * Trả về `pathname + search + hash` đã chuẩn hoá; trả `fallback` khi giá trị
 * rỗng, không bắt đầu bằng "/", bắt đầu bằng "//" hoặc scheme, chứa ký tự
 * nguy hiểm, phân giải ra origin khác, hoặc trỏ về trang đăng nhập.
 */
export const getSafeRedirectPath = (
  value: string | null | undefined,
  fallback = '/dashboard'
): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  if (hasUnsafeChar(value)) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(value, LOCAL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== LOCAL_ORIGIN) {
    return fallback;
  }

  const { pathname, search, hash } = url;
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return fallback;
  }

  return `${pathname}${search}${hash}`;
};
