'use client';

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { MembersTable } from '@/components/shared/tables/MembersTable';
import MembersFilter from '@/components/shared/filters/MembersFilter';
import InvitationCreatePopup from '@/components/shared/popup/InvitationCreatePopup';
import MemberRoleEditPopup from '@/components/shared/popup/MemberRoleEditPopup';
import InvitationsFilter from '@/components/shared/filters/InvitationsFilter';
import { InvitationsTable } from '@/components/shared/tables/InvitationsTable';
import StaticMethodConfirm from '@/components/modal/static-method-confirm';
import {
  BoardInvitation,
  BoardMemberRole,
  EntityId,
  InvitationListParams,
  UserBoardMember,
  UsersBoardParams,
} from '@/config/interface';
import { usePagination } from '@/hooks/use-pagination';
import { useUserBoard } from '@/hooks/use-user-board';
import { useBoardRole } from '@/hooks/use-board-role';
import { useBoardInvitations } from '@/hooks/use-invitation';
import type { InvitationFormData } from '@/validation/invitation-form-schemas';
import { SectionHeader } from './SectionHeader';

export const MembersTab: React.FC<{ boardId: EntityId }> = ({ boardId }) => {
  const { t } = useTranslation();
  const { isManager } = useBoardRole(boardId);
  const { page, limit, setPage, setLimit, apiParams } = usePagination();
  const invitationPagination = usePagination();
  const [searchParamsState, setSearchParamsState] =
    useState<UsersBoardParams>();
  const [invitationParams, setInvitationParams] =
    useState<InvitationListParams>();
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserBoardMember | null>(
    null
  );

  const staffParams: UsersBoardParams = {
    ...apiParams,
    ...searchParamsState,
  };

  const {
    listUser,
    isLoading,
    listError,
    refetchList,
    updateMemberRole,
    isUpdateRolePending,
    removeMember,
  } = useUserBoard(boardId, staffParams);

  const {
    invitationsData,
    isInvitationsLoading,
    isInvitationsFetching,
    invitationListError,
    refetchInvitationList,
    createInvitation,
    isCreateInvitationPending,
    revokeInvitation,
    isRevokeInvitationPending,
    resendInvitation,
    isResendInvitationPending,
  } = useBoardInvitations(boardId, invitationParams, { enabled: isManager });

  const handleSearch = (params: UsersBoardParams) => {
    setSearchParamsState(params);
    setPage(1);
  };

  const handleInvitationSearch = (params: InvitationListParams) => {
    setInvitationParams(params);
    invitationPagination.setPage(1);
  };

  const handleCreateInvitation = async (data: InvitationFormData) => {
    await createInvitation(data);
    setIsInvitationDialogOpen(false);
    invitationPagination.setPage(1);
  };

  const handleRevokeInvitation = (invitation: BoardInvitation) => {
    StaticMethodConfirm.open({
      title: t('settings.invitations.revokeModal.title'),
      content: t('settings.invitations.revokeModal.content', {
        email: invitation.email,
      }),
      okText: t('settings.invitations.revokeModal.okText'),
      cancelText: t('common.cancel'),
      type: 'delete',
      onOk: async () => {
        await revokeInvitation(invitation.id);
      },
    });
  };

  const handleResendInvitation = (invitation: BoardInvitation) => {
    StaticMethodConfirm.open({
      title: t('settings.invitations.resendModal.title'),
      content: t('settings.invitations.resendModal.content', {
        email: invitation.email,
      }),
      okText: t('settings.invitations.resendModal.okText'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        await resendInvitation(invitation.id);
      },
    });
  };

  const handleEditRole = (member: UserBoardMember) => {
    setEditingMember(member);
    setIsEditRoleDialogOpen(true);
  };

  const handleRemoveMember = (member: UserBoardMember) => {
    StaticMethodConfirm.open({
      title: t('settings.members.removeModal.title'),
      content: t('settings.members.removeModal.content', {
        name: member.displayName || member.username,
      }),
      okText: t('settings.members.removeModal.okText'),
      cancelText: t('common.cancel'),
      type: 'delete',
      onOk: async () => {
        await removeMember(member.userId);
      },
    });
  };

  const handleUpdateMemberRole = async (
    userId: number,
    role: BoardMemberRole
  ) => {
    await updateMemberRole({ userId, role });
    setIsEditRoleDialogOpen(false);
    setEditingMember(null);
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('settings.members.heading')}
        description={t('settings.members.hint')}
        action={
          isManager && (
            <Button
              variant="primary"
              onClick={() => setIsInvitationDialogOpen(true)}
            >
              <UserPlus />
              {t('settings.members.actions.invite')}
            </Button>
          )
        }
      />

      <MembersFilter onSearch={handleSearch} />

      {listUser ? (
        <MembersTable
          boardId={boardId}
          listUser={listUser}
          isListLoading={isLoading}
          listError={listError}
          refetchList={refetchList}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          onEditRole={handleEditRole}
          onRemove={handleRemoveMember}
          canManage={isManager}
        />
      ) : null}

      {isManager && (
        <section className="space-y-4 pt-4">
          <div className="min-w-0">
            <h3 className="text-[17px] font-bold tracking-[-0.01em] text-ink">
              {t('settings.invitations.heading')}
            </h3>
            <p className="mt-0.5 max-w-[60ch] text-sm text-muted">
              {t('settings.invitations.hint')}
            </p>
          </div>

          <InvitationsFilter onSearch={handleInvitationSearch} />

          <InvitationsTable
            data={invitationsData}
            loading={isInvitationsLoading || isInvitationsFetching}
            error={invitationListError}
            refetch={refetchInvitationList}
            page={invitationPagination.page}
            limit={invitationPagination.limit}
            onPageChange={invitationPagination.setPage}
            onPageSizeChange={invitationPagination.setLimit}
            onRevoke={handleRevokeInvitation}
            onResend={handleResendInvitation}
            isActionPending={isRevokeInvitationPending}
            isResendPending={isResendInvitationPending}
          />
        </section>
      )}

      <InvitationCreatePopup
        open={isInvitationDialogOpen}
        onOpenChange={setIsInvitationDialogOpen}
        onSubmit={handleCreateInvitation}
        isPending={isCreateInvitationPending}
      />

      <MemberRoleEditPopup
        open={isEditRoleDialogOpen}
        onOpenChange={setIsEditRoleDialogOpen}
        member={editingMember}
        onSubmit={handleUpdateMemberRole}
        isPending={isUpdateRolePending}
      />
    </div>
  );
};
