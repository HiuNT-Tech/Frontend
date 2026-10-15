'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import store from '@/redux/store';

// Create a client instance
const queryClient = new QueryClient();

interface ClientProvidersProps {
  children: React.ReactNode;
  withLayout?: boolean;
}

import { AppShell } from './layout/app-shell';
import { ModalConfirmInstance } from './modal/static-method-confirm';
import { LoadingBarProvider } from './providers/LoadingBarProvider';
import { AiAssistantProvider } from './ai-assistant/ai-assistant-provider';
import { DocumentTitle } from './document-title';
import { NotificationSocketBridge } from './shared/notifications/NotificationSocketBridge';

export default function ClientProviders({
  children,
  withLayout = true,
}: ClientProvidersProps) {
  if (withLayout) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <LoadingBarProvider>
            <NotificationSocketBridge />
            <AiAssistantProvider>
              <DocumentTitle />
              <AppShell>{children}</AppShell>
              <ModalConfirmInstance />
            </AiAssistantProvider>
          </LoadingBarProvider>
        </QueryClientProvider>
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <LoadingBarProvider>
          <DocumentTitle />
          {children}
          <ModalConfirmInstance />
        </LoadingBarProvider>
      </QueryClientProvider>
    </Provider>
  );
}
