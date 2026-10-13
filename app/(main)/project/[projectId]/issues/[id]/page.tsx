'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';

import { Button } from '@/components/ui/button';
import { DetailSkeleton } from '@/components/ui/skeletons';
import { useCardDetail } from '@/hooks/use-card-detail';
import { useVersion } from '@/hooks/use-version';
import { useUserBoard } from '@/hooks/use-user-board';
import { useColumn } from '@/hooks/use-column';
import { useIssueType } from '@/hooks/use-issue-type';
import { PRIORITY_OPTIONS, getIssueTypeBadgeClassName } from '@/constant/data';
import { PRIORITY } from '@/config/enum';
import { toastHelpers } from '@/hooks/use-toast';
import type { EntityId, User as UserType } from '@/config/interface';
import { toEntityIdOrNull, toEntityIdOrUndefined } from '@/lib/entity-id';
import { format } from '@/constant/format';
import { isOverdue, OVERDUE_TEXT_CLASS } from '@/utils/due-date';
import { DescriptionCard } from './description-card';
import { EditableTitle } from './edit-form-fields';
import type { EditFormData } from './edit-form-fields';
import { CommentList, StickyCommentBar } from './comment-section';
import { MentionMembersContext } from '@/components/shared/mention/MentionText';
import {
  isMentionableUserCode,
  type MentionCandidate,
} from '@/components/shared/mention/mention.utils';
import { AiCardActions } from '@/components/ai-assistant/ai-card-actions';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { getRoleFlags } from '@/hooks/use-board-role';
import dayjs from 'dayjs';

/* ─── Shared Badge ─── */

