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

// _root.tsx
import { createRootRoute, Outlet, redirect, useRouter } from '@tanstack/react-router';
import { webmailStore } from '../store';
import { csrfTokenAtom } from '../state/auth';
import { useEffect } from 'react';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { GlobalLoader } from '../components/common/GlobalLoading'; // Add this import
import { ApiKeyStorageGuard } from '../components/admin/domain/ApiKeyStorageGuard';
import { getCompanySlugFromPath } from '../utils/routeUtils';

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (
      location.pathname === '/' ||
      location.pathname.startsWith('/login') ||
      getCompanySlugFromPath(location.pathname) !== null ||
      location.pathname.startsWith('/admin/login') ||
      location.pathname.startsWith('/1219/admin/domain') ||
      location.pathname.startsWith('/1219/admin/login')
    ) {
      return;
    }

    const csrfToken = webmailStore.get(csrfTokenAtom);
    if (!csrfToken) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: RootComponent,
  errorComponent: ErrorBoundary,
});

function RootComponent() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribeResolved = router.subscribe('onResolved', () => {
      // Hide HTML loader after first route loads
      window.hideGlobalLoader?.();
    });

    return () => unsubscribeResolved();
  }, [router]);

  return (
    <>
      <GlobalLoader />
      <ApiKeyStorageGuard />
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </>
  );
}
