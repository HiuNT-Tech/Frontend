'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import { AppLogo } from '@/components/layout/sidebar-item';
import {
  LanguageSync,
  SUPPORTED_LANGS,
  useLanguage,
} from '@/components/layout/account-menu';
import { Segmented } from '@/components/ui/segmented';

export const LEGAL_DOMAIN = 'taskboardly.com';
export const LEGAL_CONTACT_EMAIL = 'hieunguyenby04@gmail.com';

export type LegalDoc = 'privacy' | 'terms';

/** Thứ tự mục của từng văn bản; nội dung nằm ở `legal.<doc>.sections.<key>` */
export const LEGAL_SECTIONS: Record<LegalDoc, string[]> = {
  privacy: [
    'collect',
    'use',
    'share',
    'storage',
    'cookies',
    'security',
    'rights',
    'children',
    'changes',
    'contact',
  ],
  terms: [
    'acceptance',
    'service',
    'account',
    'content',
    'acceptableUse',
    'ai',
    'termination',
    'liability',
    'changes',
    'law',
    'contact',
  ],
};

function LanguageSwitch() {
  const { t } = useTranslation();
  const { current, change } = useLanguage();

  return (
    <Segmented
      size="sm"
      onCanvas
      label={t('legal.language')}
      value={current}
      onChange={change}
      options={SUPPORTED_LANGS.map(lng => ({
        value: lng,
        label: lng.toUpperCase(),
      }))}
    />
  );
}

/*
 * Trang văn bản pháp lý công khai (không cần đăng nhập): Google OAuth và người
 * dùng mở được trực tiếp. Mỗi mục có `title`, tuỳ chọn `body` (trước danh sách),
 * `items` (mảng) và `note` (sau danh sách).
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const { t } = useTranslation();
  const vars = {
    appName: t('shell.appName'),
    domain: LEGAL_DOMAIN,
    email: LEGAL_CONTACT_EMAIL,
  };
  const other: LegalDoc = doc === 'privacy' ? 'terms' : 'privacy';

  return (
    <div className="min-h-dvh bg-bg px-4 pt-8 pb-[max(3rem,env(safe-area-inset-bottom))] md:px-6 md:pt-12">
      <Suspense>
        <LanguageSync />
      </Suspense>
      <div className="mx-auto w-full max-w-[760px] animate-fade-in">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/login"
            className="flex items-center gap-2.5 rounded-md text-ink"
          >
            <AppLogo size={32} />
            <span className="text-[16px] leading-none font-bold tracking-[-0.01em]">
              {vars.appName}
            </span>
          </Link>
          <Suspense>
            <LanguageSwitch />
          </Suspense>
        </header>

        <main className="rounded-card border border-line bg-card px-6 py-8 shadow-card sm:px-10 sm:py-10">
          <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em] text-balance text-ink">
            {t(`legal.${doc}.title`)}
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {t('legal.lastUpdated', { date: t('legal.updatedDate') })}
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
            {t(`legal.${doc}.intro`, vars)}
          </p>

          {LEGAL_SECTIONS[doc].map((key, index) => {
            const base = `legal.${doc}.sections.${key}`;
            const body = t(`${base}.body`, { ...vars, defaultValue: '' });
            const note = t(`${base}.note`, { ...vars, defaultValue: '' });
            const items: unknown = t(`${base}.items`, {
              ...vars,
              returnObjects: true,
              defaultValue: [],
            });

            return (
              <section key={key} className="mt-8">
                <h2 className="text-[17px] leading-snug font-semibold text-ink">
                  {index + 1}. {t(`${base}.title`)}
                </h2>
                {body && (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                    {body}
                  </p>
                )}
                {Array.isArray(items) && items.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-muted">
                    {items.map(item => (
                      <li key={String(item)}>{String(item)}</li>
                    ))}
                  </ul>
                )}
                {note && (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                    {note}
                  </p>
                )}
              </section>
            );
          })}
        </main>

        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-muted">
          <Link
            href={`/${other}`}
            className="font-medium text-accent transition-colors duration-200 ease-soft hover:text-accent-hover"
          >
            {t(`legal.${other}Link`)}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            href="/login"
            className="font-medium text-accent transition-colors duration-200 ease-soft hover:text-accent-hover"
          >
            {t('legal.backToApp')}
          </Link>
        </footer>
      </div>
    </div>
  );
}
