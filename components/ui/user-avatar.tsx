'use client';

import React from 'react';

import { cn } from '@/lib/utils';

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';

  return parts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

export interface UserAvatarProps {
  /** Tên dùng để sinh chữ cái đầu khi không có ảnh */
  name?: string | null;
  src?: string | null;
  /** Kích thước (px) */
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  src,
  size = 28,
  className,
}) => {
  const initials = getInitials(name || '?');

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-fill font-semibold text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]',
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // Host của ảnh phụ thuộc storage (BE local hoặc S3) nên không dùng
        // next/image — sẽ vướng whitelist `images.remotePatterns`.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || ''}
          // Ảnh Google (lh3.googleusercontent.com) hay trả 403 khi có Referer.
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className="leading-none"
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initials}
        </span>
      )}
    </span>
  );
};

export default UserAvatar;
