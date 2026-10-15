'use client';

import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl';
  isNoPadding?: boolean;
  closeOnOverlayClick?: boolean;
}

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  xxl: 'max-w-6xl',
  '3xl': 'max-w-7xl',
} as const;

/** Sheet kiểu Apple: nền mờ tối, một bề mặt trắng bo 22px, nổi lên có độ nảy. */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  isNoPadding = false,
  closeOnOverlayClick = true,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Esc đóng (trừ khi đang chặn đóng bằng overlay, vd. đang gửi)
  useEffect(() => {
    if (!isOpen || !closeOnOverlayClick) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeOnOverlayClick, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-dvh items-center justify-center p-4 md:p-6">
        <div
          className="animate-fade-in fixed inset-0 bg-backdrop"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'animate-sheet-in relative w-full overflow-hidden rounded-sheet border border-line bg-card text-ink shadow-lift',
            SIZE_CLASSES[size]
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line py-3.5 pr-3 pl-[22px]">
            <h3
              id={titleId}
              className="min-w-0 truncate text-lg font-bold tracking-[-0.01em] text-ink"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="press grid size-8 flex-none cursor-pointer place-items-center rounded-[9px] text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className={isNoPadding ? 'p-0' : 'p-[22px]'}>{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
