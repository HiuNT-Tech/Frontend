'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Dropdown, type MenuProps } from 'antd';
import {
  ArrowLeft,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { ColorDot, ColorTag } from '@/components/ui/tag';
import { EmptyState } from '@/components/ui/empty-state';
import { Group } from '@/components/ui/surface';
import StaticMethodConfirm from '@/components/modal/static-method-confirm';
import { AttachmentLinks } from '@/components/shared/attachment-uploader';
import { useCardDetail } from '@/hooks/use-card-detail';
import { useVersion } from '@/hooks/use-version';
import { useUserBoard } from '@/hooks/use-user-board';
import { useColumn } from '@/hooks/use-column';
import { useIssueType } from '@/hooks/use-issue-type';
import { PRIORITY_OPTIONS } from '@/constant/data';
import { PRIORITY } from '@/config/enum';
import { toastHelpers } from '@/hooks/use-toast';
import type { EntityId, User as UserType } from '@/config/interface';
import { toEntityIdOrNull } from '@/lib/entity-id';
import { CardService } from '@/lib/apis/card';
import { format } from '@/constant/format';
import { cn } from '@/lib/utils';
import {
  DescriptionCard,
  DetailsCard,
  PriorityValue,
} from './description-card';
import { EditableTitle, EditableMetadata, MetaRow } from './edit-form-fields';
import type { EditFormData } from './edit-form-fields';
import { CommentList, StickyCommentBar } from './comment-section';
import { useIssueInspector } from '@/components/issues/issue-inspector';
import { SidebarToggle } from '@/components/layout/pane';
import { MentionMembersContext } from '@/components/shared/mention/MentionText';
import {
  isMentionableUserCode,
  type MentionCandidate,
} from '@/components/shared/mention/mention.utils';
import { AiCardActions } from '@/components/ai-assistant/ai-card-actions';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { getRoleFlags } from '@/hooks/use-board-role';

/* ─── Helpers ─── */

const toFormDate = (value?: string | number | null): string => {
  if (!value) return '';
  return dayjs(value).format('YYYY-MM-DD');
};

const EMPTY_FORM: EditFormData = {
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

/** Segmented chỉ vừa khi ít cột và nhãn ngắn; quá thì dùng select dạng viên thuốc. */
const SEGMENTED_MAX_COLUMNS = 4;
const SEGMENTED_MAX_CHARS = 30;

/* ─── Toolbar của inspector (56px, không cuộn) ─── */

const InspectorToolbar: React.FC<{
  left?: React.ReactNode;
  children?: React.ReactNode;
  onClose: () => void;
}> = ({ left, children, onClose }) => {
  const { t } = useTranslation();
  const fullPage = useIssueInspector()?.fullPage ?? false;
  // Trang riêng: nút mở sidebar + quay lại ở bên trái, không có nút ✕
  return (
    <div
      className={cn(
        'flex h-14 flex-none items-center gap-1 border-b border-line bg-bg',
        fullPage ? 'px-4 lg:px-5' : 'pl-5 pr-3'
      )}
    >
      <div className={cn('flex min-w-0 flex-1 items-center gap-2')}>
        {fullPage && (
          <>
            <SidebarToggle />
            <IconButton
              aria-label={t('issueDetail.back')}
              onClick={onClose}
              className="-ml-1"
            >
              <ArrowLeft />
            </IconButton>
          </>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">{left}</div>
        {fullPage && children}
      </div>
      {!fullPage && children}
      {!fullPage && (
        <IconButton aria-label={t('shell.closeDetails')} onClick={onClose}>
          <X />
        </IconButton>
      )}
    </div>
  );
};

/* ─── Skeleton có hình dạng inspector ─── */

const InspectorSkeleton: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex h-full min-h-0 flex-col bg-bg" aria-busy="true">
    <InspectorToolbar
      onClose={onClose}
      left={<div className="skel h-3.5 w-16" />}
    />
    <div className="min-h-0 flex-1 space-y-5 overflow-hidden p-5">
      <div className="flex gap-2">
        <div className="skel h-6 w-16 rounded-full" />
        <div className="skel h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skel h-6 w-11/12" />
        <div className="skel h-6 w-2/3" />
      </div>
      <div className="skel h-11 w-full rounded-xl" />
      <div className="skel h-3.5 w-14" />
      <div className="skel h-[280px] w-full rounded-card" />
      <div className="skel h-3.5 w-20" />
      <div className="skel h-28 w-full rounded-card" />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════ */

export interface IssueDetailProps {
  boardId?: EntityId;
  cardId?: EntityId;
  /** Đóng inspector (về danh sách / board) */
  onClose: () => void;
}

/**
 * Nội dung chi tiết issue, một cột, vừa 360–520px: toolbar riêng 56px, thân cuộn,
 * thanh soạn bình luận ghim đáy. Không tự đọc route param để có thể dùng lại
 * trên board.
 */
export function IssueDetail({ boardId, cardId, onClose }: IssueDetailProps) {
  const fullPage = useIssueInspector()?.fullPage ?? false;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAppSelector(selectCurrentUser);

  /* ── Data hooks ── */
  const { card, isLoading, error, updateCard, isUpdating } =
    useCardDetail(cardId);
  const { versions } = useVersion(boardId, { skip: 0, limit: 100 });
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });
  // Vai trò của người dùng hiện tại trên board (nguồn: danh sách member đã fetch).
  const myMember = listUser.items.find(m => m.userId === currentUser?.id);
  const myBoardRole = myMember?.role ?? null;
  const { isContributor } = getRoleFlags(myBoardRole);
  const { columns } = useColumn(boardId);
  const { issueTypes } = useIssueType(boardId);

  /* ── Edit mode state ── */
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>(EMPTY_FORM);

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
      toastHelpers.error({ title: t('issueDetail.updateError') });
    }
  }, [card, editFormData, updateCard, t]);

  /* ── Select options ── */
  const STATUS_OPTIONS = useMemo(
    () =>
      columns.map(c => ({
        value: String(c.id),
        label: c.title,
      })),
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
  // userCode của chính mình lấy từ danh sách member (redux User không có userCode)
  const selfUserCode = myMember?.userCode ?? null;
  const mentionMembers = useMemo(
    () => ({
      members: new Map(mentionCandidates.map(c => [c.userCode, c.displayName])),
      selfUserCode,
    }),
    [mentionCandidates, selfUserCode]
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

  /* ── Inline field update (hàng Details + status switcher) ── */
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
        toastHelpers.error({ title: t('issueDetail.updateError') });
      }
    },
    [card, currentUser?.id, updateCard, t]
  );

  const handleAssignToMyself = useCallback(() => {
    if (currentUser?.id) {
      handleFieldChange('assigneeUserId', String(currentUser.id));
    }
  }, [currentUser?.id, handleFieldChange]);

  /* ── Toolbar actions ── */
  const handleCopyLink = useCallback(async () => {
    if (!boardId || !cardId) return;
    const url = `${window.location.origin}/project/${boardId}/issues/${cardId}`;
    try {
      await navigator.clipboard.writeText(url);
      toastHelpers.success({ title: t('issueDetail.linkCopied') });
    } catch {
      toastHelpers.error({ title: t('common.error.save') });
    }
  }, [boardId, cardId, t]);

  const handleDelete = useCallback(() => {
    if (!card) return;
    const code = card.cardCode || `#${card.id}`;
    StaticMethodConfirm.open({
      title: t('issueDetail.deleteConfirmTitle'),
      content: t('issueDetail.deleteConfirmContent', { code }),
      okText: t('issueDetail.deleteIssue'),
      cancelText: t('common.cancel'),
      type: 'delete',
      onOk: async () => {
        try {
          await CardService.delete(card.id);
          queryClient.invalidateQueries({ queryKey: ['cards'] });
          queryClient.invalidateQueries({ queryKey: ['boards'] });
          toastHelpers.success({ title: t('issueDetail.deleteSuccess') });
          onClose();
        } catch {
          toastHelpers.error({ title: t('issueDetail.deleteError') });
        }
      },
    });
  }, [card, onClose, queryClient, t]);

  const moreItems = useMemo<MenuProps['items']>(() => {
    const items: MenuProps['items'] = [];
    if (isContributor) {
      items.push({
        key: 'edit',
        icon: <Pencil className="size-4" />,
        label: t('issueDetail.editIssue'),
      });
    }
    items.push({
      key: 'copy',
      icon: <Link2 className="size-4" />,
      label: t('issueDetail.copyLink'),
    });
    if (isContributor) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        icon: <Trash2 className="size-4" />,
        label: t('issueDetail.deleteIssue'),
        danger: true,
      });
    }
    return items;
  }, [isContributor, t]);

  const handleMoreClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'edit') enterEditMode();
    else if (key === 'copy') handleCopyLink();
    else if (key === 'delete') handleDelete();
  };

  /* ── Status switcher: segmented khi vừa, không thì select viên thuốc ── */
  const statusValue = card?.columnId ? String(card.columnId) : '';
  const useSegmentedStatus =
    columns.length > 0 &&
    columns.length <= SEGMENTED_MAX_COLUMNS &&
    columns.reduce((sum, c) => sum + c.title.length, 0) <= SEGMENTED_MAX_CHARS;

  /* ── Loading / Error states ── */
  if (isLoading) return <InspectorSkeleton onClose={onClose} />;

  if (error || !card) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-bg">
        <InspectorToolbar onClose={onClose} />
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <EmptyState
            card
            title={t('issueDetail.notFound')}
            description={t('issueDetail.notFoundHint')}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                {t('issueDetail.back')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const issueKey = card.cardCode
    ? format.shortKey(card.cardCode)
    : `#${card.id}`;

  /* ═══════════════════════════════════════════════════════════════ */
  /* RENDER                                                        */
  /* ═══════════════════════════════════════════════════════════════ */

  return (
    <div className="animate-pop flex h-full min-h-0 flex-col bg-bg">
      {/* ── Toolbar ── */}
      <InspectorToolbar
        onClose={onClose}
        left={
          <>
            <span className="truncate text-[13px] font-semibold tabular-nums text-muted">
              {issueKey}
            </span>
            {isEditMode && (
              <span className="truncate text-[12.5px] text-faint">
                {t('issueDetail.editing', { code: issueKey })}
              </span>
            )}
          </>
        }
      >
        {isEditMode ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelEditMode}
              disabled={isUpdating}
            >
              {t('issueDetail.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isUpdating || !editFormData.title.trim()}
            >
              {isUpdating ? t('common.loading') : t('issueDetail.saveChanges')}
            </Button>
          </>
        ) : (
          <>
            <AiCardActions
              cardId={card.id}
              cardCode={card.cardCode}
              canContribute={isContributor}
              className="mr-1"
            />
            <IconButton
              aria-label={t('issueDetail.copyLink')}
              onClick={handleCopyLink}
              className="hidden sm:inline-grid"
            >
              <Link2 />
            </IconButton>
            <Dropdown
              menu={{ items: moreItems, onClick: handleMoreClick }}
              trigger={['click']}
              placement="bottomRight"
            >
              <IconButton aria-label={t('issueDetail.moreActions')}>
                <MoreHorizontal />
              </IconButton>
            </Dropdown>
          </>
        )}
      </InspectorToolbar>

      {/* ── Body (cuộn) ── */}
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto px-5 pb-12 pt-5',
          // trang riêng: dùng toàn bộ chiều rộng pane, lề rộng hơn một chút
          fullPage && 'md:px-8'
        )}
      >
        {/* Loại + ưu tiên */}
        {!isEditMode && (issueTypeInfo || priorityLabel) && (
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5 px-0.5">
            {issueTypeInfo && (
              <ColorTag color={issueTypeInfo.statusColor}>
                {issueTypeInfo.name}
              </ColorTag>
            )}
            {priorityLabel && (
              <PriorityValue
                priority={card.priority}
                label={t('issueDetail.priorityLabel', {
                  priority: priorityLabel,
                })}
                className="text-[13px] text-muted"
              />
            )}
          </div>
        )}

        {/* Tiêu đề: phần tử nổi bật duy nhất */}
        {isEditMode ? (
          <div className="mb-5">
            <EditableTitle
              value={editFormData.title}
              onChange={v => handleFieldChange('title', v)}
              autoFocus
            />
          </div>
        ) : (
          <h1 className="mb-5 px-0.5 text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-balance text-ink">
            {card.title || '—'}
          </h1>
        )}

        {/* Status switcher (chế độ xem) */}
        {!isEditMode && (
          <section className="mb-6">
            <div className="px-1.5 pb-2 text-[13px] font-semibold text-muted">
              {t('issueDetail.metadata.status')}
            </div>
            {isContributor && useSegmentedStatus ? (
              <Segmented
                label={t('issueDetail.metadata.status')}
                onCanvas
                value={statusValue}
                onChange={v => {
                  if (v !== statusValue) handleFieldUpdate('columnId', v);
                }}
                options={columns.map(c => ({
                  value: String(c.id),
                  label: c.title,
                  icon: <ColorDot color={c.statusColor} />,
                  disabled: isUpdating,
                }))}
              />
            ) : isContributor ? (
              <Select
                options={STATUS_OPTIONS}
                value={statusValue}
                onValueChange={v => {
                  if (v && v !== statusValue) handleFieldUpdate('columnId', v);
                }}
                allowClear={false}
                disabled={isUpdating}
                placeholder={t('addIssue.placeholder.status')}
                className="rounded-full! font-semibold shadow-card"
              />
            ) : (
              <div className="flex h-11 items-center rounded-xl border border-line bg-card px-3.5 shadow-card">
                {statusInfo ? (
                  <ColorTag color={statusInfo.statusColor}>
                    {statusInfo.title}
                  </ColorTag>
                ) : (
                  <span className="text-sm text-muted">
                    {t('issueDetail.notSet')}
                  </span>
                )}
              </div>
            )}
          </section>
        )}

        {/* Details */}
        {isEditMode ? (
          <Group title={t('issueDetail.sections.details')} className="mb-6">
            <EditableMetadata
              formData={editFormData}
              onChange={handleFieldChange}
              statusOptions={STATUS_OPTIONS}
              priorityOptions={PRIORITY_SELECT_OPTIONS}
              issueTypeOptions={ISSUE_TYPE_OPTIONS_LIST}
              userOptions={USER_OPTIONS}
              versionOptions={VERSION_OPTIONS}
              onAssignToMyself={handleAssignToMyself}
            />
          </Group>
        ) : (
          <DetailsCard
            className="mb-6"
            columns={fullPage}
            card={card}
            versions={versions}
            issueTypeInfo={issueTypeInfo}
            priorityLabel={priorityLabel}
            resolveUser={resolveUser}
            hideStatus
            inline={
              isContributor
                ? {
                    statusOptions: STATUS_OPTIONS,
                    priorityOptions: PRIORITY_SELECT_OPTIONS,
                    issueTypeOptions: ISSUE_TYPE_OPTIONS_LIST,
                    userOptions: USER_OPTIONS,
                    versionOptions: VERSION_OPTIONS,
                    onFieldUpdate: handleFieldUpdate,
                  }
                : undefined
            }
          />
        )}

        {/* Description */}
        <DescriptionCard
          className="mb-6"
          card={card}
          isEditMode={isEditMode}
          editValue={editFormData.description}
          onEditChange={v => handleFieldChange('description', v)}
        />

        {/* Attachments của issue */}
        {!isEditMode && card.attachments && card.attachments.length > 0 && (
          <Group
            title={t('attachments.label')}
            className="mb-6"
            cardClassName="px-4 py-3.5"
          >
            <AttachmentLinks attachments={card.attachments} />
          </Group>
        )}

        {/* Activity */}
        {!isEditMode && (
          <MentionMembersContext.Provider value={mentionMembers}>
            <CommentList
              className="mb-6"
              cardId={cardId}
              currentUserId={currentUser?.id}
              mentionCandidates={mentionCandidates}
            />
          </MentionMembersContext.Provider>
        )}

        {/* Timestamps */}
        <Group title={t('issueDetail.sections.timestamps')}>
          <MetaRow first label={t('issueDetail.metadata.created')}>
            <span className="text-sm font-medium tabular-nums text-ink-2">
              {format.dateTime(card.createdAt)}
            </span>
          </MetaRow>
          <MetaRow label={t('issueDetail.metadata.updated')}>
            <span className="text-sm font-medium tabular-nums text-ink-2">
              {format.dateTime(card.updatedAt)}
            </span>
          </MetaRow>
        </Group>
      </div>

      {/* ── Sticky Comment Bar (only in read mode) ── */}
      {!isEditMode && (
        <div>
          <StickyCommentBar
            cardId={cardId}
            isEditing={isCommentEditing}
            setIsEditing={setIsCommentEditing}
            commentValue={commentValue}
            setCommentValue={setCommentValue}
            isPreviewComment={isPreviewComment}
            setIsPreviewComment={setIsPreviewComment}
            canContribute={isContributor}
            mentionCandidates={mentionCandidates}
            currentUserName={currentUser?.displayName}
            currentUserAvatar={currentUser?.avatar}
          />
        </div>
      )}
    </div>
  );
}

export default IssueDetail;
