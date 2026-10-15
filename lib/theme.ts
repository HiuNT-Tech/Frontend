import { theme as antdTheme, type ThemeConfig } from 'antd';

export type ResolvedTheme = 'light' | 'dark';

/**
 * Giá trị cụ thể (không dùng var()) vì antd tự tính màu hover/active từ token.
 * Phải khớp với token trong app/globals.css.
 */
const PALETTE = {
  light: {
    accent: '#0f766e',
    accentHover: '#115e59',
    accentSoft: '#ccfbf1',
    bg: '#f4f4f5',
    card: '#ffffff',
    fill: '#f4f4f5',
    ink: '#18181b',
    ink2: '#3f3f46',
    muted: '#71717a',
    faint: '#a1a1aa',
    line: '#e4e4e7',
    line2: '#efeff1',
    warn: '#b45309',
    danger: '#dc2626',
    lift: '0 12px 40px rgba(24, 24, 27, 0.18)',
  },
  dark: {
    accent: '#14b8a6',
    accentHover: '#2dd4bf',
    accentSoft: 'rgba(20, 184, 166, 0.16)',
    bg: '#09090b',
    card: '#18181b',
    fill: '#27272a',
    ink: '#fafafa',
    ink2: '#d4d4d8',
    muted: '#a1a1aa',
    faint: '#71717a',
    line: '#27272a',
    line2: '#222225',
    warn: '#fbbf24',
    danger: '#f87171',
    lift: '0 12px 40px rgba(0, 0, 0, 0.6)',
  },
} as const;

export const getAntdTheme = (mode: ResolvedTheme): ThemeConfig => {
  const c = PALETTE[mode];

  return {
    algorithm:
      mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
      fontSize: 14,
      colorPrimary: c.accent,
      colorInfo: c.accent,
      colorLink: c.accent,
      colorLinkHover: c.accentHover,
      colorSuccess: c.accent,
      colorWarning: c.warn,
      colorError: c.danger,
      colorBgBase: c.card,
      colorBgContainer: c.card,
      colorBgElevated: c.card,
      colorBgLayout: c.bg,
      colorTextBase: c.ink,
      colorText: c.ink,
      colorTextSecondary: c.ink2,
      colorTextTertiary: c.muted,
      colorTextDescription: c.muted,
      colorTextPlaceholder: c.faint,
      colorTextDisabled: c.faint,
      colorBorder: c.line,
      colorBorderSecondary: c.line2,
      colorSplit: c.line,
      colorFillAlter: c.fill,
      controlItemBgHover: c.fill,
      controlItemBgActive: c.accentSoft,
      controlItemBgActiveHover: c.accentSoft,
      controlOutline: c.accentSoft,
      controlHeight: 38,
      controlHeightSM: 32,
      controlHeightLG: 44,
      borderRadius: 10,
      borderRadiusSM: 8,
      borderRadiusLG: 14,
      borderRadiusXS: 6,
      boxShadow: c.lift,
      boxShadowSecondary: c.lift,
      motionEaseOut: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      wireframe: false,
    },
    components: {
      Button: {
        fontWeight: 600,
        borderRadius: 12,
        borderRadiusSM: 10,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
      },
      Select: {
        optionSelectedBg: c.accentSoft,
        optionSelectedFontWeight: 600,
        optionActiveBg: c.fill,
      },
      Dropdown: {
        paddingBlock: 8,
        controlItemBgHover: c.fill,
      },
      Tabs: {
        itemSelectedColor: c.ink,
        itemColor: c.muted,
        itemHoverColor: c.ink,
        inkBarColor: c.accent,
        titleFontSize: 14,
      },
      Tooltip: {
        colorBgSpotlight: c.ink,
        colorTextLightSolid: c.card,
        borderRadius: 8,
      },
      Popover: {
        borderRadiusLG: 14,
      },
      Badge: {
        colorError: c.accent,
      },
      Switch: {
        colorPrimary: c.accent,
        colorPrimaryHover: c.accentHover,
      },
      DatePicker: {
        cellActiveWithRangeBg: c.accentSoft,
      },
      Typography: {
        fontSize: 14,
      },
    },
  };
};

export default getAntdTheme('light');
