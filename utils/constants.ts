import config from '@/config';

/** API khi chạy local không có env (mock hoặc BE local, prefix `api`). */
const DEFAULT_API_ROOT = 'http://localhost:8017/api';

/**
 * Gốc URL của API, kèm prefix (`/api`). Lấy từ `NEXT_PUBLIC_API_URL`:
 * - local: `http://localhost:8017/api`
 * - Vercel: `/api` (đường dẫn tương đối) và `BACKEND_URL` để Next rewrite sang BE,
 *   nhờ vậy cookie đăng nhập cùng origin với trang (xem next.config.ts).
 */
export const API_ROOT = (config.apiUrl?.trim() || DEFAULT_API_ROOT).replace(
  /\/+$/,
  ''
);

export const APP_BAR_HEIGHT = '58px';
export const BOARD_BAR_HEIGHT = '60px';
export const BOARD_CONTENT_HEIGHT = `calc(100vh - ${APP_BAR_HEIGHT} - ${BOARD_BAR_HEIGHT})`;
export const COLUMN_HEADER_HEIGHT = '50px';
export const COLUMN_FOOTER_HEIGHT = '56px';
