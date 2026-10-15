'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import { DocumentTitle } from '@/components/document-title';
import { AppLogo } from '@/components/layout/sidebar-item';

// Create a client instance
const queryClient = new QueryClient();

/*
 * Trang trí duy nhất của màn hình xác thực: nét vẽ mảnh một board (3 cột + các thẻ),
 * nằm lệch ở góc trên bên phải thẻ, mờ dần sang trái bằng mask, tự vẽ một lần khi mở.
 * Mỗi path có pathLength=1 nên dasharray/dashoffset = 1 là "vẽ hết nét".
 */
const BOARD_PATHS = [
  'M24 22h44v156H24zM80 22h44v112H80zM136 22h44v136h-44z',
  'M32 38h28v24H32zM32 70h28v24H32zM32 102h28v24H32z',
  'M88 38h28v24H88zM88 70h28v24H88z',
  'M144 38h28v24h-28zM144 70h28v24h-28zM144 102h28v24h-28z',
];

const BOARD_DRAW_KEYFRAMES =
  '@keyframes auth-board-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}';

function BoardArt() {
  return (
    <>
      <style href="auth-board-draw" precedence="default">
        {BOARD_DRAW_KEYFRAMES}
      </style>
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        focusable="false"
        className="pointer-events-none absolute -top-[46px] -right-[22px] size-[176px] text-line mask-l-from-30% mask-l-to-80%"
      >
        {BOARD_PATHS.map((d, index) => (
          <path
            key={d}
            d={d}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            // Chỉ vẽ khi người dùng không bật "giảm chuyển động"; nếu bật, nét hiện sẵn.
            className="[stroke-dasharray:1] motion-safe:animate-[auth-board-draw_1.1s_var(--ease)_both]"
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </svg>
    </>
  );
}

/*
 * Khung chung cho mọi trang xác thực (đăng nhập, đăng ký, xác minh, lời mời):
 * nền xám, một thẻ trắng ở giữa có logo + tên app, nội dung trang nằm trong thẻ.
 * Layout giữ nguyên khi chuyển trang nên nét vẽ chỉ chạy một lần.
 */
function AuthFrame({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-14">
      <main className="w-full max-w-[440px] animate-sheet-in">
        <div className="relative overflow-hidden rounded-card border border-line bg-card px-6 pt-8 pb-7 shadow-card sm:px-8 sm:pt-[34px] sm:pb-8">
          <BoardArt />
          <div className="relative">
            <div className="mb-[26px] flex items-center gap-2.5">
              <AppLogo size={36} />
              <span className="text-[17px] leading-none font-bold tracking-[-0.01em] text-ink">
                {t('shell.appName')}
              </span>
            </div>
            {children}
          </div>
        </div>

        <p className="mt-8 text-center text-[12.5px] text-muted">
          {t('auth.author')}
        </p>
      </main>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentTitle />
      <AuthFrame>{children}</AuthFrame>
    </QueryClientProvider>
  );
}
