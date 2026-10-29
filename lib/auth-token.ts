/**
 * Access token chỉ sống trong bộ nhớ của tab (module scope), KHÔNG vào Redux
 * (redux-persist ghi slice `user` xuống localStorage) và không có cookie:
 * một XSS bất kỳ đọc được localStorage là chiếm được phiên 14 ngày.
 *
 * Tải lại trang → mất token → AuthGuard gọi refresh (cookie httpOnly) để lấy
 * token mới trước khi render phần cần đăng nhập.
 */
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const hasAccessToken = (): boolean => accessToken !== null;

export const setAccessToken = (token: string | null | undefined): void => {
  accessToken = token ? token : null;
};

export const clearAccessToken = (): void => {
  accessToken = null;
};

/** Header gắn vào request API; rỗng khi chưa có token (chưa bootstrap xong). */
export const authorizationHeader = (): Record<string, string> =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

/**
 * Bỏ token khỏi payload trước khi đưa vào Redux. Dùng cho cả dữ liệu đã lỡ
 * persist từ bản cũ (store transform) lẫn response login/refresh.
 */
export const stripAuthTokens = <T extends object>(
  value: T
): Omit<T, 'accessToken' | 'refreshToken'> => {
  const rest = { ...(value as Record<string, unknown>) };
  delete rest.accessToken;
  delete rest.refreshToken;
  return rest as Omit<T, 'accessToken' | 'refreshToken'>;
};
