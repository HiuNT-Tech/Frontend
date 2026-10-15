'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Group } from '@/components/ui/surface';
import { BoardInvitationStatus } from '@/config/enum';
import { renderMemberRoleBadge } from '@/constant/data';
import { useMyInvitations } from '@/hooks/use-invitation';
import type { BoardInvitation, MyBoardInvitation } from '@/config/interface';
import { cn } from '@/lib/utils';

/* ─── Một hàng lời mời ─────────────────────────────────────────────────── */

function InvitationRow({
  invitation,
  first,
  onAccept,
  onDecline,
  isAcceptPending,
  isDeclinePending,
}: {
  invitation: MyBoardInvitation;
  first: boolean;
  onAccept: (token: string) => Promise<BoardInvitation>;
  onDecline: (token: string) => Promise<BoardInvitation>;
  isAcceptPending: boolean;
  isDeclinePending: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const isPending = invitation.status === BoardInvitationStatus.PENDING;
  const busy =
    isAcceptPending || isDeclinePending || isAccepting || isDeclining;

  const handleAccept = async () => {
    if (busy) return;

    setIsAccepting(true);
    try {
      const accepted = await onAccept(invitation.token);
      router.push(`/project/${accepted.boardId}/issues`);
    } catch {
      return;
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (busy) return;

    setIsDeclining(true);
    try {
      await onDecline(invitation.token);
    } catch {
      return;
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-[54px] flex-wrap items-center gap-x-3.5 gap-y-2.5 px-[18px] py-[13px]',
        !first && 'border-t border-line'
      )}
    >
      <div className="min-w-0 flex-[1_1_14em]">
        <p className="truncate text-[15px] font-medium text-ink">
          {invitation.board.title}
          <span className="ml-2 text-[12.5px] font-normal text-muted tabular-nums">
            {invitation.board.boardCode}
          </span>
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span>
            {t('dashboard.invitations.invitedBy', {
              name: invitation.invitedBy?.displayName || t('common.unknown'),
            })}
          </span>
          <span className="text-faint">·</span>
          {renderMemberRoleBadge(invitation.role, t)}
        </div>
      </div>

      {isPending && (
        <div className="flex flex-none items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            aria-busy={isDeclining || undefined}
            onClick={() => void handleDecline()}
          >
            {t('dashboard.invitations.declineAction')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy}
            aria-busy={isAccepting || undefined}
            onClick={() => void handleAccept()}
          >
            {t('dashboard.invitations.acceptAction')}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Nhóm "Lời mời đang chờ" trên dashboard ───────────────────────────── */

export default function MyInvitationsBanner() {
  const { t } = useTranslation();
  const {
    myInvitationsData,
    isMyInvitationsLoading,
    acceptMyInvitation,
    isAcceptMyInvitationPending,
    declineMyInvitation,
    isDeclineMyInvitationPending,
  } = useMyInvitations(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const pendingInvitations = myInvitationsData.items.filter(
    inv => inv.status === BoardInvitationStatus.PENDING
  );

  if (
    isMyInvitationsLoading ||
    pendingInvitations.length === 0 ||
    isDismissed
  ) {
    return null;
  }

  return (
    <Group
      title={t('dashboard.invitations.bannerTitle')}
      action={
        <div className="-my-1.5 flex items-center gap-0.5">
          <IconButton
            size="sm"
            aria-label={
              isExpanded
                ? t('dashboard.invitations.collapse')
                : t('dashboard.invitations.expand')
            }
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(v => !v)}
          >
            {isExpanded ? (
              <ChevronUp aria-hidden="true" />
            ) : (
              <ChevronDown aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            size="sm"
            aria-label={t('dashboard.invitations.dismiss')}
            onClick={() => setIsDismissed(true)}
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
      }
      className="animate-pop"
    >
      <p className="px-[18px] py-3 text-[13px] text-muted">
        {t('dashboard.invitations.bannerHint', {
          count: pendingInvitations.length,
        })}
      </p>
      {isExpanded &&
        pendingInvitations.map(invitation => (
          <InvitationRow
            key={invitation.id}
            invitation={invitation}
            first={false}
            onAccept={acceptMyInvitation}
            onDecline={declineMyInvitation}
            isAcceptPending={isAcceptMyInvitationPending}
            isDeclinePending={isDeclineMyInvitationPending}
          />
        ))}
    </Group>
  );
}
