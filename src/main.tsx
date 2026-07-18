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
import {
  QueryClient,
  QueryClientProvider,
  type QueryCacheNotifyEvent,
  type MutationCacheNotifyEvent,
} from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import '@radix-ui/themes/styles.css';
import 'jotai-devtools/styles.css';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { Toasts } from './components/ui/ToastComponent.tsx';
import './index.css';
import ThemeWrapper from './components/ui/ThemeWrapper.tsx';
import { webmailStore } from './store.ts';
import { resetLayoutCache } from './utils/resetLayoutCache.ts';
import { NotFound } from './components/common/NotFound.tsx';
import { MinimizedModalsProvider } from './components/common/MinimizedModalContext.tsx';
import { getCompanySlugFromPath } from './utils/routeUtils.ts';

// beforeinstallprompt isn't in the standard DOM lib yet.
interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    // Stashed here so components mounted after the event fires (e.g. the profile
    // menu's install button) can still access it — see Profile.tsx.
    _deferredPWAPrompt: BeforeInstallPromptEvent | null;
    // Set by the inline bootstrap script in index.html.
    hideGlobalLoader?: () => void;
  }
}

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
// NOTE: `event.type` is 'query' here, but QueryCacheNotifyEvent's real type union
// never includes that value (it's 'added' | 'removed' | 'updated' | ...) — this
// condition has therefore always evaluated false, and this handler has never
// actually fired. Preserved exactly as-is (see CLAUDE.md) rather than "fixed",
// since enabling it would be a real behavior change, not a lint fix.
queryClient.getQueryCache().subscribe((event: QueryCacheNotifyEvent) => {
  if ((event?.type as string) === 'query' && event.query.state.status === 'error') {
    const error = event.query.state.error;
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

// Same dead-condition situation as above ('mutation' is never a real event type) —
// preserved as-is.
queryClient.getMutationCache().subscribe((event: MutationCacheNotifyEvent) => {
  if ((event?.type as string) === 'mutation' && event.mutation?.state.status === 'error') {
    const error = event.mutation?.state.error;
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

window._deferredPWAPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window._deferredPWAPrompt = e as BeforeInstallPromptEvent;
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
