'use client';

import { useMemo } from 'react';
import type React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { BoardInvitationStatus } from '@/config/enum';
import {
  renderInvitationStatusBadge,
  renderMemberRoleBadge,
} from '@/constant/data';
import { useInvitationToken } from '@/hooks/use-invitation';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';

const getSafeToken = (tokenParam?: string | string[]) => {
  return Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

/** Hàng "nhãn trái, giá trị phải", các hàng cách nhau bằng đường kẻ mảnh. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-t border-line py-2.5 first:border-t-0">
      <dt className="shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words text-ink tabular-nums">
        {children}
      </dd>
    </div>
  );
}

/** Một dòng nói rõ tình trạng đăng nhập so với lời mời. */
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-fill px-3.5 py-2.5 text-[13px] leading-normal break-words text-ink-2">
      {children}
    </p>
  );
}

function InvitationSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel h-6 w-24 rounded-full" />
      <div className="skel mt-4 h-7 w-4/5" />
      <div className="skel mt-2.5 h-4 w-full" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2, 3].map(item => (
          <div key={item} className="skel h-9 w-full" />
        ))}
      </div>
      <div className="skel mt-6 h-11 w-full rounded-xl" />
    </div>
  );
}

export default function InvitationDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const currentUser = useAppSelector(selectCurrentUser);
  const token = getSafeToken(params?.token);

  const {
    invitation,
    isInvitationLoading,
    invitationError,
    refetchInvitation,
    acceptInvitation,
    isAcceptInvitationPending,
    declineInvitation,
    isDeclineInvitationPending,
  } = useInvitationToken(token);

  const invitationPath = token ? `/invitations/${token}` : '/invitations';
  const loginHref = `/login?redirect=${encodeURIComponent(invitationPath)}`;
  const registerHref = useMemo(() => {
    const query = new URLSearchParams();
    if (token) query.set('invitationToken', token);
    if (invitation?.email) query.set('email', invitation.email);
    query.set('redirect', invitationPath);
    return `/register?${query.toString()}`;
  }, [invitation?.email, invitationPath, token]);

  const isPending = invitation?.status === BoardInvitationStatus.PENDING;
  const isActionPending =
    isAcceptInvitationPending || isDeclineInvitationPending;

  const handleAccept = async () => {
    if (!currentUser) {
      router.push(loginHref);
      return;
    }

    const accepted = await acceptInvitation();
    router.push(`/project/${accepted.boardId}/issues`);
  };

  const handleDecline = async () => {
    if (!currentUser) {
      router.push(loginHref);
      return;
    }

    await declineInvitation();
  };

  if (isInvitationLoading) {
    return <InvitationSkeleton />;
  }

  if (invitationError || !invitation) {
    return (
      <div className="animate-fade-in" role="status">
        <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-ink">
          {t('invitation.loadErrorTitle')}
        </h1>
        <p className="mt-1.5 text-sm leading-normal text-muted">
          {t('invitation.loadErrorDescription')}
        </p>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="mt-6 w-full"
          onClick={() => refetchInvitation()}
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const isEmailMismatch =
    !!currentUser &&
    currentUser.email.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="animate-fade-in">
      <div>{renderInvitationStatusBadge(invitation.status, t)}</div>
      <h1 className="mt-3.5 text-2xl leading-tight font-bold tracking-[-0.02em] text-balance text-ink">
        {isPending
          ? t('invitation.heading', { board: invitation.board.title })
          : invitation.board.title}
      </h1>
      <p className="mt-1.5 text-sm leading-normal text-muted">
        {t('invitation.description', {
          boardCode: invitation.board.boardCode,
        })}
      </p>

      <dl className="mt-5 border-t border-line">
        <DetailRow label={t('invitation.emailLabel')}>
          {invitation.email}
        </DetailRow>
        <DetailRow label={t('invitation.roleLabel')}>
          {renderMemberRoleBadge(invitation.role, t)}
        </DetailRow>
        <DetailRow label={t('invitation.invitedByLabel')}>
          {invitation.invitedBy?.displayName || t('common.unknown')}
        </DetailRow>
        <DetailRow label={t('invitation.expiresAtLabel')}>
          {formatDateTime(invitation.expiresAt)}
        </DetailRow>
      </dl>

      {(currentUser || isPending) && (
        <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5">
          {currentUser && (
            <p className="text-[13px] leading-normal break-words text-muted">
              {t('invitation.authenticatedAs', { email: currentUser.email })}
            </p>
          )}

          {isEmailMismatch && isPending && (
            <Hint>
              {t('invitation.emailMismatchHint', {
                email: invitation.email,
              })}
            </Hint>
          )}

          {!currentUser && isPending && (
            <Hint>{t('invitation.unauthenticatedHint')}</Hint>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2.5">
        {isPending ? (
          currentUser ? (
            <>
              <Button
                type="button"
                size="lg"
                variant="primary"
                className="w-full"
                disabled={isActionPending}
                onClick={handleAccept}
              >
                {isAcceptInvitationPending
                  ? t('common.loading')
                  : t('invitation.accept')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                disabled={isActionPending}
                onClick={handleDecline}
              >
                {isDeclineInvitationPending
                  ? t('common.loading')
                  : t('invitation.decline')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="lg"
                variant="primary"
                className="w-full"
                onClick={() => router.push(loginHref)}
              >
                {t('invitation.signIn')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => router.push(registerHref)}
              >
                {t('invitation.createAccount')}
              </Button>
            </>
          )
        ) : (
          <Button
            type="button"
            size="lg"
            variant="primary"
            className="w-full"
            onClick={() => router.push('/dashboard')}
          >
            {t('invitation.goDashboard')}
          </Button>
        )}
      </div>
    </div>
  );
}
