import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthService } from '@/lib/apis/auth';
import { stripAuthTokens } from '@/lib/auth-token';
import { GoogleAuthStatus } from '@/config/enum';
import {
  GoogleLoginRequest,
  GoogleLoginResponse,
  LoginUserRequest,
  LoginUserResponse,
  VerifyUserRequest,
} from '@/config/interface';
import { RootState } from '@/redux/store';

// Thông tin user trong Redux KHÔNG có token: slice này được redux-persist ghi
// xuống localStorage, còn access token chỉ sống trong bộ nhớ (lib/auth-token).
export type User = Omit<LoginUserResponse, 'accessToken' | 'refreshToken'>;

// 1. Define State Interface
export interface UserState {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
}

// 2. Initial State
const initialState: UserState = {
  currentUser: null,
  loading: false,
  error: null,
};

// 3. Async Thunks (chuẩn hóa theo pattern createAsyncThunk)
// Login
export const loginUserAPI = createAsyncThunk<User, LoginUserRequest>(
  'user/loginUserAPI',
  async (data: LoginUserRequest) => {
    // AuthService đã cất access token vào bộ nhớ; Redux chỉ giữ thông tin user.
    const response = await AuthService.loginUser(data);
    return stripAuthTokens(response);
  }
);

// Xác minh email: BE kích hoạt tài khoản và cấp phiên luôn, nên coi như đã đăng nhập.
export const verifyAccountAPI = createAsyncThunk<User, VerifyUserRequest>(
  'user/verifyAccountAPI',
  async (data: VerifyUserRequest) => {
    const response = await AuthService.verifyUser({ user: data });
    return stripAuthTokens(response);
  }
);

// Đăng nhập / đăng ký bằng Google. Chỉ AUTHENTICATED mới có phiên;
// PENDING_VERIFICATION = BE đã gửi mail xác minh, chưa đăng nhập.
export const loginWithGoogleAPI = createAsyncThunk<
  GoogleLoginResponse,
  GoogleLoginRequest
>('user/loginWithGoogleAPI', async (data: GoogleLoginRequest) => {
  const response = await AuthService.loginWithGoogle(data);
  return stripAuthTokens(response) as GoogleLoginResponse;
});

// Logout (clear cookie + clear Redux user state)
export const logoutUserAPI = createAsyncThunk<void, void>(
  'user/logoutUserAPI',
  async () => {
    await AuthService.logout();
  }
);

// 4. Create Slice
export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Synchronous reducers (giống updateUser / resetUser ở dự án cũ)
    updateUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
    },
    resetUser: state => {
      state.currentUser = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      // Login lifecycle
      .addCase(loginUserAPI.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUserAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(loginUserAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to login';
      })
      // Verify-account lifecycle (xác minh xong = đã đăng nhập)
      .addCase(verifyAccountAPI.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyAccountAPI.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(verifyAccountAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to verify account';
      })
      // Google login lifecycle
      .addCase(loginWithGoogleAPI.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithGoogleAPI.fulfilled, (state, action) => {
        state.loading = false;
        // Chưa xác minh email thì chưa có phiên: giữ nguyên currentUser.
        if (action.payload.status === GoogleAuthStatus.AUTHENTICATED) {
          const { status: _status, ...user } = action.payload;
          state.currentUser = user;
        }
      })
      .addCase(loginWithGoogleAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to login with Google';
      })
      // Logout lifecycle
      .addCase(logoutUserAPI.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUserAPI.fulfilled, state => {
        state.loading = false;
        state.currentUser = null;
      })
      .addCase(logoutUserAPI.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to logout';
      });
  },
});

// 5. Exports
// Actions
export const { updateUser, resetUser } = userSlice.actions;

// Selectors (chuẩn hóa giống dự án cũ, nhưng có thêm loading/error)
export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;
export const selectIsAuthenticated = (state: RootState) =>
  Boolean(state.user.currentUser);

// Reducer
export const userReducer = userSlice.reducer;
