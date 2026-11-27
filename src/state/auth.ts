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

import { atomWithStorage } from 'jotai/utils';

/**
 * The WebMail session: sent as `X-Session-Token` on every API request. Readable
 * by JavaScript (unlike the old httponly cookie), so never log it or put it in
 * a URL.
 */
export const sessionTokenAtom = atomWithStorage<string | null>('session_token', null, undefined, {
  getOnInit: true,
});

/**
 * The SSO user's name and organization, from the SSO service (null for password
 * users).
 */
export interface SsoProfile {
  email: string;
  firstName: string;
  lastName: string | null;
  organizationId: string;
  organizationName: string;
}
export const ssoProfileAtom = atomWithStorage<SsoProfile | null>('sso_profile', null, undefined, {
  getOnInit: true,
});

/** How the user signed in: logout ends the SSO session only for SSO users. */
export type LoginMethod = 'sso' | 'password';
export const loginMethodAtom = atomWithStorage<LoginMethod | null>(
  'login_method',
  null,
  undefined,
  {
    getOnInit: true,
  }
);

type ApiKeyState = string | null;

const sessionStorageAdapter = {
  getItem: (key: string): ApiKeyState => {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  setItem: (key: string, value: ApiKeyState) => {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
  },
};

export const apiKeyAtom = atomWithStorage<ApiKeyState>('apiKey', null, sessionStorageAdapter, {
  getOnInit: true,
});
