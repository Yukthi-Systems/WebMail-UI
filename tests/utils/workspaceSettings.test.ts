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

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userSettings, type UserSettings } from '../../src/api/user';
import { userSettingsAtom } from '../../src/state/settings';
import { webmailStore } from '../../src/store';
import { loadUserSettings, userSettingsQuery } from '../../src/utils/workspaceSettings';

vi.mock('../../src/api/user', () => ({ userSettings: vi.fn() }));

const fetchSettings = vi.mocked(userSettings);
const settings = { ui: { theme: 'dark' } } as unknown as UserSettings;

describe('loadUserSettings', () => {
  beforeEach(() => {
    fetchSettings.mockReset();
    webmailStore.set(userSettingsAtom, null);
  });

  it('has the settings ready before the app renders', async () => {
    fetchSettings.mockResolvedValue(settings);
    await loadUserSettings(new QueryClient());
    expect(webmailStore.get(userSettingsAtom)).toEqual(settings);
  });

  it('fills the query cache so useGetUserSettings does not request it again', async () => {
    fetchSettings.mockResolvedValue(settings);
    const queryClient = new QueryClient();
    await loadUserSettings(queryClient);
    expect(fetchSettings).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(userSettingsQuery.queryKey)).toEqual(settings);
  });

  it('leaves a first login (no settings yet) to Layout, which saves the defaults', async () => {
    fetchSettings.mockResolvedValue({} as UserSettings);
    await loadUserSettings(new QueryClient());
    expect(webmailStore.get(userSettingsAtom)).toBeNull();
  });

  it('keeps the stored settings when the request fails', async () => {
    vi.useFakeTimers(); // skips the retry delays
    webmailStore.set(userSettingsAtom, settings);
    fetchSettings.mockRejectedValue(new Error('down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const loading = loadUserSettings(new QueryClient());
    await vi.runAllTimersAsync();
    await expect(loading).resolves.toBeUndefined();

    expect(webmailStore.get(userSettingsAtom)).toEqual(settings);
    warn.mockRestore();
    vi.useRealTimers();
  });

  it('opens the app when the server is slow, and still uses the late result', async () => {
    let finish: (value: UserSettings) => void = () => {};
    fetchSettings.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    await loadUserSettings(new QueryClient(), 5);
    expect(webmailStore.get(userSettingsAtom)).toBeNull();

    finish(settings);
    await vi.waitFor(() => expect(webmailStore.get(userSettingsAtom)).toEqual(settings));
  });
});
