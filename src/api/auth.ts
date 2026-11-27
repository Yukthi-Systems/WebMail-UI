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

import { API_URL } from './config.ts';
import { authHeaders } from './session';

export type LoginCredentials = {
  email: string;
  domain: string;
  password: string;
  recaptcha_token?: string;
};
export type LoginResponse = {
  /** WebMail session, sent as X-Session-Token on every request. */
  sessionToken: string;
  /** Signed-in address, for SSO (the password form knows it already) */
  email?: string;
};

export class LoginError extends Error {
  status?: number;
  /** 'sso': the domain signs in with SSO only, offer SSO instead. */
  loginMethod?: string;
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const res = await fetch(`${API_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.session_id) {
    // Show the API's message as-is (401/403/503...). A proxy can answer a 503
    // with a non-JSON page, so only fall back when there is no message at all.
    const fallback =
      res.status === 503
        ? "We couldn't reach your mail server. Please try again in a few minutes."
        : 'Login failed. Please try again.';
    const err = new LoginError(body.message || fallback);
    err.status = res.status;
    err.loginMethod = body.login_method;
    throw err;
  }

  return { sessionToken: body.session_id };
};

export const logout = async (): Promise<void> => {
  await fetch(`${API_URL}/user/logout`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
  });
};
