'use client';

import { Suspense } from 'react';
import { AppSidebar } from './app-sidebar';
import { LanguageSync } from './account-menu';
import { SidebarProvider, useSidebar } from './sidebar-context';

function ShellFrame({ children }: { children: React.ReactNode }) {
  const { docked, overlayOpen, closeOverlay } = useSidebar();

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {docked && <AppSidebar />}

      {/* iPad dọc và nhỏ hơn: sidebar trượt ra phủ lên nội dung */}
      {overlayOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            aria-hidden="true"
            onClick={closeOverlay}
            className="animate-fade-in absolute inset-0 bg-backdrop"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="animate-slide-in-left relative h-full shadow-lift"
          >
            <AppSidebar overlay />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

/** Khung cửa sổ kiểu Mac: sidebar bên trái │ pane nội dung. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <LanguageSync />
      </Suspense>
      <ShellFrame>{children}</ShellFrame>
    </SidebarProvider>
  );
}
