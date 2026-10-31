'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { Group } from '@/components/ui/surface';
import { UserAvatar } from '@/components/ui/user-avatar';
import { format } from '@/constant/format';
import { cn } from '@/lib/utils';
import { toastHelpers } from '@/hooks/use-toast';
import {
  MARKDOWN_PROSE_CLASSNAME,
  MARKDOWN_REMARK_PLUGINS,
} from '@/constant/markdown';
import { useComments } from '@/hooks/use-comment';
import { useFileUpload } from '@/hooks/use-file-upload';
import {
  AttachmentLinks,
  AttachmentUploader,
  ExistingAttachmentsList,
  ATTACHMENT_ALLOWED_TYPES,
  ATTACHMENT_MAX_FILE_SIZE,
  ATTACHMENT_MAX_FILES,
  buildUploadErrorMessages,
} from '@/components/shared/attachment-uploader';
import { SystemCommentDiff } from '@/components/shared/system-comment-diff';
import { MENTION_MARKDOWN_COMPONENTS } from '@/components/shared/mention/MentionText';
import {
  toMentionCodes,
  toMentionLabels,
  type MentionCandidate,
} from '@/components/shared/mention/mention.utils';
import type { Comment, EntityId } from '@/config/interface';

/* ─── Helpers ─── */

const markdownClassName = cn(
  MARKDOWN_PROSE_CLASSNAME,
  'text-[14px] leading-[1.6] text-ink-2'
);

/* ═══════════════════════════ Comment List ═══════════════════════════ */

export interface CommentListProps {
  cardId?: EntityId;
  currentUserId?: number;
  /** Member board để gợi ý @userCode khi sửa comment */
  mentionCandidates?: MentionCandidate[];
  className?: string;
}

interface CommentEditUpload {
  files: File[];
  previews: string[];
  error: string | null;
  isProcessing: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
}