const StatusBadge: React.FC<{
  label?: string;
  statusColor?: string | null;
}> = ({ label, statusColor }) => {
  if (!label) return <span className="text-theme-neutral-7">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getIssueTypeBadgeClassName(statusColor)}`}
    >
      {label}
    </span>
  );
};

/* ─── Helpers ─── */

const toFormDate = (value?: string | number | null): string => {
  if (!value) return '';
  return dayjs(value).format('YYYY-MM-DD');
};

const cardToFormData = (
  card: NonNullable<ReturnType<typeof useCardDetail>['card']>
): EditFormData => ({
  title: card.title ?? '',
  description: card.description ?? '',
  columnId: card.columnId ? String(card.columnId) : '',
  priority: card.priority != null ? String(card.priority) : '',
  issueTypeId: card.issueTypeId ? String(card.issueTypeId) : '',
  assigneeUserId: card.assigneeUserId ? String(card.assigneeUserId) : '',
  versionId: card.versionId ? String(card.versionId) : '',
  startDate: toFormDate(card.startDate),
  dueDate: toFormDate(card.dueDate),
  estimatedHours: card.estimatedHours ?? '',
  actualHours: card.actualHours ?? '',
});

/* ═══════════════════════════════════════════════════════════════ */

export default function IssueDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const currentUser = useAppSelector(selectCurrentUser);

  const cardId = toEntityIdOrUndefined(params.id as string);
  const boardId =
    toEntityIdOrUndefined(params.projectId as string) ??
    toEntityIdOrUndefined(searchParams.get('boardId'));

  /* ── Data hooks ── */
  const { card, isLoading, error, updateCard, isUpdating } =
    useCardDetail(cardId);
  const { versions } = useVersion(boardId, { skip: 0, limit: 100 });
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });
  // Vai trò của người dùng hiện tại trên board (nguồn: danh sách member đã fetch).
  const myBoardRole =
    listUser.items.find(m => m.userId === currentUser?.id)?.role ?? null;
  const { isContributor } = getRoleFlags(myBoardRole);
  const { columns } = useColumn(boardId);
  const { issueTypes } = useIssueType(boardId);

  /* ── Edit mode state ── */
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    title: '',
    description: '',
    columnId: '',
    priority: '',
    issueTypeId: '',
    assigneeUserId: '',
    versionId: '',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    actualHours: '',
  });

  // Comment bar state (kept outside edit mode)
  const [commentValue, setCommentValue] = useState('');
  const [isCommentEditing, setIsCommentEditing] = useState(false);
  const [isPreviewComment, setIsPreviewComment] = useState(false);

  /* ── Populate form when entering edit mode ── */
  const enterEditMode = useCallback(() => {
    if (card) setEditFormData(cardToFormData(card));
    setIsEditMode(true);
  }, [card]);

  const cancelEditMode = useCallback(() => {
    setIsEditMode(false);
    if (card) setEditFormData(cardToFormData(card));
  }, [card]);

  const handleFieldChange = useCallback(
    (field: keyof EditFormData, value: string) => {
      setEditFormData(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  /* ── Save handler ── */
  const handleSave = useCallback(async () => {
    if (!card) return;
    try {
      const payload: Record<string, any> = {
        title: editFormData.title.trim() || undefined,
        description: editFormData.description?.trim() || null,
        columnId: toEntityIdOrNull(editFormData.columnId) ?? undefined,
        priority: editFormData.priority ? Number(editFormData.priority) : null,
        issueTypeId: toEntityIdOrNull(editFormData.issueTypeId),
        assigneeUserId: toEntityIdOrNull(editFormData.assigneeUserId),
        versionId: toEntityIdOrNull(editFormData.versionId),
        startDate: editFormData.startDate || null,
        dueDate: editFormData.dueDate || null,
        estimatedHours: editFormData.estimatedHours?.trim() || null,
        actualHours: editFormData.actualHours?.trim() || null,
      };

      await updateCard(payload);
      toastHelpers.success({ title: t('issueDetail.updateSuccess') });
      setIsEditMode(false);
    } catch {
      toastHelpers.error({ title: 'Update failed' });
    }
  }, [card, editFormData, updateCard, t]);

  /* ── Select options ── */
  const STATUS_OPTIONS = useMemo(
    () => columns.map(c => ({ value: String(c.id), label: c.title })),
    [columns]
  );
  const VERSION_OPTIONS = useMemo(
    () => versions.map(v => ({ value: String(v.id), label: v.name })),
    [versions]
  );
  const ISSUE_TYPE_OPTIONS_LIST = useMemo(
    () => issueTypes.map(it => ({ value: String(it.id), label: it.name })),
    [issueTypes]
  );
  const PRIORITY_SELECT_OPTIONS = useMemo(
    () => [
      { value: String(PRIORITY.LOW), label: t('priority.low') },
      { value: String(PRIORITY.NORMAL), label: t('priority.normal') },
      { value: String(PRIORITY.HIGH), label: t('priority.high') },
    ],
    [t]
  );
  const USER_OPTIONS = useMemo(
    () =>
      listUser.items.map(u => ({
        value: String(u.userId),
        label: u.displayName || u.username || u.email || String(u.userId),
      })),
    [listUser.items]
  );
  // Member có userCode hợp lệ mới mention được (user cũ userCode null → bỏ). GUEST vẫn mention được (README 4.3).
  const mentionCandidates = useMemo<MentionCandidate[]>(
    () =>
      listUser.items.flatMap(u =>
        isMentionableUserCode(u.userCode)
          ? [
              {
                userCode: u.userCode,
                displayName:
                  u.displayName || u.username || u.email || u.userCode,
                email: u.email,
                avatar: u.avatar,
              },
            ]
          : []
      ),
    [listUser.items]
  );
  const mentionMembers = useMemo(
    () => new Map(mentionCandidates.map(c => [c.userCode, c.displayName])),
    [mentionCandidates]
  );

  /* ── Lookup helpers ── */
  const userMap = useMemo(
    () =>
      new Map(
        listUser.items.map(u => [
          u.userId,
          u.displayName || u.username || u.email || String(u.userId),
        ])
      ),
    [listUser.items]
  );

  const resolveUser = useCallback(
    (val?: EntityId | UserType | null, fallbackId?: EntityId) => {
      if (val && typeof val !== 'number') return val.displayName || '—';
      const id = val ?? fallbackId;
      if (!id) return t('issueDetail.unassigned');
      return userMap.get(id) ?? t('issueDetail.unassigned');
    },
    [userMap, t]
  );

  const statusInfo = useMemo(() => {
    if (card?.column) return card.column;
    if (card?.columnId) {
      const col = columns.find(c => c.id === card.columnId);
      if (col)
        return {
          id: col.id,
          boardId: col.boardId,
          title: col.title,
          statusColor: col.statusColor,
        };
    }
    return null;
  }, [card, columns]);

  const issueTypeInfo = useMemo(() => {
    if (card?.issueType) return card.issueType;
    if (card?.issueTypeId) {
      const it = issueTypes.find(i => i.id === card.issueTypeId);
      if (it)
        return {
          id: it.id,
          boardId: boardId ?? -1,
          name: it.name,
          statusColor: it.statusColor,
        };
    }
    return null;
  }, [card, issueTypes, boardId]);

  const priorityLabel = useMemo(() => {
    if (!card?.priority) return null;
    return (
      PRIORITY_OPTIONS.find(o => o.value === String(card.priority))?.label ??
      null
    );
  }, [card?.priority]);

  /* ── Inline field update (for sticky comment bar) ── */
  const handleFieldUpdate = useCallback(
    async (field: string, value: any) => {
      if (!card) return;
      try {
        const payload: Record<string, any> = {};
        if (field === 'description')
          payload.description = value?.trim() || null;
        else if (field === 'priority')
          payload.priority = value ? Number(value) : null;
        else if (field === 'estimatedHours' || field === 'actualHours')
          payload[field] = value?.trim() || null;
        else if (
          ['columnId', 'assigneeUserId', 'issueTypeId', 'versionId'].includes(
            field
          )
        ) {
          payload[field] =
            field === 'assigneeUserId' && value === 'me'
              ? (currentUser?.id ?? null)
              : toEntityIdOrNull(value);
        } else payload[field] = value || null;
        await updateCard(payload);
        toastHelpers.success({ title: t('issueDetail.updateSuccess') });
      } catch {
        toastHelpers.error({ title: 'Update failed' });
      }
    },
    [card, currentUser?.id, updateCard, t]
  );

  const handleAssignToMyself = useCallback(() => {
    if (currentUser?.id) {
      handleFieldChange('assigneeUserId', String(currentUser.id));
    }
  }, [currentUser?.id, handleFieldChange]);

  const handleBack = () => {
    if (boardId) router.push(`/project/${boardId}/issues`);
    else router.back();
  };

  /* ── Loading / Error states ── */
  if (isLoading) return <DetailSkeleton />;

  if (error || !card) {
    return (
      <div className="px-6 py-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-theme-main hover:underline mb-6 cursor-pointer"
        >
          <Image
            src={Icons.ArrowLeft}
            alt=""
            width={16}
            height={16}
            className="w-4 h-4"
          />{' '}
          {t('issueDetail.back')}
        </button>
        <div className="bg-white rounded-xl border border-theme-neutral-5/60 p-12 text-center">
          <p className="text-theme-neutral-8 text-lg">
            {t('issueDetail.notFound')}
          </p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col min-h-full w-full bg-theme-neutral-3/40">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-theme-neutral-4/60 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-theme-main hover:underline cursor-pointer"
            >
              <Image
                src={Icons.ArrowLeft}
                alt=""
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </button>
            {issueTypeInfo && (
              <StatusBadge
                label={issueTypeInfo.name}
                statusColor={issueTypeInfo.statusColor}
              />
            )}
            <span className="text-sm font-mono text-theme-neutral-9">
              {format.shortKey(card.cardCode)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-theme-neutral-8">
            <span>
              Start Date:{' '}
              <strong className="text-theme-neutral-11">
                {format.date(card.startDate)}
              </strong>
            </span>
            <span>
              Due Date:{' '}
              <strong
                className={
                  isOverdue(card.dueDate)
                    ? OVERDUE_TEXT_CLASS
                    : 'text-theme-neutral-11'
                }
              >
                {format.date(card.dueDate)}
              </strong>
            </span>
            {statusInfo && (
              <StatusBadge
                label={statusInfo.title}
                statusColor={statusInfo.statusColor}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-6 py-4">
        {/* Title + Action Buttons */}
        <div className="flex items-start justify-between mb-4">
          {isEditMode ? (
            <div className="flex-1 mr-4">
              <EditableTitle
                value={editFormData.title}
                onChange={v => handleFieldChange('title', v)}
              />
            </div>
          ) : (
            <h1 className="text-xl font-bold text-theme-neutral-11 leading-tight flex-1 mr-4">
              {card.title || '—'}
            </h1>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {!isEditMode && (
              <AiCardActions
                cardId={card.id}
                cardCode={card.cardCode}
                canContribute={isContributor}
              />
            )}
            {isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-theme-neutral-5 text-theme-neutral-9 gap-1.5"
                  onClick={cancelEditMode}
                  disabled={isUpdating}
                >
                  <Image
                    src={Icons.X}
                    alt=""
                    width={14}
                    height={14}
                    className="w-3.5 h-3.5"
                  />{' '}
                  {t('issueDetail.cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-theme-main hover:bg-theme-hover text-theme-neutral-1 gap-1.5"
                  onClick={handleSave}
                  disabled={isUpdating || !editFormData.title.trim()}
                >
                  <Image
                    src={Icons.Save}
                    alt=""
                    width={14}
                    height={14}
                    className="w-3.5 h-3.5"
                  />
                  {isUpdating
                    ? t('common.loading', 'Saving...')
                    : t('issueDetail.save', 'Save')}
                </Button>
              </>
            ) : isContributor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-theme-neutral-5 text-theme-neutral-9 gap-1.5"
                onClick={enterEditMode}
              >
                <Image
                  src={Icons.Pencil}
                  alt=""
                  width={14}
                  height={14}
                  className="w-3.5 h-3.5"
                />{' '}
                {t('issueDetail.edit')}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Description + Metadata Card */}
        <DescriptionCard
          card={card}
          versions={versions}
          issueTypeInfo={issueTypeInfo}
          priorityLabel={priorityLabel}
          resolveUser={resolveUser}
          isEditMode={isEditMode}
          editFormData={editFormData}
          onFieldChange={handleFieldChange}
          statusOptions={STATUS_OPTIONS}
          priorityOptions={PRIORITY_SELECT_OPTIONS}
          issueTypeOptions={ISSUE_TYPE_OPTIONS_LIST}
          userOptions={USER_OPTIONS}
          versionOptions={VERSION_OPTIONS}
          onAssignToMyself={handleAssignToMyself}
        />

        <MentionMembersContext.Provider value={mentionMembers}>
          <CommentList
            cardId={cardId}
            currentUserId={currentUser?.id}
            mentionCandidates={mentionCandidates}
          />
        </MentionMembersContext.Provider>
      </div>

      {/* ── Sticky Comment Bar (only in read mode) ── */}
      {!isEditMode && (
        <StickyCommentBar
          card={card}
          cardId={cardId}
          isEditing={isCommentEditing}
          setIsEditing={setIsCommentEditing}
          commentValue={commentValue}
          setCommentValue={setCommentValue}
          isPreviewComment={isPreviewComment}
          setIsPreviewComment={setIsPreviewComment}
          STATUS_OPTIONS={STATUS_OPTIONS}
          USER_OPTIONS={USER_OPTIONS}
          VERSION_OPTIONS={VERSION_OPTIONS}
          handleFieldUpdate={handleFieldUpdate}
          canContribute={isContributor}
          mentionCandidates={mentionCandidates}
        />
      )}
    </div>
  );
}
