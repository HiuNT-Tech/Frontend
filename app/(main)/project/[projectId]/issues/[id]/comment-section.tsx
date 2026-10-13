import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { StateMessage } from '@/components/ui/state-message';
import { format } from '@/constant/format';
import { isOverdue, OVERDUE_INPUT_CLASS } from '@/utils/due-date';
import { toastHelpers } from '@/hooks/use-toast';
import {
  MARKDOWN_PROSE_CLASSNAME,
  MARKDOWN_REMARK_PLUGINS,
} from '@/constant/markdown';
import { useComments } from '@/hooks/use-comment';
import { useFileUpload } from '@/hooks/use-file-upload';
import {
  AttachmentUploader,
  ExistingAttachmentsList,
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_FILE_SIZE,
  ATTACHMENT_MAX_FILES,
  buildUploadErrorMessages,
} from '@/components/shared/attachment-uploader';
import { SystemCommentDiff } from '@/components/shared/system-comment-diff';
import { MENTION_MARKDOWN_COMPONENTS } from '@/components/shared/mention/MentionText';
import type { MentionCandidate } from '@/components/shared/mention/mention.utils';
import type { Card, Comment, EntityId } from '@/config/interface';

/* ─── Helpers ─── */

const markdownClassName = MARKDOWN_PROSE_CLASSNAME;

/* ═══════════════════════════ Comment List ═══════════════════════════ */

export interface CommentListProps {
  cardId?: EntityId;
  currentUserId?: number;
  /** Member board để gợi ý @userCode khi sửa comment */
  mentionCandidates?: MentionCandidate[];
}

interface CommentEditUpload {
  files: File[];
  previews: string[];
  error: string | null;
  isProcessing: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
}

