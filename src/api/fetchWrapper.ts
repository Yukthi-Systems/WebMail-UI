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
import { clearSession, renewSsoSession } from './session';

// Error carrying the HTTP status, so callers can tell e.g. 404 (gone) from 424
// (mail server failure). Still an Error, so existing `err.message` users work.
export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const redirectToLogin = () => {
  clearSession();
  localStorage.clear();
  sessionStorage.clear();
  const slug = getCompanySlugFromPath(window.location.pathname);
  window.location.href = slug ? `/${slug}` : '/login';
};

// "Session ID not found" (406) / "Session expired" (401). Matched by message, as
// before: another 401 (e.g. the mail server refused) must not sign the user out.
const isSessionError = (message?: string) =>
  message === 'Oops! Session expired' ||
  !!message?.toLowerCase().includes('session') ||
  !!message?.toLowerCase().includes('unauthorized');

/** The same request again with the new session header. */
const withSession = (options: RequestInit, token: string): RequestInit => {
  const headers = new Headers(options.headers);
  headers.set('X-Session-Token', token);
  return { ...options, headers };
};

const request = async (url: string, options: RequestInit, retried = false): Promise<Response> => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));

    if (isSessionError(error.message)) {
      // An SSO user gets a new session silently, once; anyone else signs in again
      const token = retried ? null : await renewSsoSession();
      if (token) return request(url, withSession(options, token), true);
      redirectToLogin();
    }

    throw new HttpError(error.message || 'Request failed', res.status);
  }

  return res;
};

export const fetchWithAuth = (url: string, options: RequestInit = {}) => request(url, options);

export const fetchListWithAuth = (
  url: string,
  // `timeout` isn't a real fetch() option — browsers silently ignore it — but a
  // caller passes it, so it's kept in the type to avoid changing behavior here.
  options: RequestInit & { timeout?: number } = {}
) => request(url, options);
