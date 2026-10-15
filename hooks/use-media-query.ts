'use client';

import { useSyncExternalStore } from 'react';

/** Breakpoint dùng chung cho bố cục (khớp Tailwind md / lg / xl). */
export const BREAKPOINTS = {
  /** iPad dọc trở lên */
  tablet: '(min-width: 768px)',
  /** iPad ngang / iPad Pro dọc trở lên: sidebar được ghim */
  desktop: '(min-width: 1024px)',
  /** Đủ rộng cho danh sách + inspector cạnh nhau */
  wide: '(min-width: 1280px)',
} as const;

const subscribe = (query: string) => (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/**
 * true khi media query khớp. Server render coi như màn hình desktop
 * (`serverFallback`) để bố cục đầu tiên không nhảy trên máy tính.
 */
export function useMediaQuery(query: string, serverFallback = true): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => window.matchMedia(query).matches,
    () => serverFallback
  );
}