/** Một hàng trong thẻ Activity: avatar · tên · thời gian · nội dung. */
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
  first?: boolean;
  index: number;
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
  first,
  index,
}) => {
  const { t } = useTranslation();
  const isSystem = comment.type === 'SYSTEM';
  const isEdited = !isSystem && comment.updatedAt !== comment.createdAt;

  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className={cn(
        'group animate-rise flex gap-3 px-4 py-3.5',
        !first && 'border-t border-line',
        isSystem && 'bg-fill/50'
      )}
    >
      <UserAvatar
        name={comment.user.displayName}
        src={comment.user.avatar}
        size={28}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        {/* Author row */}
        <div className="flex items-baseline gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-semibold text-ink">
              {comment.user.displayName}
            </span>
            {isSystem && (
              <span className="text-[12.5px] text-muted">
                {t('issueDetail.comments.systemUpdated')}
              </span>
            )}
            <span className="text-[12.5px] tabular-nums text-muted">
              {format.dateTime(comment.createdAt)}
              {isEdited && ` · ${t('issueDetail.comments.edited')}`}
            </span>
          </div>

          {isOwner && !isSystem && !isEditing && (
            <div className="-mr-2 -mt-1.5 flex shrink-0 items-center transition-opacity duration-200 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
              <IconButton
                size="sm"
                aria-label={t('issueDetail.comments.edit')}
                onClick={onEditStart}
              >
                <Pencil />
              </IconButton>
              <IconButton
                size="sm"
                aria-label={t('common.delete')}
                onClick={onDelete}
                className="hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 />
              </IconButton>
            </div>
          )}
        </div>

        {/* Content or inline editor */}
        {isSystem ? (
          <SystemCommentDiff content={comment.content} className="mt-1.5" />
        ) : isEditing ? (
          <div className="mt-2 space-y-3">
            <MarkdownEditor
              value={editValue}
              onChange={setEditValue}
              placeholder={t('issueDetail.comments.placeholder')}
              rows={4}
              mentionCandidates={mentionCandidates}
              onSubmit={onEditSave}
              autoFocus
            />

            {/* Existing attachments (có thể bỏ đi khi lưu) */}
            <ExistingAttachmentsList
              attachments={comment.attachments ?? []}
              removedIds={removedAttachmentIds}
              onToggleRemove={onToggleRemoveExisting}
            />

            {/* New attachments uploader + actions */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <AttachmentUploader
                files={editUpload.files}
                previews={editUpload.previews}
                error={editUpload.error}
                isProcessing={editUpload.isProcessing}
                onFileChange={editUpload.handleFileChange}
                onRemove={editUpload.removeFile}
              />
              <div className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onEditCancel}
                  disabled={isSaving}
                >
                  {t('issueDetail.cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onEditSave}
                  disabled={
                    (!editValue.trim() && editUpload.files.length === 0) ||
                    isSaving
                  }
                >
                  {isSaving ? t('common.loading') : t('issueDetail.save')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={cn(markdownClassName, 'mt-1')}>
              <ReactMarkdown
                remarkPlugins={MARKDOWN_REMARK_PLUGINS}
                components={MENTION_MARKDOWN_COMPONENTS}
              >
                {comment.content}
              </ReactMarkdown>
            </div>
            <AttachmentLinks
              attachments={comment.attachments ?? []}
              className="mt-2.5"
            />
          </>
        )}
      </div>
    </article>
  );
};

/** Skeleton có hình dạng hàng bình luận thật. */
const CommentRowsSkeleton: React.FC = () => (
  <div aria-hidden="true">
    {[0, 1].map(i => (
      <div
        key={i}
        className={cn(
          'flex gap-3 px-4 py-3.5',
          i > 0 && 'border-t border-line'
        )}
      >
        <div className="skel size-7 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skel h-3.5 w-1/3" />
          <div className="skel h-3.5 w-11/12" />
          <div className="skel h-3.5 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

export const CommentList: React.FC<CommentListProps> = ({
  cardId,
  currentUserId,
  mentionCandidates,
  className,
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
    // DB lưu @userCode; trong ô soạn hiện @[Tên] cho dễ đọc, lưu lại thì đổi về mã.
    setEditValue(toMentionLabels(comment.content, mentionCandidates ?? []));
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
        content: toMentionCodes(editValue.trim(), mentionCandidates ?? []),
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
    <Group
      title={
        isLoading
          ? t('issueDetail.sections.activity')
          : t('issueDetail.sections.activityCount', { count: total })
      }
      className={className}
    >
      {isLoading ? (
        <CommentRowsSkeleton />
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare strokeWidth={1.5} />}
          title={t('issueDetail.comments.empty')}
          description={t('issueDetail.comments.placeholder')}
          className="py-7"
        />
      ) : (
        comments.map((comment, index) => (
          <CommentItem
            key={comment.id}
            index={index}
            first={index === 0}
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
        ))
      )}
    </Group>
  );
};

/* ═══════════════════════════ Sticky Comment Bar ═══════════════════════════ */

export interface StickyCommentBarProps {
  cardId?: EntityId;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  commentValue: string;
  setCommentValue: (v: string) => void;
  isPreviewComment: boolean;
  setIsPreviewComment: (v: boolean) => void;
  /**
   * Contributor (ADMIN/PM/MEMBER) mới được comment.
   * GUEST = false → chỉ hiện thanh read-only. Khớp với BE (comment yêu cầu
   * BOARD_CONTRIBUTOR_ROLES).
   */
  canContribute?: boolean;
  /** Member board để gợi ý @userCode khi gõ comment mới */
  mentionCandidates?: MentionCandidate[];
  /** Tên + ảnh người đang đăng nhập (avatar cạnh ô soạn) */
  currentUserName?: string | null;
  currentUserAvatar?: string | null;
}

/**
 * Thanh soạn bình luận ghim ở đáy inspector: thu gọn là một ô "Viết bình luận…",
 * mở ra là editor markdown + đính kèm + nút gửi. Trường của card không còn ở đây —
 * chúng sửa tại chỗ trong thẻ Details.
 */
export const StickyCommentBar: React.FC<StickyCommentBarProps> = ({
  cardId,
  isEditing,
  setIsEditing,
  commentValue,
  setCommentValue,
  isPreviewComment,
  setIsPreviewComment,
  canContribute = false,
  mentionCandidates,
  currentUserName,
  currentUserAvatar,
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
        // Ô soạn hiện @[Tên]; BE chỉ parse @userCode nên đổi về mã trước khi gửi.
        content: toMentionCodes(commentValue.trim(), mentionCandidates ?? []),
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

  const handleCancel = () => {
    setIsEditing(false);
    setCommentValue('');
    setIsPreviewComment(false);
    clearFiles();
  };

  if (!canContribute) {
    return (
      <div className="flex-none border-t border-line bg-card px-5 py-3 text-[13px] text-muted">
        {t('issueDetail.comments.readOnly')}
      </div>
    );
  }

  return (
    <div className="flex max-h-[min(60dvh,520px)] flex-none flex-col border-t border-line bg-card">
      {/* Collapsed bar */}
      {!isEditing && (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <UserAvatar
            name={currentUserName}
            src={currentUserAvatar}
            size={28}
          />
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="press flex h-9 min-w-0 flex-1 items-center rounded-[10px] border border-line bg-card px-3 text-left text-sm text-faint transition-[border-color,background-color] duration-200 ease-soft hover:border-line-strong hover:bg-fill"
          >
            <span className="truncate">
              {t('issueDetail.comments.placeholder')}
            </span>
          </button>
        </div>
      )}

      {/* Expanded editor */}
      {isEditing && (
        <div className="animate-pop flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
            {isPreviewComment ? (
              <div
                className={cn(
                  markdownClassName,
                  'min-h-[120px] rounded-[10px] border border-line bg-fill/40 px-3.5 py-3'
                )}
              >
                {commentValue ? (
                  <ReactMarkdown
                    remarkPlugins={MARKDOWN_REMARK_PLUGINS}
                    components={MENTION_MARKDOWN_COMPONENTS}
                  >
                    {commentValue}
                  </ReactMarkdown>
                ) : (
                  <span className="text-muted">
                    {t('issueDetail.markdown.nothingToPreview')}
                  </span>
                )}
              </div>
            ) : (
              <div
                onDragOver={dragDropHandlers?.onDragOver}
                onDragLeave={dragDropHandlers?.onDragLeave}
                onDrop={dragDropHandlers?.onDrop}
                className={cn(
                  'rounded-[10px] transition-shadow duration-200 ease-soft',
                  dragDropHandlers?.isDragOver &&
                    'shadow-[0_0_0_3px_var(--accent-soft)]'
                )}
              >
                <MarkdownEditor
                  value={commentValue}
                  onChange={setCommentValue}
                  placeholder={t('issueDetail.comments.placeholder')}
                  previewable={false}
                  rows={4}
                  mentionCandidates={mentionCandidates}
                  onSubmit={() => {
                    if (canPost) handlePost();
                  }}
                  autoFocus
                />
              </div>
            )}

            {/* Attachments đã chọn + lỗi */}
            {(files.length > 0 || uploadError) && (
              <div className="mt-2.5">
                {uploadError && (
                  <p className="mb-2 text-[13px] text-danger">{uploadError}</p>
                )}
                {files.length > 0 && (
                  <AttachmentUploader
                    showButton={false}
                    files={files}
                    previews={previews}
                    isProcessing={isProcessing}
                    onFileChange={handleFileChange}
                    onRemove={removeFile}
                  />
                )}
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex flex-none flex-wrap items-center gap-2 px-4 py-3">
            <AttachmentUploader
              compact
              files={files}
              previews={previews}
              isProcessing={isProcessing}
              onFileChange={handleFileChange}
              onRemove={removeFile}
              showList={false}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={isPreviewComment}
              onClick={() => setIsPreviewComment(!isPreviewComment)}
            >
              {isPreviewComment
                ? t('issueDetail.edit')
                : t('issueDetail.comments.preview')}
            </Button>
            <span className="hidden text-[12.5px] text-muted sm:inline">
              {t('issueDetail.composer.hint')}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isCreating}
              >
                {t('issueDetail.cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canPost}
                onClick={handlePost}
              >
                {isCreating
                  ? t('common.loading')
                  : t('issueDetail.composer.postComment')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
