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

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const csrfTokenAtom = atomWithStorage<string | null>('auth', null, undefined, {
  getOnInit: true,
});

export const isVersionTwoUserAtom = atomWithStorage<boolean>('isVersionTwoUser', false, undefined, {
  getOnInit: true,
});

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
