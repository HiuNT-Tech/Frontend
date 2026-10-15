'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { AppLogo } from '@/components/layout/sidebar-item';
import { buttonVariants } from '@/components/ui/button';
import '@/i18n';

/*
 * Hình minh hoạ là nét vẽ của chính cái board: ba cột, các thẻ, và một ô trống
 * đang được kính lúp tìm. Nét vẽ "vẽ vào" một lần (stroke-dashoffset), không lặp.
 * Mọi màu đều là token nên tự theo sáng/tối.
 */
const DRAW_CSS = `
  .er-draw { stroke-dasharray: 1; stroke-dashoffset: 0; animation: er-draw 1.1s cubic-bezier(.2,.8,.2,1) both; }
  .er-fade { animation: er-fade .5s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes er-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  @keyframes er-fade { from { opacity: 0; } }
`;

const LANES = [40, 136, 232];
const CARDS = [
  [104, 148],
  [104, 148],
  [104, 148, 192],
];
/** [lane, card] bị thiếu */
const MISSING: [number, number] = [1, 1];

const delay = (s: number) => ({ animationDelay: `${s}s` });

function MissingCardScene({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 360 280"
      width="360"
      height="280"
      fill="none"
      role="img"
      aria-label={label}
      className="h-auto max-w-full"
    >
      {/* khung board */}
      <rect
        className="er-draw"
        pathLength="1"
        x="24"
        y="24"
        width="312"
        height="232"
        rx="16"
        fill="var(--card)"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
      />
      <line
        className="er-draw"
        pathLength="1"
        x1="24"
        y1="60"
        x2="336"
        y2="60"
        stroke="var(--line)"
        strokeWidth="1.5"
        style={delay(0.15)}
      />
      <line
        className="er-draw"
        pathLength="1"
        x1="44"
        y1="42"
        x2="112"
        y2="42"
        stroke="var(--line-strong)"
        strokeWidth="4"
        strokeLinecap="round"
        style={delay(0.2)}
      />
      <circle
        className="er-draw"
        pathLength="1"
        cx="312"
        cy="42"
        r="7"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
        style={delay(0.25)}
      />
      <circle
        className="er-draw"
        pathLength="1"
        cx="294"
        cy="42"
        r="7"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
        style={delay(0.3)}
      />

      {/* ba cột và các thẻ */}
      {LANES.map((x, li) => (
        <g key={x}>
          <rect
            className="er-draw"
            pathLength="1"
            x={x}
            y="76"
            width="88"
            height="164"
            rx="12"
            stroke="var(--line)"
            strokeWidth="1.5"
            style={delay(0.25 + li * 0.1)}
          />
          <line
            className="er-draw"
            pathLength="1"
            x1={x + 12}
            y1="92"
            x2={x + 44}
            y2="92"
            stroke="var(--line-strong)"
            strokeWidth="3"
            strokeLinecap="round"
            style={delay(0.4 + li * 0.1)}
          />
          {CARDS[li].map((y, ci) =>
            MISSING[0] === li && MISSING[1] === ci ? null : (
              <g key={y}>
                <rect
                  className="er-draw"
                  pathLength="1"
                  x={x + 8}
                  y={y}
                  width="72"
                  height="36"
                  rx="8"
                  fill="var(--card)"
                  stroke="var(--line-strong)"
                  strokeWidth="1.5"
                  style={delay(0.5 + li * 0.1 + ci * 0.08)}
                />
                <line
                  className="er-draw"
                  pathLength="1"
                  x1={x + 18}
                  y1={y + 14}
                  x2={x + 58}
                  y2={y + 14}
                  stroke="var(--line-strong)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={delay(0.65 + li * 0.1 + ci * 0.08)}
                />
                <line
                  className="er-draw"
                  pathLength="1"
                  x1={x + 18}
                  y1={y + 24}
                  x2={x + 42}
                  y2={y + 24}
                  stroke="var(--line)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={delay(0.7 + li * 0.1 + ci * 0.08)}
                />
              </g>
            )
          )}
        </g>
      ))}

      {/* ô trống của thẻ bị thiếu */}
      <rect
        className="er-fade"
        x="144"
        y="148"
        width="72"
        height="36"
        rx="8"
        stroke="var(--accent-line)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
        style={delay(0.9)}
      />

      {/* kính lúp đang tìm */}
      <circle
        className="er-draw"
        pathLength="1"
        cx="208"
        cy="196"
        r="15"
        fill="var(--card)"
        stroke="var(--accent)"
        strokeWidth="2.5"
        style={delay(1)}
      />
      <line
        className="er-draw"
        pathLength="1"
        x1="219"
        y1="207"
        x2="231"
        y2="219"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        style={delay(1.25)}
      />
    </svg>
  );
}

/** Trang 404: nằm ngoài khung app nên tự căn giữa trên nền xám. */
export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-ink md:px-6">
      <style dangerouslySetInnerHTML={{ __html: DRAW_CSS }} />

      <div className="animate-pop grid w-[min(920px,100%)] overflow-hidden rounded-sheet border border-line bg-card shadow-card md:grid-cols-2">
        {/* chữ */}
        <div className="flex min-w-0 flex-col px-7 pt-8 pb-7 md:px-11 md:pt-10 md:pb-8">
          <div className="mb-9 flex items-center gap-2.5 md:mb-11">
            <AppLogo size={32} />
            <span className="text-base font-bold tracking-[-0.01em] text-ink">
              {t('shell.appName')}
            </span>
          </div>

          <div className="mb-2.5 text-[13px] font-semibold text-muted">
            {t('notFound.kicker')}
          </div>

          <h1 className="mb-3.5 text-[28px] leading-[1.15] font-bold tracking-[-0.02em] text-balance text-ink md:text-[30px]">
            {t('notFound.heading')}
          </h1>

          <p className="mb-7 max-w-[34ch] text-[15px] leading-relaxed text-muted">
            {t('notFound.description')}
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: 'primary', size: 'md' })}
            >
              {t('notFound.goHome')}
            </Link>
          </div>
        </div>

        {/* hình: nền hơi xám hơn thẻ, hairline ngăn với phần chữ */}
        <div className="grid min-h-[280px] place-items-center border-t border-line bg-fill/60 p-6 md:min-h-[360px] md:border-t-0 md:border-l md:p-8">
          <MissingCardScene label={t('notFound.sceneLabel')} />
        </div>
      </div>
    </div>
  );
}
