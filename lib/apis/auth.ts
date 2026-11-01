import { sendPost, sendDelete, sendGet } from '@/utils/authorizeAxios';
import { API_ROOT } from '@/utils/constants';
import { clearAccessToken, setAccessToken } from '@/lib/auth-token';
import { GoogleAuthStatus } from '@/config/enum';
import {
  GoogleLoginRequest,
  GoogleLoginResponse,
  LoginUserRequest,
  LoginUserResponse,
  RefreshTokenResponse,
  VerifyUserRequest,
} from '@/config/interface';

// Mọi nơi nhận access token từ BE đều đi qua đây để lưu vào bộ nhớ (lib/auth-token);
// Redux/persist không bao giờ giữ token.
export const AuthService = {
  registerUser: async ({ user }: { user: Record<string, unknown> }) => {
    return await sendPost(`${API_ROOT}/v1/auth/register`, user);
  },

  /** Kích hoạt tài khoản; BE cấp phiên luôn (cookie + access token) như login. */
  verifyUser: async ({
    user,
  }: {
    user: VerifyUserRequest;
  }): Promise<LoginUserResponse> => {
    const result: LoginUserResponse = await sendPost(
      `${API_ROOT}/v1/auth/verify-account`,
      user
    );
    setAccessToken(result.accessToken);
    return result;
  },

  loginUser: async (user: LoginUserRequest): Promise<LoginUserResponse> => {
    const result: LoginUserResponse = await sendPost(
      `${API_ROOT}/v1/auth/login`,
      user
    );
    setAccessToken(result.accessToken);
    return result;
  },

  /** Đăng nhập / đăng ký bằng Google; BE tự gửi mail xác minh với tài khoản mới. */
  loginWithGoogle: async (
    data: GoogleLoginRequest
  ): Promise<GoogleLoginResponse> => {
    const result: GoogleLoginResponse = await sendPost(
      `${API_ROOT}/v1/auth/google`,
      data
    );
    if (result.status === GoogleAuthStatus.AUTHENTICATED) {
      setAccessToken(result.accessToken);
    }
    return result;
  },

  logout: async (): Promise<void> => {
    try {
      await sendDelete(`${API_ROOT}/v1/auth/logout`);
    } finally {
      clearAccessToken();
    }
  },

  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const result: RefreshTokenResponse = await sendGet(
      `${API_ROOT}/v1/auth/refresh_token`
    );
    setAccessToken(result.accessToken);
    return result;
  },

  /**
   * User hiện tại theo Bearer. AuthGuard dùng để khôi phục Redux khi còn cookie
   * refresh nhưng store trống (localStorage bị xoá, tab mới sau khi dọn site data).
   */
  me: async (): Promise<
    Omit<LoginUserResponse, 'accessToken' | 'refreshToken'>
  > => {
    return await sendGet(`${API_ROOT}/v1/auth/me`);
  },
};
