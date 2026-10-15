import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'Backlog', template: '%s | Backlog' },
  description: 'Quản lý công việc theo board, cột và card cho nhóm của bạn.',
  applicationName: 'Backlog',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f4f5' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

import StyledComponentsRegistry from '@/lib/AntdRegistry';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthGuard } from '@/components/auth-guard';
import StoreProvider from '@/redux/StoreProvider';
import { Toaster } from '@/components/ui/toaster';
import {
  ThemeProvider,
  THEME_INIT_SCRIPT,
} from '@/components/providers/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <StoreProvider>
          <StyledComponentsRegistry>
            <ThemeProvider>
              <TooltipProvider>
                <AuthGuard>{children}</AuthGuard>
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
          </StyledComponentsRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
