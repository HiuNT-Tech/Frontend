'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { AiSuggestDescriptionButton } from '@/components/ai-assistant/ai-suggest-description-button';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Group } from '@/components/ui/surface';
import { Pane, PaneContent } from '@/components/layout/pane';
import { PRIORITY } from '@/config/enum';
import { useVersion } from '@/hooks/use-version';
import { useColumn } from '@/hooks/use-column';
import { useIssueType } from '@/hooks/use-issue-type';
import { useCardDetail } from '@/hooks/use-card-detail';
import { useUserBoard } from '@/hooks/use-user-board';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useCurrentProject } from '@/hooks/use-current-project';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/use-media-query';
import {
  AttachmentUploader,
  ExistingAttachmentsList,
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_FILE_SIZE,
  ATTACHMENT_MAX_FILES,
  buildUploadErrorMessages,
} from '@/components/shared/attachment-uploader';
import { BoardService } from '@/lib/apis/board';
import { CardService } from '@/lib/apis/card';
import { toastHelpers } from '@/hooks/use-toast';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentUser } from '@/redux/user/userSlice';
import { cn } from '@/lib/utils';
import { PreviewIssue } from './preview-issue';
import {
  EditableMetadata,
  EditableTitle,
  type EditFormData,
} from '../issues/[id]/edit-form-fields';
import type {
  Card,
  CreateNewCardRequest,
  EntityId,
  UpdateCardRequest,
  User,
} from '@/config/interface';
import {
  toEntityIdOrNull,
  toEntityIdOrUndefined,
  toSelectValue,
} from '@/lib/entity-id';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

type AddIssueFormData = {
  title: string;
  description: string;
  status: string;
  priority: string;
  issueType: string;
  assignee: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  actualHours: string;
  version: string;
};

const EMPTY_FORM: AddIssueFormData = {
  title: '',
  description: '',
  status: '',
  priority: '',
  issueType: '',
  assignee: '',
  startDate: '',
  dueDate: '',
  estimatedHours: '',
  actualHours: '',
  version: '',
};

/** Tên trường của form này ↔ tên trường trong `EditableMetadata` (dùng chung với inspector). */
const EDIT_FIELD_MAP: Record<keyof EditFormData, keyof AddIssueFormData> = {
  title: 'title',
  description: 'description',
  columnId: 'status',
  priority: 'priority',
  issueTypeId: 'issueType',
  assigneeUserId: 'assignee',
  versionId: 'version',
  startDate: 'startDate',
  dueDate: 'dueDate',
  estimatedHours: 'estimatedHours',
  actualHours: 'actualHours',
};

