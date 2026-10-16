import { sendPost, sendDelete, sendGet } from '@/utils/authorizeAxios';
import { API_ROOT } from '@/utils/constants';
import {
  GoogleLoginRequest,
  GoogleLoginResponse,
  LoginUserRequest,
  LoginUserResponse,
  RefreshTokenResponse,
} from '@/config/interface';

export const AuthService = {
  registerUser: async ({ user }: { user: Record<string, unknown> }) => {
    return await sendPost(`${API_ROOT}/v1/auth/register`, user);
  },

  verifyUser: async ({ user }: { user: Record<string, unknown> }) => {
    return await sendPost(`${API_ROOT}/v1/auth/verify-account`, user);
  },

  loginUser: async (user: LoginUserRequest): Promise<LoginUserResponse> => {
    return await sendPost(`${API_ROOT}/v1/auth/login`, user);
  },

  /** Đăng nhập / đăng ký bằng Google; BE tự gửi mail xác minh với tài khoản mới. */
  loginWithGoogle: async (
    data: GoogleLoginRequest
  ): Promise<GoogleLoginResponse> => {
    return await sendPost(`${API_ROOT}/v1/auth/google`, data);
  },

  logout: async (): Promise<void> => {
    await sendDelete(`${API_ROOT}/v1/auth/logout`);
  },

  refreshToken: async (): Promise<RefreshTokenResponse> => {
    return await sendGet(`${API_ROOT}/v1/auth/refresh_token`);
  },
};
