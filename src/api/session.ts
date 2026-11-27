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

import { loginMethodAtom, sessionTokenAtom } from '../state/auth';
import { webmailStore } from '../store.ts';

/** The WebMail session header for an API request (none when signed out). */
export const authHeaders = (): Record<string, string> => {
  const token = webmailStore.get(sessionTokenAtom);
  return token ? { 'X-Session-Token': token } : {};
};

/** Forgets the session in memory too, not only in localStorage. */
export const clearSession = (): void => {
  webmailStore.set(sessionTokenAtom, null);
  webmailStore.set(loginMethodAtom, null);
};

let renewal: Promise<string | null> | null = null;

/**
 * The WebMail session expired (it lasts a few hours). An SSO user gets a new
 * one silently while the SSO session is valid: no popup, no login page.
 * Requests that fail at the same time share one renewal. Null for password
 * users, or when SSO can't renew it.
 */
export const renewSsoSession = (): Promise<string | null> => {
  if (webmailStore.get(loginMethodAtom) !== 'sso') return Promise.resolve(null);
  renewal ??= import('./sso')
    .then(({ exchangeSsoSession }) => exchangeSsoSession())
    .then(({ sessionToken }) => {
      webmailStore.set(sessionTokenAtom, sessionToken);
      return sessionToken;
    })
    .catch(() => null)
    .finally(() => {
      renewal = null;
    });
  return renewal;
};
