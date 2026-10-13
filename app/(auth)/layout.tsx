'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Image from 'next/image';
import '@/i18n';
import { DocumentTitle } from '@/components/document-title';

// Create a client instance
const queryClient = new QueryClient();

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentTitle />
      <div className="relative min-h-screen flex flex-col items-center justify-start">
        {/* Background Image */}
        <Image
          src="/auth/login-register-bg.jpg"
          alt="Auth background"
          fill
          priority
          className="object-cover object-center -z-10"
          style={{
            filter: 'brightness(0.8)',
          }}
        />
        {/* Overlay */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            boxShadow: 'inset 0 0 0 2000px rgba(0, 0, 0, 0.2)',
          }}
        />
        {children}
      </div>
    </QueryClientProvider>
  );
}
