/**
 * Google Identity Services (GIS): script https://accounts.google.com/gsi/client
 * vẽ nút "Đăng nhập bằng Google" và trả về ID token (credential) để gửi BE.
 * Khai báo kiểu tối thiểu ở đây thay vì cài @types/google.accounts.
 */

export interface GoogleCredentialResponse {
  /** Google ID token (JWT) – gửi lên POST /auth/google. */
  credential: string;
  select_by?: string;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: 'popup' | 'redirect';
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
}

export type GsiButtonText =
  | 'signin_with'
  | 'signup_with'
  | 'continue_with'
  | 'signin';

export interface GsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: GsiButtonText;
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  /** px, Google giới hạn tối đa 400. */
  width?: number;
  locale?: string;
}

export interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
  prompt: () => void;
  cancel: () => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

export const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/** Chiều rộng tối đa Google cho phép với nút GIS. */
export const GSI_BUTTON_MAX_WIDTH = 400;

let loader: Promise<GoogleAccountsId> | null = null;

const readGsi = (): GoogleAccountsId | undefined => window.google?.accounts?.id;

/**
 * Tải script GIS đúng một lần (dùng chung cho mọi nút trên trang). Tải lỗi thì
 * bỏ promise đã cache để lần gọi sau thử lại.
 */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Google Identity Services chỉ chạy trên trình duyệt')
    );
  }

  const ready = readGsi();
  if (ready) return Promise.resolve(ready);

  if (!loader) {
    loader = new Promise<GoogleAccountsId>((resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>(
        `script[src="${GSI_SCRIPT_SRC}"]`
      );

      const fail = (message: string) => {
        // Gỡ thẻ script hỏng để lần gọi sau tạo thẻ mới; nếu giữ lại,
        // querySelector sẽ gắn listener lên script đã chết và promise treo mãi.
        script?.remove();
        loader = null;
        reject(new Error(message));
      };
      const settle = () => {
        const gsi = readGsi();
        if (gsi) resolve(gsi);
        else fail('Google Identity Services không khởi tạo được');
      };

      if (!script) {
        script = document.createElement('script');
        script.src = GSI_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener('load', settle, { once: true });
      script.addEventListener(
        'error',
        () => fail('Không tải được Google Identity Services'),
        { once: true }
      );
    });
  }

  return loader;
}
