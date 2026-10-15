'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { useFileUpload } from '@/hooks/use-file-upload';

/* ─── Shared config (dùng chung cho mọi nơi cần upload 1 ảnh) ─── */

export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export const IMAGE_UPLOAD_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const IMAGE_UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/* ─── Component ─── */

export interface ImageUploadProps {
  /** URL ảnh hiện tại đã lưu (không phải preview file đang chọn) */
  value?: string | null;
  /** Upload file lên server, trả về URL ảnh đã lưu */
  onUpload: (file: File) => Promise<string>;
  /** Gọi lại sau khi upload thành công với URL mới */
  onUploaded?: (url: string) => void;
  shape?: 'circle' | 'square';
  size?: number;
  disabled?: boolean;
  alt?: string;
  /** Hiển thị khi chưa có ảnh nào (vd chữ cái đầu tên) */
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Ảnh đại diện có nút máy ảnh ở góc (accent, viền trắng) để đổi ảnh — luôn
 * hiện, không phụ thuộc hover nên dùng được trên iPad. Cả ảnh lẫn nút đều mở
 * hộp chọn file.
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onUpload,
  onUploaded,
  shape = 'circle',
  size = 64,
  disabled = false,
  alt = '',
  fallback,
  className = '',
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { files, previews, error, handleFileChange, clearFiles } =
    useFileUpload({
      allowedTypes: IMAGE_UPLOAD_ALLOWED_TYPES,
      maxFileSize: IMAGE_UPLOAD_MAX_FILE_SIZE,
      maxFiles: 1,
      errorMessages: {
        invalidType: t('imageUpload.invalidType'),
        fileTooLarge: t('imageUpload.fileTooLarge'),
      },
    });

  const onUploadRef = useRef(onUpload);
  onUploadRef.current = onUpload;
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  const pickedFile = files[0];
  // Chặn upload trùng: StrictMode chạy effect 2 lần trong dev, và mỗi lần
  // render `files` là mảng mới nên không thể chỉ dựa vào dependency.
  const uploadedFileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!pickedFile || uploadedFileRef.current === pickedFile) return;
    uploadedFileRef.current = pickedFile;

    setIsUploading(true);

    onUploadRef
      .current(pickedFile)
      .then(url => onUploadedRef.current?.(url))
      .catch(() => {
        // Lỗi đã được toast bởi axios interceptor dùng chung.
      })
      .finally(() => {
        setIsUploading(false);
        clearFiles();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedFile]);

  const displaySrc = previews[0] || value || undefined;
  const isDisabled = disabled || isUploading;
  const openPicker = () => inputRef.current?.click();
  const badgeSize = Math.max(24, Math.round(size * 0.38));

  return (
    <div className={cn('inline-flex flex-col items-start', className)}>
      <div
        className="relative inline-block"
        style={{ width: size, height: size }}
      >
        <button
          type="button"
          onClick={openPicker}
          disabled={isDisabled}
          aria-label={t('common.change')}
          className={cn(
            'press relative flex h-full w-full items-center justify-center overflow-hidden bg-fill text-ink-2 shadow-[inset_0_0_0_1px_var(--line)] transition-opacity disabled:cursor-not-allowed',
            shape === 'circle' ? 'rounded-full' : 'rounded-[12px]'
          )}
        >
          {displaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt={alt}
              className="h-full w-full object-cover"
            />
          ) : (
            fallback
          )}
          {isUploading && (
            <span className="absolute inset-0 grid place-items-center bg-backdrop">
              <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={openPicker}
          disabled={isDisabled}
          aria-label={t('common.change')}
          title={t('common.change')}
          style={{ width: badgeSize, height: badgeSize }}
          className="press absolute -right-0.5 -bottom-0.5 grid place-items-center rounded-full border-[3px] border-card bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-[46%]"
        >
          <Camera />
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          className="hidden"
          onChange={handleFileChange}
          disabled={isDisabled}
        />
      </div>

      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
};

export default ImageUpload;
