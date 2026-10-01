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

import { webmailStore } from '../store.ts';
import { csrfTokenAtom } from '../state/auth';
import { API_URL } from './config.ts';
export type LoginCredentials = {
  email: string;
  domain: string;
  password: string;
  recaptcha_token?: string;
};
export type LoginResponse = {
  csrfToken: string | null;
  isVersionTwoUser: boolean;
};

export class LoginError extends Error {
  status?: number;
}

export const login = async (credentials: {
  email: string;
  domain: string;
  password: string;
}): Promise<LoginResponse> => {
  const res = await fetch(`${API_URL}/user/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    // Show the API's message as-is (401/403/503...). A proxy can answer a 503
    // with a non-JSON page, so only fall back when there is no message at all.
    const error = await res.json().catch(() => ({}));
    const fallback =
      res.status === 503
        ? "We couldn't reach your mail server. Please try again in a few minutes."
        : 'Login failed. Please try again.';
    const err = new LoginError(error.message || fallback);
    err.status = res.status;
    throw err;
  }

  return {
    csrfToken: res.headers.get('X-Csrf-Token'),
    isVersionTwoUser: res.headers.get('X-V2-User')?.toLowerCase() === 'true',
  };
};

export const logout = async (): Promise<void> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  await fetch(`${API_URL}/user/logout`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
};
