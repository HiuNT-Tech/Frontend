'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import config from '@/config';
import { useTheme } from '@/components/providers/theme-provider';
import {
  GSI_BUTTON_MAX_WIDTH,
  loadGoogleIdentity,
  type GsiButtonText,
} from '@/lib/google-identity';
import { cn } from '@/lib/utils';

type Status = 'loading' | 'ready' | 'error';

interface GoogleSignInButtonProps {
  /** Nhãn do Google vẽ: "Đăng nhập bằng Google" / "Đăng ký bằng Google" / "Tiếp tục với Google". */
  text: GsiButtonText;
  /** Nhận Google ID token sau khi người dùng chọn tài khoản. */
  onCredential: (idToken: string) => void | Promise<void>;
  /** Đang gọi API: làm mờ và chặn bấm (nút GIS không có prop disabled). */
  busy?: boolean;
}

/** Ẩn toàn bộ phần Google khi FE chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID. */
export const isGoogleSignInEnabled = (): boolean =>
  Boolean(config.googleClientId?.trim());

/**
 * Nút "Đăng nhập bằng Google" (Google Identity Services). Google vẽ nút trong
 * iframe nên không style được bằng Tailwind: chỉ chọn theme theo chế độ sáng/tối,
 * đo chiều rộng khung để nút rộng bằng ô nhập, và giữ chỗ 44px trong lúc tải.
 */
export function GoogleSignInButton({
  text,
  onCredential,
  busy = false,
}: GoogleSignInButtonProps) {
  const { t, i18n } = useTranslation();
  const { resolved } = useTheme();
  const clientId = config.googleClientId?.trim() ?? '';
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [width, setWidth] = useState(0);
  const [status, setStatus] = useState<Status>('loading');

  // Callback của GIS được đăng ký một lần; luôn gọi phiên bản mới nhất.
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  // GIS cần width cố định (px, tối đa 400): đo khung chứa, đo lại khi đổi kích thước.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(entries => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(Math.min(next, GSI_BUTTON_MAX_WIDTH));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!clientId || width === 0) return;
    let cancelled = false;

    loadGoogleIdentity()
      .then(gsi => {
        const element = containerRef.current;
        if (cancelled || !element) return;

        gsi.initialize({
          client_id: clientId,
          callback: response => {
            void onCredentialRef.current(response.credential);
          },
          ux_mode: 'popup',
          itp_support: true,
        });
        element.replaceChildren();
        gsi.renderButton(element, {
          type: 'standard',
          theme: resolved === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width,
          locale: i18n.language,
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, width, resolved, text, i18n.language]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative h-11 w-full"
        aria-busy={busy || status === 'loading'}
      >
        {status === 'loading' && (
          <div
            aria-hidden="true"
            className="skel absolute inset-0 rounded-[10px]"
          />
        )}
        <div
          ref={containerRef}
          className={cn(
            'flex h-full w-full items-center justify-center transition-opacity duration-200 ease-soft',
            status !== 'ready' && 'invisible',
            busy && 'pointer-events-none opacity-50'
          )}
        />
      </div>
      {status === 'error' && (
        <p
          role="alert"
          className="text-[12.5px] leading-snug font-medium text-danger"
        >
          {t('auth.google.loadError')}
        </p>
      )}
    </div>
  );
}