const CommentItem: React.FC<{
  comment: Comment;
  isOwner: boolean;
  isEditing: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onDelete: () => void;
  isSaving: boolean;
  editUpload: CommentEditUpload;
  removedAttachmentIds: EntityId[];
  onToggleRemoveExisting: (id: EntityId) => void;
  mentionCandidates?: MentionCandidate[];
}> = ({
  comment,
  isOwner,
  isEditing,
  editValue,
  setEditValue,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete,
  isSaving,
  editUpload,
  removedAttachmentIds,
  onToggleRemoveExisting,
  mentionCandidates,
}) => {
  const { t } = useTranslation();
  const isSystem = comment.type === 'SYSTEM';
  const isEdited = !isSystem && comment.updatedAt !== comment.createdAt;

  return (
    <div
      className={`rounded-lg border border-theme-neutral-5/60 p-4 ${
        isSystem ? 'bg-theme-neutral-2' : 'bg-white'
      }`}
    >
      {/* Author row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {comment.user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.user.avatar}
              alt=""
              className="w-6 h-6 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-theme-main flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {comment.user.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span className="text-sm font-semibold text-theme-neutral-11 truncate">
            {comment.user.displayName}
          </span>
          {isSystem && (
            <span className="text-xs text-theme-neutral-8 shrink-0">
              {t('issueDetail.comments.systemUpdated')}
            </span>
          )}
          <span className="text-xs text-theme-neutral-7 shrink-0">
            {format.dateTime(comment.createdAt)}
            {isEdited && ` (${t('issueDetail.comments.edited')})`}
          </span>
        </div>

        {isOwner && !isSystem && !isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onEditStart}
              className="text-xs text-theme-neutral-7 hover:text-theme-main px-1 cursor-pointer"
            >
              {t('issueDetail.edit')}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-theme-neutral-7 hover:text-red-500 px-1 cursor-pointer"
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>

      {/* Content or inline editor */}
      {isSystem ? (
        <SystemCommentDiff content={comment.content} />
      ) : isEditing ? (
        <div>
          <MarkdownEditor
            value={editValue}
            onChange={setEditValue}
            placeholder={t('issueDetail.comments.placeholder')}
            rows={4}
            mentionCandidates={mentionCandidates}
          />

          {/* Existing attachments (có thể bỏ đi khi lưu) */}
          <ExistingAttachmentsList
            className="mt-3"
            attachments={comment.attachments ?? []}
            removedIds={removedAttachmentIds}
            onToggleRemove={onToggleRemoveExisting}
          />

          {/* New attachments uploader */}
          <AttachmentUploader
            className="mt-3"
            files={editUpload.files}
            previews={editUpload.previews}
            error={editUpload.error}
            isProcessing={editUpload.isProcessing}
            onFileChange={editUpload.handleFileChange}
            onRemove={editUpload.removeFile}
          />

          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              className="bg-theme-main hover:bg-theme-hover text-theme-neutral-1"
              onClick={onEditSave}
              disabled={
                (!editValue.trim() && editUpload.files.length === 0) || isSaving
              }
            >
              {isSaving ? t('common.loading') : t('issueDetail.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-theme-neutral-5 text-theme-neutral-9"
              onClick={onEditCancel}
              disabled={isSaving}
            >
              {t('issueDetail.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={markdownClassName}>
            <ReactMarkdown
              remarkPlugins={MARKDOWN_REMARK_PLUGINS}
              components={MENTION_MARKDOWN_COMPONENTS}
            >
              {comment.content}
            </ReactMarkdown>
          </div>

          {comment.attachments && comment.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {comment.attachments.map(att => {
                const isImage = att.mimeType?.startsWith('image/');
                return isImage ? (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.fileUrl}
                      alt={att.fileName}
                      className="w-20 h-20 rounded-md object-cover border border-theme-neutral-5/60 hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 border border-theme-neutral-5 rounded-md px-2 py-1.5 text-xs text-theme-neutral-10 hover:border-theme-main transition-colors max-w-[220px]"
                  >
                    <Image
                      src={Icons.Paperclip}
                      alt=""
                      width={14}
                      height={14}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="truncate">{att.fileName}</span>
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const CommentList: React.FC<CommentListProps> = ({
  cardId,
  currentUserId,
  mentionCandidates,
}) => {
  const { t } = useTranslation();
  const {
    comments,
    total,
    isLoading,
    updateComment,
    isUpdating,
    deleteComment,
  } = useComments(cardId);

  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [editValue, setEditValue] = useState('');
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<EntityId[]>(
    []
  );

  const editUpload = useFileUpload({
    allowedTypes: ATTACHMENT_ALLOWED_TYPES,
    maxFileSize: ATTACHMENT_MAX_FILE_SIZE,
    maxFiles: ATTACHMENT_MAX_FILES,
    errorMessages: buildUploadErrorMessages(t),
  });

  const handleEditStart = (comment: Comment) => {
    setEditingId(comment.id);
    setEditValue(comment.content);
    setRemovedAttachmentIds([]);
    editUpload.clearFiles();
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setRemovedAttachmentIds([]);
    editUpload.clearFiles();
  };

  const toggleRemoveExisting = (id: EntityId) => {
    setRemovedAttachmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEditSave = async (commentId: EntityId) => {
    if (!editValue.trim() && editUpload.files.length === 0) return;
    try {
      await updateComment({
        commentId,
        content: editValue.trim(),
        attachments: editUpload.files,
        removeAttachmentIds: removedAttachmentIds,
      });
      setEditingId(null);
      setRemovedAttachmentIds([]);
      editUpload.clearFiles();
      toastHelpers.success({ title: t('issueDetail.comments.updateSuccess') });
    } catch {
      toastHelpers.error({ title: t('issueDetail.comments.postError') });
    }
  };

  const handleDelete = async (commentId: EntityId) => {
    if (!window.confirm(t('issueDetail.comments.confirmDelete'))) return;
    try {
      await deleteComment(commentId);
      toastHelpers.success({ title: t('issueDetail.comments.deleteSuccess') });
    } catch {
      toastHelpers.error({ title: t('issueDetail.comments.postError') });
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-theme-neutral-11">
          {t('issueDetail.comments.title')}{' '}
          <span className="text-theme-neutral-7 font-normal">({total})</span>
        </h2>
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse bg-theme-neutral-3 rounded-lg" />
      ) : comments.length === 0 ? (
        <StateMessage
          i18nKey="issueDetail.comments.empty"
          className="bg-white rounded-lg border border-theme-neutral-5/60 p-6 text-center text-sm text-theme-neutral-7"
        />
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwner={comment.user.id === currentUserId}
              isEditing={editingId === comment.id}
              editValue={editValue}
              setEditValue={setEditValue}
              onEditStart={() => handleEditStart(comment)}
              onEditCancel={handleEditCancel}
              onEditSave={() => handleEditSave(comment.id)}
              onDelete={() => handleDelete(comment.id)}
              isSaving={isUpdating}
              editUpload={{
                files: editUpload.files,
                previews: editUpload.previews,
                error: editUpload.error,
                isProcessing: editUpload.isProcessing,
                handleFileChange: editUpload.handleFileChange,
                removeFile: editUpload.removeFile,
              }}
              removedAttachmentIds={removedAttachmentIds}
              onToggleRemoveExisting={toggleRemoveExisting}
              mentionCandidates={mentionCandidates}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════ Sticky Comment Bar ═══════════════════════════ */

export interface StickyCommentBarProps {
  card: Card;
  cardId?: EntityId;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  commentValue: string;
  setCommentValue: (v: string) => void;
  isPreviewComment: boolean;
  setIsPreviewComment: (v: boolean) => void;
  STATUS_OPTIONS: any[];
  USER_OPTIONS: any[];
  VERSION_OPTIONS: any[];
  handleFieldUpdate: (field: string, value: any) => void;
  /**
   * Contributor (ADMIN/PM/MEMBER) mới được comment và sửa field card.
   * GUEST = false → chỉ hiện thanh read-only. Khớp với BE (comment + update
   * card yêu cầu BOARD_CONTRIBUTOR_ROLES).
   */
  canContribute?: boolean;
  /** Member board để gợi ý @userCode khi gõ comment mới */
  mentionCandidates?: MentionCandidate[];
}

export const StickyCommentBar: React.FC<StickyCommentBarProps> = ({
  card,
  cardId,
  isEditing,
  setIsEditing,
  commentValue,
  setCommentValue,
  isPreviewComment,
  setIsPreviewComment,
  STATUS_OPTIONS,
  USER_OPTIONS,
  VERSION_OPTIONS,
  handleFieldUpdate,
  canContribute = false,
  mentionCandidates,
}) => {
  const { t } = useTranslation();
  const { createComment, isCreating } = useComments(cardId);

  const {
    files,
    previews,
    error: uploadError,
    isProcessing,
    handleFileChange,
    removeFile,
    clearFiles,
    dragDropHandlers,
  } = useFileUpload({
    allowedTypes: ATTACHMENT_ALLOWED_TYPES,
    maxFileSize: ATTACHMENT_MAX_FILE_SIZE,
    maxFiles: ATTACHMENT_MAX_FILES,
    dragAndDrop: true,
    errorMessages: buildUploadErrorMessages(t),
  });

  const canPost = (!!commentValue.trim() || files.length > 0) && !isCreating;

  const handlePost = async () => {
    if (!commentValue.trim() && files.length === 0) return;
    try {
      await createComment({
        content: commentValue.trim(),
        attachments: files,
      });
      setCommentValue('');
      clearFiles();
      setIsEditing(false);
      setIsPreviewComment(false);
      toastHelpers.success({ title: t('issueDetail.comments.postSuccess') });
    } catch {
      toastHelpers.error({ title: t('issueDetail.comments.postError') });
    }
  };

  if (!canContribute) {
    return (
      <div className="sticky bottom-0 bg-white border-t border-theme-neutral-4/60 z-30">
        <div className="px-6 py-3 text-sm text-theme-neutral-7 italic">
          {t('issueDetail.comments.readOnly', 'Bạn chỉ có quyền xem (GUEST).')}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white border-t border-theme-neutral-4/60 z-30">
      {/* Collapsed bar */}
      {!isEditing && (
        <div className="px-6 py-3 flex items-center gap-3">
          <Image
            src={Icons.Paperclip}
            alt=""
            width={16}
            height={16}
            className="w-4 h-4 text-theme-neutral-7 shrink-0"
          />
          <div
            className="flex-1 border border-theme-neutral-5 rounded-md px-3 py-2 text-sm text-theme-neutral-7 cursor-text hover:border-theme-main transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {t('issueDetail.comments.placeholder')}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-theme-neutral-5 text-theme-neutral-9 gap-1.5 shrink-0"
            onClick={() => setIsEditing(true)}
          >
            <Image
              src={Icons.Pencil}
              alt=""
              width={14}
              height={14}
              className="w-3.5 h-3.5"
            />{' '}
            Change Status
          </Button>
        </div>
      )}

      {/* Expanded editor + sidebar */}
      {isEditing && (
        <div className="px-6 py-4">
          <div className="flex gap-4">
            {/* Left: editor */}
            <div className="flex-1 min-w-0">
              {/* Collapse handle */}
              <div className="flex justify-center mb-1">
                <button
                  type="button"
                  className="text-theme-neutral-5 hover:text-theme-neutral-8 cursor-pointer"
                  onClick={() => setIsEditing(false)}
                >
                  <Image
                    src={Icons.ChevronDown}
                    alt=""
                    width={16}
                    height={16}
                    className="w-4 h-4"
                  />
                </button>
              </div>

              {isPreviewComment ? (
                <div
                  className={`${markdownClassName} p-4 border border-theme-neutral-5 rounded-lg min-h-[100px] bg-theme-neutral-2/30 mb-[22px]`}
                >
                  {commentValue ? (
                    <ReactMarkdown
                      remarkPlugins={MARKDOWN_REMARK_PLUGINS}
                      components={MENTION_MARKDOWN_COMPONENTS}
                    >
                      {commentValue}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-theme-neutral-7 italic">
                      Nothing to preview
                    </span>
                  )}
                </div>
              ) : (
                <div
                  onDragOver={dragDropHandlers?.onDragOver}
                  onDragLeave={dragDropHandlers?.onDragLeave}
                  onDrop={dragDropHandlers?.onDrop}
                  className={
                    dragDropHandlers?.isDragOver
                      ? 'rounded-lg ring-2 ring-theme-main ring-offset-2 transition-shadow'
                      : ''
                  }
                >
                  <MarkdownEditor
                    value={commentValue}
                    onChange={setCommentValue}
                    placeholder={t('issueDetail.comments.placeholder')}
                    previewable={false}
                    mentionCandidates={mentionCandidates}
                  />
                </div>
              )}

              {/* Attachments: nút Attach + preview file mới */}
              <AttachmentUploader
                className="mt-3"
                files={files}
                previews={previews}
                error={uploadError}
                isProcessing={isProcessing}
                onFileChange={handleFileChange}
                onRemove={removeFile}
              />

              {/* Actions row */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-theme-neutral-5 text-theme-neutral-9"
                  onClick={() => {
                    setIsEditing(false);
                    setCommentValue('');
                    setIsPreviewComment(false);
                    clearFiles();
                  }}
                >
                  {t('issueDetail.comments.close')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-theme-neutral-5 text-theme-neutral-9 w-20"
                  onClick={() => setIsPreviewComment(!isPreviewComment)}
                >
                  {isPreviewComment
                    ? t('issueDetail.edit')
                    : t('issueDetail.comments.preview')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-theme-main hover:bg-theme-hover text-theme-neutral-1"
                  disabled={!canPost}
                  onClick={handlePost}
                >
                  {isCreating
                    ? t('common.loading')
                    : t('issueDetail.comments.post')}
                </Button>
              </div>
            </div>

            {/* Right: status sidebar */}
            <div className="w-75 shrink-0 space-y-3 text-sm">
              {/* Status */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-theme-neutral-8">
                    Status
                  </span>
                </div>
                <Select
                  options={STATUS_OPTIONS}
                  value={card.columnId ? String(card.columnId) : ''}
                  onValueChange={v => handleFieldUpdate('columnId', v)}
                  placeholder="—"
                  allowClear={false}
                  className="[&_.ant-select-selector]:h-8! [&_.ant-select-selector]:min-h-[32px]! h-8"
                />
              </div>

              {/* Assignee + Start Date row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-theme-neutral-8">
                      {t('issueDetail.metadata.assignee')}
                    </span>
                    <button
                      type="button"
                      className="text-[10px] text-theme-main hover:underline cursor-pointer"
                      onClick={() => handleFieldUpdate('assigneeUserId', 'me')}
                    >
                      {t('issueDetail.assignToMyself')}
                    </button>
                  </div>
                  <Select
                    showSearch
                    options={USER_OPTIONS}
                    value={
                      card.assigneeUserId ? String(card.assigneeUserId) : ''
                    }
                    onValueChange={v => handleFieldUpdate('assigneeUserId', v)}
                    placeholder="—"
                    className="[&_.ant-select-selector]:h-8! [&_.ant-select-selector]:min-h-[32px]! h-8"
                  />
                </div>
                <DatePicker
                  label={t('issueDetail.metadata.startDate')}
                  value={format.dateInput(card.startDate)}
                  onChange={e => handleFieldUpdate('startDate', e.target.value)}
                  className="[&.ant-picker]:h-8!"
                />
              </div>

              {/* Milestone + Due Date row */}
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label={t('issueDetail.metadata.version')}
                  showSearch
                  options={VERSION_OPTIONS}
                  value={card.versionId ? String(card.versionId) : ''}
                  onValueChange={v => handleFieldUpdate('versionId', v)}
                  placeholder="—"
                  className="[&_.ant-select-selector]:h-8! [&_.ant-select-selector]:min-h-[32px]! h-8"
                />
                <DatePicker
                  label={t('issueDetail.metadata.dueDate')}
                  value={format.dateInput(card.dueDate)}
                  onChange={e => handleFieldUpdate('dueDate', e.target.value)}
                  className={`[&.ant-picker]:h-8! ${
                    isOverdue(card.dueDate) ? OVERDUE_INPUT_CLASS : ''
                  }`}
                />
              </div>

              {/* Estimate/Actual row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-theme-neutral-8 block mb-1">
                    {t('issueDetail.metadata.estimatedHours')}
                  </label>
                  <Input
                    key={`estimatedHours-${cardId}-${card.estimatedHours ?? ''}`}
                    defaultValue={card.estimatedHours ?? ''}
                    placeholder="—"
                    className="h-8 text-sm"
                    onBlur={e => {
                      if (e.target.value !== (card.estimatedHours ?? ''))
                        handleFieldUpdate('estimatedHours', e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter')
                        (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-theme-neutral-8 block mb-1">
                    {t('issueDetail.metadata.actualHours')}
                  </label>
                  <Input
                    key={`actualHours-${cardId}-${card.actualHours ?? ''}`}
                    defaultValue={card.actualHours ?? ''}
                    placeholder="—"
                    className="h-8 text-sm"
                    onBlur={e => {
                      if (e.target.value !== (card.actualHours ?? ''))
                        handleFieldUpdate('actualHours', e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter')
                        (e.target as HTMLInputElement).blur();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
