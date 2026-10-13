import { AuthService } from '@/lib/apis/auth';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '@/redux/hooks';
import { resetUser } from '@/redux/user/userSlice';
import { disconnectNotificationSocket } from '@/lib/socket';
import { notificationQueryKeys } from '@/hooks/use-notification';
import { LoginUserRequest } from '@/config/interface';
import { toastHelpers } from './use-toast';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const {
    mutateAsync: login,
    isPending: isLoginPending,
    error: loginError,
  } = useMutation({
    mutationFn: async (data: LoginUserRequest) => {
      return await AuthService.loginUser(data);
    },
    onSuccess: () => {
      toastHelpers.success({
        description: t('toast.success.userLoggedIn'),
      });
      router.push('/dashboard');
    },
  });

  const {
    mutateAsync: logout,
    isPending: isLogoutPending,
    error: logoutError,
  } = useMutation({
    mutationFn: async () => {
      return await AuthService.logout();
    },
    onSuccess: () => {
      toastHelpers.success({
        description: t('toast.success.userLoggedOut'),
      });
      // README D19: ngắt socket, bỏ cache thông báo, reset Redux để user khác login không thấy dữ liệu cũ
      disconnectNotificationSocket();
      queryClient.removeQueries({ queryKey: notificationQueryKeys.all });
      dispatch(resetUser());
      router.push('/login');
    },
  });

  const {
    mutateAsync: refreshToken,
    isPending: isRefreshTokenPending,
    error: refreshTokenError,
  } = useMutation({
    mutationFn: async () => {
      return await AuthService.refreshToken();
    },
  });

  return {
    login,
    isLoginPending,
    loginError,

    logout,
    isLogoutPending,
    logoutError,

    refreshToken,
    isRefreshTokenPending,
    refreshTokenError,
  };
};
