import type { Metadata } from 'next';
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

import { ConfigProvider } from 'antd';
import theme from '@/lib/theme';
import StyledComponentsRegistry from '@/lib/AntdRegistry';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthGuard } from '@/components/auth-guard';
import StoreProvider from '@/redux/StoreProvider';
import { Toaster } from '@/components/ui/toaster';
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <StoreProvider>
          <StyledComponentsRegistry>
            <ConfigProvider theme={theme}>
              <TooltipProvider>
                <AuthGuard>{children}</AuthGuard>
                <Toaster />
              </TooltipProvider>
            </ConfigProvider>
          </StyledComponentsRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
