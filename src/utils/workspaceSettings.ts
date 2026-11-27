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

import { QUERY_RETRY } from '../api/retryPolicy';
import type { QueryClient } from '@tanstack/react-query';
import { userSettings, type UserSettings } from '../api/user';
import { userSettingsAtom } from '../state/settings';
import { webmailStore } from '../store';
import { WORKSPACE_FOLDERS_TIMEOUT_MS, waitAtMost } from './workspaceFolders';

/**
 * Shared by the loader and useGetUserSettings, so the loaded settings are
 * reused.
 */
export const userSettingsQuery = {
  queryKey: ['getting_user_settings'],
  queryFn: userSettings,
  staleTime: 10 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  ...QUERY_RETRY,
};

/**
 * Loads the user's settings before the app renders, so it opens with them
 * (layout, theme, reading options) instead of switching once they arrive. A
 * first login has none yet: Layout then saves the defaults.
 *
 * Never rejects; on a failure or timeout the app opens with the stored
 * settings.
 */
export const loadUserSettings = async (
  queryClient: QueryClient,
  timeoutMs: number = WORKSPACE_FOLDERS_TIMEOUT_MS
): Promise<void> => {
  const load = queryClient.fetchQuery<UserSettings>(userSettingsQuery).then((settings) => {
    if (settings && Object.keys(settings).length > 0) webmailStore.set(userSettingsAtom, settings);
  });
  await waitAtMost(load, timeoutMs, 'Could not load the settings before opening the app:');
};
