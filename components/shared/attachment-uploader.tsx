'use client';

import React, { useRef } from 'react';
import { Paperclip, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Attachment, EntityId } from '@/config/interface';

/* ─── Shared upload config (dùng chung cho comment & ticket) ─── */

export const ATTACHMENT_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';

export const ATTACHMENT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

export const ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ATTACHMENT_MAX_FILES = 10;

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Xây `errorMessages` cho `useFileUpload` từ i18n. Tách ra để mọi màn
 * (comment / ticket) đều dùng chung một bộ message.
 */
export const buildUploadErrorMessages = (
  t: (key: string) => string
): {
  invalidType: string;
  fileTooLarge: string;
  maxFilesExceeded: string;
} => ({
  invalidType: t('attachments.invalidType'),
  fileTooLarge: t('attachments.fileTooLarge'),
  maxFilesExceeded: t('attachments.maxFilesExceeded'),
});

/* ─── Chip tệp (dùng cho tệp mới lẫn tệp đã có) ─── */

const FileChip: React.FC<{
  name: string;
  meta?: string;
  previewUrl?: string | null;
  isImage?: boolean;
  onRemove: () => void;
  removeLabel: string;
}> = ({ name, meta, previewUrl, isImage, onRemove, removeLabel }) => (
  <div className="relative flex max-w-[240px] items-center gap-2.5 rounded-[12px] border border-line bg-card py-1.5 pl-1.5 pr-9 shadow-hair">
    {isImage && previewUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={name}
        className="size-9 shrink-0 rounded-[8px] object-cover"
      />
    ) : (
      <span className="inline-grid size-9 shrink-0 place-items-center rounded-[8px] bg-fill text-muted">
        <FileText aria-hidden="true" className="size-4" />
      </span>
    )}
    <div className="min-w-0">
      <p className="truncate text-[12.5px] font-medium text-ink">{name}</p>
      {meta && <p className="text-[11.5px] tabular-nums text-muted">{meta}</p>}
    </div>
    <button
      type="button"
      onClick={onRemove}
      className="press absolute right-1 top-1/2 inline-grid size-7 -translate-y-1/2 place-items-center rounded-[8px] text-muted transition-colors duration-200 ease-soft hover:bg-danger-soft hover:text-danger"
      aria-label={removeLabel}
      title={removeLabel}
    >
      <X aria-hidden="true" className="size-3.5" />
    </button>
  </div>
);

/* ─── Component ─── */

export interface AttachmentUploaderProps {
  /** File mới đang chọn (từ `useFileUpload().files`) */
  files: File[];
  /** Preview URL tương ứng (từ `useFileUpload().previews`) */
  previews: string[];
  error?: string | null;
  isProcessing?: boolean;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  className?: string;
  /** Nút chọn tệp chỉ có icon (dùng trong thanh soạn bình luận chật) */
  compact?: boolean;
  /** Ẩn nút chọn tệp (khi nút đặt ở chỗ khác, chỉ cần danh sách) */
  showButton?: boolean;
  /** Ẩn danh sách tệp đã chọn (khi danh sách đặt ở chỗ khác) */
  showList?: boolean;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  files,
  previews,
  error,
  isProcessing = false,
  maxFiles = ATTACHMENT_MAX_FILES,
  accept = ATTACHMENT_ACCEPT,
  disabled = false,
  onFileChange,
  onRemove,
  className = '',
  compact = false,
  showButton = true,
  showList = true,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDisabled = disabled || isProcessing || files.length >= maxFiles;

  return (
    <div className={className}>
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={onFileChange}
      />

      {showButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(compact && 'w-8 px-0')}
          onClick={() => inputRef.current?.click()}
          disabled={isDisabled}
          aria-label={compact ? t('attachments.attach') : undefined}
          title={compact ? t('attachments.attach') : undefined}
        >
          <Paperclip aria-hidden="true" />
          {!compact && t('attachments.attach')}
        </Button>
      )}

      {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}

      {showList && files.length > 0 && (
        <div className={cn('flex flex-wrap gap-2', showButton && 'mt-3')}>
          {files.map((file, index) => (
            <FileChip
              key={`${file.name}-${index}`}
              name={file.name}
              meta={formatFileSize(file.size)}
              previewUrl={previews[index]}
              isImage={!!previews[index]}
              onRemove={() => onRemove(index)}
              removeLabel={t('common.delete')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Existing attachments (khi sửa comment / ticket) ─── */

export interface ExistingAttachmentsListProps {
  /** Danh sách attachment gốc (chưa lọc) */
  attachments: Attachment[];
  /** ID đã đánh dấu gỡ — item tương ứng sẽ bị ẩn khỏi danh sách */
  removedIds: EntityId[];
  onToggleRemove: (id: EntityId) => void;
  className?: string;
}

export const ExistingAttachmentsList: React.FC<
  ExistingAttachmentsListProps
> = ({ attachments, removedIds, onToggleRemove, className = '' }) => {
  const { t } = useTranslation();
  const kept = attachments.filter(att => !removedIds.includes(att.id));

  if (kept.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {kept.map(att => (
        <FileChip
          key={att.id}
          name={att.fileName}
          meta={att.fileSize ? formatFileSize(att.fileSize) : undefined}
          previewUrl={att.fileUrl}
          isImage={!!att.mimeType?.startsWith('image/')}
          onRemove={() => onToggleRemove(att.id)}
          removeLabel={t('common.delete')}
        />
      ))}
    </div>
  );
};

/* ─── Attachments đã lưu, chỉ xem (comment, mô tả) ─── */

export const AttachmentLinks: React.FC<{
  attachments: Attachment[];
  className?: string;
}> = ({ attachments, className }) => {
  if (attachments.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {attachments.map(att => {
        const isImage = att.mimeType?.startsWith('image/');
        return isImage ? (
          <a
            key={att.id}
            href={att.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press block overflow-hidden rounded-[10px] border border-line transition-opacity duration-200 ease-soft hover:opacity-90"
            title={att.fileName}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={att.fileUrl}
              alt={att.fileName}
              className="size-20 object-cover"
            />
          </a>
        ) : (
          <a
            key={att.id}
            href={att.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex max-w-[240px] items-center gap-2 rounded-[10px] border border-line bg-card px-2.5 py-1.5 text-[12.5px] font-medium text-ink shadow-hair transition-colors duration-200 ease-soft hover:border-line-strong hover:bg-fill"
          >
            <Paperclip
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted"
            />
            <span className="truncate">{att.fileName}</span>
          </a>
        );
      })}
    </div>
  );
};

export default AttachmentUploader;
