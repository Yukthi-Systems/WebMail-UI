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

import { getCompanySlugFromPath } from '../utils/routeUtils';

const redirectToLogin = () => {
  const slug = getCompanySlugFromPath(window.location.pathname);
  window.location.href = slug ? `/${slug}` : '/login';
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));

    if (
      error.message === 'Oops! Session expired' ||
      error.message?.toLowerCase().includes('session') ||
      error.message?.toLowerCase().includes('unauthorized')
    ) {
      localStorage.clear();
      sessionStorage.clear();
      redirectToLogin();
    }

    throw new Error(error.message || 'Request failed');
  }

  return res;
};

export const fetchListWithAuth = async (
  url: string,
  // `timeout` isn't a real fetch() option — browsers silently ignore it — but a
  // caller passes it, so it's kept in the type to avoid changing behavior here.
  options: RequestInit & { timeout?: number } = {}
) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));

    if (
      error.message === 'Oops! Session expired' ||
      error.message?.toLowerCase().includes('session') ||
      error.message?.toLowerCase().includes('unauthorized')
    ) {
      localStorage.clear();
      sessionStorage.clear();
      redirectToLogin();
    }

    throw new Error(error.message || 'Request failed');
  }

  return res;
};