export default function AddIssuePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const currentUser = useAppSelector(selectCurrentUser);
  const { code: projectCode, title: projectTitle } = useCurrentProject();
  const isWide = useMediaQuery(BREAKPOINTS.wide);

  const boardId =
    toEntityIdOrUndefined(params?.projectId as string) ??
    toEntityIdOrUndefined(params?.id as string) ??
    toEntityIdOrUndefined(searchParams.get('boardId'));
  const editId = toEntityIdOrUndefined(searchParams.get('editId'));
  const isEditMode = !!editId;
  // Trạng thái đặt sẵn từ URL (vd. nút "+" trên một cột của board).
  const presetStatus =
    searchParams.get('columnId') ?? searchParams.get('status') ?? '';

  const { versions } = useVersion(boardId);
  const { columns } = useColumn(boardId);
  const { issueTypes } = useIssueType(boardId);
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });
  const { card: editCard } = useCardDetail(isEditMode ? editId : undefined);

  const [formData, setFormData] = useState<AddIssueFormData>(() => ({
    ...EMPTY_FORM,
    status: presetStatus,
  }));
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const {
    files: attachmentFiles,
    previews: attachmentPreviews,
    error: attachmentError,
    isProcessing: isAttachmentProcessing,
    handleFileChange: handleAttachmentChange,
    removeFile: removeAttachment,
    clearFiles: clearAttachments,
  } = useFileUpload({
    allowedTypes: ATTACHMENT_ALLOWED_TYPES,
    maxFileSize: ATTACHMENT_MAX_FILE_SIZE,
    maxFiles: ATTACHMENT_MAX_FILES,
    errorMessages: buildUploadErrorMessages(t),
  });

  // Attachment cũ đánh dấu gỡ khi sửa ticket (chỉ áp dụng edit mode)
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<EntityId[]>(
    []
  );
  const toggleRemoveExistingAttachment = (id: EntityId) => {
    setRemovedAttachmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (isEditMode && editCard && !isFormInitialized) {
      const formatDateForInput = (value?: string | number | null) => {
        if (!value) return '';
        return dayjs(value).format('YYYY-MM-DD');
      };

      setFormData({
        title: editCard.title ?? '',
        description: editCard.description ?? '',
        status: toSelectValue(editCard.columnId),
        priority: editCard.priority != null ? String(editCard.priority) : '',
        issueType: toSelectValue(editCard.issueTypeId),
        assignee: toSelectValue(editCard.assigneeUserId),
        startDate: formatDateForInput(editCard.startDate),
        dueDate: formatDateForInput(editCard.dueDate),
        estimatedHours: editCard.estimatedHours ?? '',
        actualHours: editCard.actualHours ?? '',
        version: editCard.versionId ? String(editCard.versionId) : '',
      });
      setIsFormInitialized(true);
    }
  }, [isEditMode, editCard, isFormInitialized]);

  // Tạo mới mà chưa chọn trạng thái → mặc định cột đầu tiên của board.
  useEffect(() => {
    if (isEditMode || columns.length === 0) return;
    setFormData(prev => {
      if (prev.status && columns.some(c => String(c.id) === prev.status))
        return prev;
      return { ...prev, status: String(columns[0].id) };
    });
  }, [columns, isEditMode]);

  const STATUS_OPTIONS = columns.map(column => ({
    value: String(column.id),
    label: column.title,
  }));

  const VERSION_OPTIONS = versions.map(version => ({
    value: String(version.id),
    label: version.name,
  }));

  const USER_OPTIONS = useMemo(
    () =>
      listUser.items.map(user => ({
        value: String(user.userId),
        label:
          user.displayName ||
          user.username ||
          user.email ||
          String(user.userId),
      })),
    [listUser.items]
  );

  const userMap = useMemo(
    () =>
      new Map(
        listUser.items.map(user => [
          user.userId,
          user.displayName ||
            user.username ||
            user.email ||
            String(user.userId),
        ])
      ),
    [listUser.items]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createNewCard } = useMutation({
    mutationFn: async (card: CreateNewCardRequest) => {
      return await BoardService.createNewCard(card);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      clearAttachments();
      toastHelpers.success({ title: t('toast.success.cardCreated') });
      router.back();
    },
  });

  const { mutateAsync: updateCard } = useMutation({
    mutationFn: async (data: UpdateCardRequest) => {
      return await CardService.update(editId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-detail', editId] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      clearAttachments();
      setRemovedAttachmentIds([]);
      toastHelpers.success({ title: t('issueDetail.updateSuccess') });
      router.back();
    },
  });

  const titleMissing = !formData.title.trim();
  const statusMissing = !formData.status;

  const handleSubmit = async (
    e?: React.FormEvent | React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.preventDefault();
    if (!formData.title || !formData.status) {
      setSubmitAttempted(true);
      setIsPreviewing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        const updatePayload: UpdateCardRequest = {
          title: formData.title.trim(),
          ...(formData.status && {
            columnId: toEntityIdOrUndefined(formData.status),
          }),
        };

        const desc = formData.description?.trim();
        updatePayload.description = desc || null;
        updatePayload.priority = formData.priority
          ? Number(formData.priority)
          : null;
        updatePayload.issueTypeId = toEntityIdOrNull(formData.issueType);
        updatePayload.versionId = toEntityIdOrNull(formData.version);
        updatePayload.assigneeUserId = toEntityIdOrNull(formData.assignee);
        updatePayload.startDate = formData.startDate || null;
        updatePayload.dueDate = formData.dueDate || null;
        updatePayload.estimatedHours = formData.estimatedHours?.trim() || null;
        updatePayload.actualHours = formData.actualHours?.trim() || null;
        if (attachmentFiles.length > 0) {
          updatePayload.attachments = attachmentFiles;
        }
        if (removedAttachmentIds.length > 0) {
          updatePayload.removeAttachmentIds = removedAttachmentIds;
        }

        await updateCard(updatePayload);
      } else {
        const payload: CreateNewCardRequest = {
          boardId: boardId!,
          columnId: toEntityIdOrUndefined(formData.status)!,
          title: formData.title.trim(),
          ...(formData.description && { description: formData.description }),
          ...(formData.priority && { priority: Number(formData.priority) }),
          ...(formData.issueType && {
            issueTypeId: toEntityIdOrUndefined(formData.issueType),
          }),
          ...(formData.version && {
            versionId: toEntityIdOrUndefined(formData.version),
          }),
          ...(formData.assignee && {
            assigneeUserId: toEntityIdOrUndefined(formData.assignee),
          }),
          ...(formData.startDate && { startDate: formData.startDate }),
          ...(formData.dueDate && { dueDate: formData.dueDate }),
          ...(formData.estimatedHours && {
            estimatedHours: formData.estimatedHours,
          }),
          ...(formData.actualHours && { actualHours: formData.actualHours }),
          ...(attachmentFiles.length > 0 && { attachments: attachmentFiles }),
        };

        await createNewCard(payload);
      }
    } catch {
      toastHelpers.error({
        title: isEditMode
          ? t('issueDetail.updateError')
          : t('addIssue.createError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AddIssueFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAssignToMyself = () => {
    if (!currentUser?.id) return;
    handleChange('assignee', String(currentUser.id));
  };

  const PRIORITY_OPTIONS = useMemo(
    () => [
      { value: String(PRIORITY.LOW), label: t('priority.low') },
      { value: String(PRIORITY.NORMAL), label: t('priority.normal') },
      { value: String(PRIORITY.HIGH), label: t('priority.high') },
    ],
    [t]
  );

  const ISSUE_TYPE_OPTIONS = issueTypes.map(issueType => ({
    value: String(issueType.id),
    label: issueType.name,
  }));

  const resolveUser = useCallback(
    (val?: EntityId | User | null, fallbackId?: EntityId) => {
      if (val && typeof val !== 'number') {
        return val.displayName || '—';
      }

      const id = val ?? fallbackId;
      return id ? (userMap.get(id) ?? t('issueDetail.unassigned')) : '—';
    },
    [t, userMap]
  );

  const previewStatusInfo = useMemo(() => {
    if (!formData.status) return null;

    const columnId = toEntityIdOrUndefined(formData.status);
    const column = columns.find(item => item.id === columnId);
    if (!column) return null;

    return {
      id: column.id,
      boardId: column.boardId,
      title: column.title,
      statusColor: column.statusColor,
    };
  }, [columns, formData.status]);

  const previewIssueTypeInfo = useMemo(() => {
    if (!formData.issueType) return null;

    const issueTypeId = toEntityIdOrUndefined(formData.issueType);
    const issueType = issueTypes.find(item => item.id === issueTypeId);
    if (!issueType) return null;

    return {
      id: issueType.id,
      boardId: boardId ?? -1,
      name: issueType.name,
      statusColor: issueType.statusColor,
    };
  }, [boardId, formData.issueType, issueTypes]);

  const previewPriorityLabel = useMemo(() => {
    if (!formData.priority) return null;
    return (
      PRIORITY_OPTIONS.find(option => option.value === formData.priority)
        ?.label ?? null
    );
  }, [PRIORITY_OPTIONS, formData.priority]);

  const previewCard = useMemo<Card>(
    () => ({
      id: editId ?? -1,
      boardId: boardId ?? -1,
      columnId: toEntityIdOrUndefined(formData.status) ?? -1,
      position: editCard?.position ?? 0,
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority ? Number(formData.priority) : null,
      assigneeUserId: toEntityIdOrNull(formData.assignee),
      assignee: null,
      issueTypeId: toEntityIdOrNull(formData.issueType),
      issueType: previewIssueTypeInfo,
      column: previewStatusInfo,
      versionId: toEntityIdOrNull(formData.version),
      startDate: formData.startDate || null,
      dueDate: formData.dueDate || null,
      estimatedHours: formData.estimatedHours || null,
      actualHours: formData.actualHours || null,
      createdAt: editCard?.createdAt ?? Date.now(),
      updatedAt: editCard?.updatedAt ?? null,
    }),
    [
      boardId,
      editCard?.createdAt,
      editCard?.position,
      editCard?.updatedAt,
      editId,
      formData.actualHours,
      formData.assignee,
      formData.description,
      formData.dueDate,
      formData.estimatedHours,
      formData.issueType,
      formData.priority,
      formData.startDate,
      formData.status,
      formData.title,
      formData.version,
      previewIssueTypeInfo,
      previewStatusInfo,
    ]
  );

  /* ── Adapter: EditableMetadata dùng tên trường của inspector ── */
  const metadataFormData = useMemo<EditFormData>(
    () => ({
      title: formData.title,
      description: formData.description,
      columnId: formData.status,
      priority: formData.priority,
      issueTypeId: formData.issueType,
      assigneeUserId: formData.assignee,
      versionId: formData.version,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      estimatedHours: formData.estimatedHours,
      actualHours: formData.actualHours,
    }),
    [formData]
  );
  const handleMetadataChange = (field: keyof EditFormData, value: string) =>
    handleChange(EDIT_FIELD_MAP[field], value);

  const titleError =
    submitAttempted && titleMissing ? t('addIssue.titleRequired') : undefined;
  const statusError =
    submitAttempted && statusMissing ? t('addIssue.statusRequired') : undefined;

  const showPreview = isPreviewing && !isEditMode;
  // Dưới 1280px bản xem trước thay thế form (bật/tắt); từ 1280px hai cột cạnh nhau.
  const formHidden = showPreview && !isWide;

  const handleBack = () => router.back();

  const submitLabel = isSubmitting
    ? t('common.loading')
    : isEditMode
      ? t('issueDetail.saveChanges')
      : t('addIssue.create');

  const preview = (
    <PreviewIssue
      card={previewCard}
      versions={versions}
      issueTypeInfo={previewIssueTypeInfo}
      statusInfo={previewStatusInfo}
      priorityLabel={previewPriorityLabel}
      resolveUser={resolveUser}
      isSubmitting={isSubmitting}
      onBack={() => setIsPreviewing(false)}
      onAdd={() => handleSubmit()}
      showActions={!isWide}
    />
  );

  return (
    <Pane
      leading={
        <IconButton aria-label={t('issueDetail.back')} onClick={handleBack}>
          <ChevronLeft />
        </IconButton>
      }
      title={isEditMode ? t('addIssue.editTitle') : t('shell.nav.newIssue')}
      subtitle={
        [projectCode, projectTitle].filter(Boolean).join(' · ') || undefined
      }
      actions={
        <>
          {!isEditMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={isPreviewing}
              onClick={() => setIsPreviewing(p => !p)}
            >
              {isPreviewing ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {isPreviewing
                  ? t('addIssue.hidePreview')
                  : t('addIssue.showPreview')}
              </span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="hidden sm:inline-flex"
          >
            {isEditMode ? t('issueDetail.cancel') : t('addIssue.discard')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <PaneContent width={showPreview && isWide ? 'default' : 'narrow'}>
        <div
          className={cn(
            'grid gap-8',
            showPreview &&
              isWide &&
              'xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start'
          )}
        >
          <form
            onSubmit={handleSubmit}
            className={cn('min-w-0 space-y-6', formHidden && 'hidden')}
          >
            {/* Tiêu đề: phần tử nổi bật duy nhất của màn */}
            <div>
              <EditableTitle
                value={formData.title}
                onChange={v => handleChange('title', v)}
                autoFocus={!isEditMode}
                className={cn(
                  'md:text-[26px]',
                  titleError && 'border-danger focus:border-danger'
                )}
              />
              {titleError && (
                <p className="mt-2 px-0.5 text-[13px] text-danger">
                  {titleError}
                </p>
              )}
            </div>

            {/* Description */}
            <Group
              title={t('addIssue.label.description')}
              cardClassName="transition-[border-color,box-shadow] duration-200 ease-soft focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]"
            >
              <MarkdownEditor
                flush
                rows={8}
                value={formData.description}
                onChange={value => handleChange('description', value)}
                placeholder={t('addIssue.placeholder.description')}
                headerActions={
                  <AiSuggestDescriptionButton title={formData.title} />
                }
              />
            </Group>

            {/* Details: nhãn trái / picker phải */}
            <Group title={t('issueDetail.sections.details')}>
              <EditableMetadata
                formData={metadataFormData}
                onChange={handleMetadataChange}
                statusOptions={STATUS_OPTIONS}
                priorityOptions={PRIORITY_OPTIONS}
                issueTypeOptions={ISSUE_TYPE_OPTIONS}
                userOptions={USER_OPTIONS}
                versionOptions={VERSION_OPTIONS}
                onAssignToMyself={
                  currentUser?.id ? handleAssignToMyself : undefined
                }
                errors={statusError ? { columnId: statusError } : undefined}
              />
            </Group>

            {/* Attachments */}
            <Group title={t('attachments.label')} cardClassName="px-4 py-3.5">
              {isEditMode && (
                <ExistingAttachmentsList
                  className="mb-3"
                  attachments={editCard?.attachments ?? []}
                  removedIds={removedAttachmentIds}
                  onToggleRemove={toggleRemoveExistingAttachment}
                />
              )}
              <AttachmentUploader
                files={attachmentFiles}
                previews={attachmentPreviews}
                error={attachmentError}
                isProcessing={isAttachmentProcessing}
                onFileChange={handleAttachmentChange}
                onRemove={removeAttachment}
              />
            </Group>

            {/* Nút phụ dưới form cho màn hẹp (toolbar chỉ còn nút chính) */}
            <div className="flex justify-end gap-2 sm:hidden">
              <Button type="button" variant="outline" onClick={handleBack}>
                {isEditMode ? t('issueDetail.cancel') : t('addIssue.discard')}
              </Button>
            </div>
          </form>

          {showPreview && (
            <aside className="min-w-0 xl:sticky xl:top-0">{preview}</aside>
          )}
        </div>
      </PaneContent>
    </Pane>
  );
}
