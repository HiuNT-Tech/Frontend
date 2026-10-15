'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-[calc(14px+env(safe-area-inset-top))] left-1/2 z-[1100] flex h-fit w-[min(calc(100vw-32px),400px)] -translate-x-1/2 flex-col gap-2',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

/* Toast kiểu Apple: viên nổi ở giữa phía trên. Thành công/thông tin = nền ink đảo màu;
   lỗi = nền đỏ nhạt để người dùng nhận ra ngay. */
const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-[14px] py-[11px] pr-9 pl-[15px] text-sm font-medium shadow-lift transition-all data-[swipe=cancel]:translate-y-0 data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none data-[state=open]:animate-drop data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-2',
  {
    variants: {
      variant: {
        success: 'bg-ink text-card',
        error: 'border border-danger/25 bg-card text-danger',
        info: 'bg-ink text-card',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-[10px] bg-accent px-3 text-[13px] font-semibold text-on-accent transition-colors hover:bg-accent-hover focus:outline-none disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full opacity-60 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="size-3.5" aria-hidden="true" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold leading-snug', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-[13.5px] leading-snug opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
