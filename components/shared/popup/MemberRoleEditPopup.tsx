'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select, type SelectValue } from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/user-avatar';
import { MemberRole } from '@/config/enum';
import type { BoardMemberRole, UserBoardMember } from '@/config/interface';

interface MemberRoleEditPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: UserBoardMember | null;
  onSubmit: (userId: number, role: BoardMemberRole) => Promise<void>;
  isPending: boolean;
}

export default function MemberRoleEditPopup({
  open,
  onOpenChange,
  member,
  onSubmit,
  isPending,
}: MemberRoleEditPopupProps) {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<string>(
    member?.role ?? MemberRole.MEMBER
  );

  useEffect(() => {
    if (open && member) {
      setSelectedRole(member.role);
    }
  }, [open, member]);

  const roleOptions = [
    {
      value: MemberRole.MEMBER,
      label: t('settings.members.roleOptions.member'),
    },
    {
      value: MemberRole.PROJECT_MANAGER,
      label: t('settings.members.roleOptions.projectManager'),
    },
    {
      value: MemberRole.GUEST,
      label: t('settings.members.roleOptions.guest'),
    },
    {
      value: MemberRole.ADMINISTRATOR,
      label: t('settings.members.roleOptions.administrator'),
    },
  ];

  const handleRoleChange = (value: SelectValue) => {
    setSelectedRole(value as string);
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
    }
  };

  const handleSubmit = async () => {
    if (!member) return;
    await onSubmit(member.userId, selectedRole as BoardMemberRole);
  };

  const isUnchanged = selectedRole === member?.role;
  const memberName = member ? member.displayName || member.username : '';

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="sm"
      closeOnOverlayClick={!isPending}
      title={t('settings.members.editRoleModal.title')}
    >
      <div className="space-y-5">
        <p className="text-sm text-ink-2">
          {t('settings.members.editRoleModal.description')}
        </p>

        {member && (
          <div className="flex items-center gap-3 rounded-[12px] bg-fill px-3.5 py-3">
            <UserAvatar name={memberName} src={member.avatar} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {memberName}
              </p>
              <p className="truncate text-[12.5px] text-muted">
                {member.email}
              </p>
            </div>
          </div>
        )}

        <Select
          label={t('settings.members.editRoleModal.roleLabel')}
          options={roleOptions}
          value={selectedRole}
          required
          disabled={isPending}
          onValueChange={handleRoleChange}
          allowClear={false}
        />

        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isPending || isUnchanged}
            onClick={handleSubmit}
          >
            {isPending
              ? t('common.loading')
              : t('settings.members.editRoleModal.submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
