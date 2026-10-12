'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { AiSuggestDescriptionButton } from '@/components/ai-assistant/ai-suggest-description-button';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { PRIORITY } from '@/config/enum';
import { useVersion } from '@/hooks/use-version';
import { useColumn } from '@/hooks/use-column';
import { useIssueType } from '@/hooks/use-issue-type';
import { useCardDetail } from '@/hooks/use-card-detail';
import { useUserBoard } from '@/hooks/use-user-board';
import { useFileUpload } from '@/hooks/use-file-upload';
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
import { PreviewIssue } from './preview-issue';
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
import { isOverdue, OVERDUE_INPUT_CLASS } from '@/utils/due-date';

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

export default function AddIssuePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const currentUser = useAppSelector(selectCurrentUser);

  const boardId =
    toEntityIdOrUndefined(params?.projectId as string) ??
    toEntityIdOrUndefined(params?.id as string) ??
    toEntityIdOrUndefined(searchParams.get('boardId'));
  const editId = toEntityIdOrUndefined(searchParams.get('editId'));
  const isEditMode = !!editId;

  // useEffect(() => {
  //   if (!boardId && !isEditMode) {
  //     router.replace('/dashboard');
  //   }
  // }, [boardId, isEditMode, router]);

  const { versions } = useVersion(boardId);
  const { columns } = useColumn(boardId);
  const { issueTypes } = useIssueType(boardId);
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });
  const { card: editCard, isLoading: isLoadingCard } = useCardDetail(
    isEditMode ? editId : undefined
  );

  const [formData, setFormData] = useState<AddIssueFormData>(EMPTY_FORM);
  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

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

  const {
    mutateAsync: createNewCard,
    isPending: isCreateCardPending,
    error: createNewCardError,
  } = useMutation({
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

  const handleSubmit = async (
    e?: React.FormEvent | React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.preventDefault();
    if (!formData.title || !formData.status) return;

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
      toastHelpers.error({ title: t('toast.error.userLoginFailed') });
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

  if (isPreviewing && !isEditMode) {
    return (
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
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-theme-neutral-3/40">
      <div className="max-w-9xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-theme-neutral-12">
              {isEditMode ? t('issueDetail.edit') : t('addIssue.title')}
            </h1>
            <p className="mt-1 text-sm text-theme-neutral-9">
              {isEditMode
                ? t('addIssue.section.generalHint')
                : (t('addIssue.description') ?? '')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isEditMode) router.back();
                else setIsPreviewing(true);
              }}
              className="border-theme-neutral-5"
            >
              {isEditMode ? t('issueDetail.cancel') : t('common.preview')}
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-theme-main hover:bg-theme-hover text-theme-neutral-1"
            >
              {isSubmitting
                ? t('common.loading')
                : isEditMode
                  ? t('issueDetail.save')
                  : t('common.add')}
            </Button>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-theme-neutral-5/60 bg-theme-neutral-1 shadow-sm">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-8 px-6 py-6 md:px-8 md:py-8"
          >
            {/* General information */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-theme-neutral-9">
                  {t('addIssue.section.general') ?? 'General information'}
                </p>
                <p className="text-xs text-theme-neutral-8">
                  {t('addIssue.section.generalHint') ??
                    'Basic details to identify this issue.'}
                </p>
              </div>

              <Input
                label={t('addIssue.label.title')}
                required
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                placeholder={t('addIssue.placeholder.title')}
              />

              <MarkdownEditor
                label={t('addIssue.label.description')}
                value={formData.description}
                onChange={value => handleChange('description', value)}
                placeholder={t('addIssue.placeholder.description')}
                headerActions={
                  <AiSuggestDescriptionButton title={formData.title} />
                }
              />

              {/* Attachments */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-theme-neutral-11">
                  {t('attachments.label')}
                </p>
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
              </div>
            </div>

            <div className="h-px w-full bg-theme-neutral-4" />

            {/* Meta information */}
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-theme-neutral-9">
                  {t('addIssue.section.meta') ?? 'Issue metadata'}
                </p>
                <p className="text-xs text-theme-neutral-8">
                  {t('addIssue.section.metaHint') ??
                    'Status, assignee and time tracking.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Left column */}
                <div className="space-y-4">
                  <Select
                    label="Status"
                    options={STATUS_OPTIONS}
                    value={formData.status}
                    onValueChange={value => handleChange('status', value)}
                    placeholder="Select status"
                  />

                  <Select
                    label={t('addIssue.label.priority')}
                    options={PRIORITY_OPTIONS}
                    value={formData.priority}
                    onValueChange={value => handleChange('priority', value)}
                    placeholder={t('addIssue.placeholder.priority')}
                  />

                  <Select
                    label={t('addIssue.label.issueType')}
                    options={ISSUE_TYPE_OPTIONS}
                    value={formData.issueType}
                    onValueChange={value => handleChange('issueType', value)}
                    placeholder={t('addIssue.placeholder.issueType')}
                    showSearch={true}
                  />

                  <div>
                    <Select
                      label={t('addIssue.label.assignee')}
                      showSearch={true}
                      options={USER_OPTIONS}
                      value={formData.assignee}
                      onValueChange={value => handleChange('assignee', value)}
                      placeholder={t('addIssue.placeholder.assignee')}
                    />
                    <button
                      type="button"
                      className="mt-2 text-sm text-theme-main hover:underline cursor-pointer"
                      onClick={handleAssignToMyself}
                      disabled={!currentUser?.id}
                    >
                      {t('addIssue.myself')}
                    </button>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DatePicker
                      label={t('addIssue.label.startDate')}
                      value={formData.startDate}
                      onChange={e => handleChange('startDate', e.target.value)}
                    />
                    <DatePicker
                      label={t('addIssue.label.dueDate')}
                      value={formData.dueDate}
                      onChange={e => handleChange('dueDate', e.target.value)}
                      className={
                        isOverdue(formData.dueDate) ? OVERDUE_INPUT_CLASS : ''
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      onlyFloat
                      label={t('addIssue.label.estimatedHours')}
                      value={formData.estimatedHours}
                      onChange={e =>
                        handleChange('estimatedHours', e.target.value)
                      }
                      placeholder="e.g. 4.5"
                    />
                    <Input
                      onlyFloat
                      label={t('addIssue.label.actualHours')}
                      value={formData.actualHours}
                      onChange={e =>
                        handleChange('actualHours', e.target.value)
                      }
                      placeholder="e.g. 2.5"
                    />
                  </div>
                  <Select
                    label={t('addIssue.label.version')}
                    showSearch={true}
                    options={VERSION_OPTIONS}
                    value={formData.version}
                    onValueChange={value => handleChange('version', value)}
                    placeholder={t('addIssue.placeholder.version')}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
