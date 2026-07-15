/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import 'jotai-devtools/styles.css';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { routeTree } from './routeTree.gen';
import { Toasts } from './components/ui/ToastComponent.tsx';
import './index.css';
import ThemeWrapper from './components/ui/ThemeWrapper.tsx';
import { webmailStore } from './store.ts';
import { resetLayoutCache } from './routes/_baselayout.tsx';
import { NotFound } from './components/common/NotFound.tsx';
import { MinimizedModalsProvider } from './components/common/MinimizedModalContext.tsx';
import { getCompanySlugFromPath } from './utils/routeUtils.ts';

const redirectToLogin = () => {
  const slug = getCompanySlugFromPath(window.location.pathname);
  window.location.href = slug ? `/${slug}` : '/login';
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // staleTime: 1000 * 60 * 5,
    },
  },
});

// ✅ Attach global error handler using event subscription
queryClient.getQueryCache().subscribe((event: any) => {
  if (event?.type === 'query' && event.query.state.status === 'error') {
    const error: any = event.query.state.error;
    const message = error?.message?.toLowerCase() || '';

    if (
      message.includes('session') ||
      message.includes('not found') ||
      message.includes('unauthorized')
    ) {
      localStorage.clear();
      sessionStorage.clear();
      redirectToLogin();
      resetLayoutCache();
    }
  }
});

queryClient.getMutationCache().subscribe((event: any) => {
  if (event?.type === 'mutation' && event.mutation.state.status === 'error') {
    const error: any = event.mutation.state.error;
    const message = error?.message?.toLowerCase() || '';

    if (
      message.includes('session') ||
      message.includes('not found') ||
      message.includes('unauthorized')
    ) {
      localStorage.clear();
      sessionStorage.clear();
      redirectToLogin();
    }
  }
});

(window as any)._deferredPWAPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any)._deferredPWAPrompt = e;
});

const router = createRouter({ routeTree, defaultNotFoundComponent: () => <NotFound /> });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <Toasts>
        <JotaiProvider store={webmailStore}>
          {/* <DevTools store={webmailStore} /> */}
          <QueryClientProvider client={queryClient}>
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
            <ThemeWrapper>
              <MinimizedModalsProvider>
                <RouterProvider router={router} />
              </MinimizedModalsProvider>
            </ThemeWrapper>
          </QueryClientProvider>
        </JotaiProvider>
      </Toasts>
    </StrictMode>
  );
}
