'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { BREAKPOINTS, useMediaQuery } from '@/hooks/use-media-query';

const STORAGE_KEY = 'sidebar';

interface SidebarContextValue {
  /** Màn hình ≥ 1024px: sidebar có thể ghim cạnh nội dung */
  isDesktop: boolean;
  /** Sidebar đang ghim (desktop và người dùng chưa ẩn) */
  docked: boolean;
  /** Sidebar đang mở dạng lớp phủ (màn hình hẹp hơn 1024px, vd. iPad dọc) */
  overlayOpen: boolean;
  toggle: () => void;
  closeOverlay: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery(BREAKPOINTS.desktop);
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === 'hidden');
    } catch {
      /* không có localStorage: giữ mặc định */
    }
  }, []);

  // Điều hướng xong thì đóng lớp phủ (người dùng đã chọn xong).
  useEffect(() => {
    setOverlayOpen(false);
  }, [pathname]);

  // Lên desktop thì lớp phủ không còn ý nghĩa.
  useEffect(() => {
    if (isDesktop) setOverlayOpen(false);
  }, [isDesktop]);

  // Esc đóng lớp phủ.
  useEffect(() => {
    if (!overlayOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverlayOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlayOpen]);

  const toggle = useCallback(() => {
    if (isDesktop) {
      setHidden(prev => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_KEY, next ? 'hidden' : 'open');
        } catch {
          /* bỏ qua */
        }
        return next;
      });
    } else {
      setOverlayOpen(prev => !prev);
    }
  }, [isDesktop]);

  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  const value = useMemo(
    () => ({
      isDesktop,
      docked: isDesktop && !hidden,
      overlayOpen: !isDesktop && overlayOpen,
      toggle,
      closeOverlay,
    }),
    [isDesktop, hidden, overlayOpen, toggle, closeOverlay]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
};

/** Dùng ở nơi có thể nằm ngoài khung app (vd. trang lỗi). */
export const useOptionalSidebar = () => useContext(SidebarContext);
