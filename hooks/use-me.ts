import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MeService } from '@/lib/apis/me';
import { toastHelpers } from '@/hooks/use-toast';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectCurrentUser, updateUser } from '@/redux/user/userSlice';
import type {
  ChangePasswordRequest,
  MeProfile,
  UpdateProfileRequest,
} from '@/config/interface';

export const useMe = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery<MeProfile>({
    queryKey: ['me'],
    queryFn: () => MeService.getProfile(),
  });

  const {
    mutateAsync: updateProfile,
    isPending: isUpdateProfilePending,
    error: updateProfileError,
  } = useMutation({
    mutationFn: (data: UpdateProfileRequest): Promise<MeProfile> =>
      MeService.updateProfile(data),
    onSuccess: updated => {
      queryClient.setQueryData(['me'], updated);
      if (currentUser) {
        dispatch(
          updateUser({
            ...currentUser,
            displayName: updated.displayName,
            avatar: updated.avatar,
          })
        );
      }
      toastHelpers.success({
        description: t('accountSettings.profile.success'),
      });
    },
  });

  const {
    mutateAsync: changePassword,
    isPending: isChangePasswordPending,
    error: changePasswordError,
  } = useMutation({
    mutationFn: (data: ChangePasswordRequest): Promise<void> =>
      MeService.changePassword(data),
    onSuccess: (_, variables) => {
      // Không gửi currentPassword = tài khoản Google vừa đặt mật khẩu lần đầu.
      const isFirstPassword = variables.currentPassword === undefined;
      toastHelpers.success({
        description: t(
          isFirstPassword
            ? 'accountSettings.password.setSuccess'
            : 'accountSettings.password.success'
        ),
      });
      // `hasPassword` đổi → tab mật khẩu chuyển sang form "Đổi mật khẩu".
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const {
    mutateAsync: uploadAvatarMutation,
    isPending: isUploadAvatarPending,
    error: uploadAvatarError,
  } = useMutation({
    mutationFn: (file: File): Promise<MeProfile> =>
      MeService.uploadAvatar(file),
    onSuccess: updated => {
      queryClient.setQueryData(['me'], updated);
      if (currentUser) {
        dispatch(
          updateUser({
            ...currentUser,
            displayName: updated.displayName,
            avatar: updated.avatar,
          })
        );
      }
      toastHelpers.success({
        description: t('accountSettings.profile.avatarSuccess'),
      });
    },
  });

  const uploadAvatar = async (file: File): Promise<string> => {
    const updated = await uploadAvatarMutation(file);
    return updated.avatar ?? '';
  };

  return {
    profile,
    isProfileLoading,
    profileError,

    updateProfile,
    isUpdateProfilePending,
    updateProfileError,

    changePassword,
    isChangePasswordPending,
    changePasswordError,

    uploadAvatar,
    isUploadAvatarPending,
    uploadAvatarError,
  };
};
