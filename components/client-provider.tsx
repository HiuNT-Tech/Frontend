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

import { usePathname } from 'next/navigation';
import { Sidebar } from './layout/sidebar';
import { Header } from './layout/header';
import { ModalConfirmInstance } from './modal/static-method-confirm';
import { LoadingBarProvider } from './providers/LoadingBarProvider';
import { AiAssistantProvider } from './ai-assistant/ai-assistant-provider';
import { DocumentTitle } from './document-title';
import { NotificationSocketBridge } from './shared/notifications/NotificationSocketBridge';

export default function ClientProviders({
  children,
  withLayout = true,
}: ClientProvidersProps) {
  const pathname = usePathname();
  // Sidebar chỉ có nghĩa trong phạm vi một project — ngoài đó các link của nó
  // (add-issue, issues, board) không có boardId nên sẽ dẫn tới route lỗi.
  const showSidebar = pathname.startsWith('/project/');

  if (withLayout) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <LoadingBarProvider>
            <NotificationSocketBridge />
            <AiAssistantProvider>
              <div className="h-screen flex flex-col overflow-hidden">
                <DocumentTitle />
                <Header />
                <div className="flex flex-1 overflow-hidden">
                  {showSidebar && <Sidebar />}
                  <div className="flex-1 overflow-auto">{children}</div>
                </div>
                <ModalConfirmInstance />
              </div>
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
