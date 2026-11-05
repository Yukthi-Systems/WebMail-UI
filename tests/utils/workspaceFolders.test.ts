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
import { foldersFullPath } from '../api/mailbox';
import { folderDetailsAtom, type FolderDetail } from '../state/folders';
import { webmailStore } from '../store';
import { getSentFolderPath } from './folderUtils';
import {
  FOLDERS_FULL_PATH_QUERY_KEY,
  loadWorkspaceFolders,
  mergeFolderDetails,
} from './workspaceFolders';

vi.mock('../api/mailbox', () => ({ foldersFullPath: vi.fn() }));

const fetchFolders = vi.mocked(foldersFullPath) as unknown as ReturnType<typeof vi.fn>;
const status = { UIDVALIDITY: 1, MESSAGES: 2, UIDNEXT: 3 };
const folder = (folder_name: string, extra: Partial<FolderDetail> = {}): FolderDetail => ({
  name: folder_name,
  folder_name,
  delimiter: '/',
  ...extra,
});

describe('loadWorkspaceFolders', () => {
  beforeEach(() => {
    fetchFolders.mockReset();
    webmailStore.set(folderDetailsAtom, []);
  });

  it('has the real Sent folder ready before the app renders', async () => {
    fetchFolders.mockResolvedValue({
      folders: [folder('INBOX'), folder('INBOX/Sent', { flags: ['\\Sent'] })],
    });
    expect(getSentFolderPath(webmailStore.get(folderDetailsAtom))).toBe('Sent');

    await loadWorkspaceFolders(new QueryClient());

    expect(getSentFolderPath(webmailStore.get(folderDetailsAtom))).toBe('INBOX/Sent');
  });

  it('fills the query cache so useFoldersFullPath does not request it again', async () => {
    const response = { folders: [folder('INBOX')] };
    fetchFolders.mockResolvedValue(response);
    const queryClient = new QueryClient();

    await loadWorkspaceFolders(queryClient);

    expect(fetchFolders).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(FOLDERS_FULL_PATH_QUERY_KEY)).toEqual(response);
  });

  it('keeps the stored folders when the request fails', async () => {
    const stored = [folder('INBOX'), folder('Sent')];
    webmailStore.set(folderDetailsAtom, stored);
    fetchFolders.mockRejectedValue(new Error('IMAP down'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(loadWorkspaceFolders(new QueryClient())).resolves.toBeUndefined();

    expect(webmailStore.get(folderDetailsAtom)).toEqual(stored);
    warn.mockRestore();
  });

  it('opens the app when the mail server is slow, and still uses the late result', async () => {
    let finish: (value: { folders: FolderDetail[] }) => void = () => {};
    fetchFolders.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    await loadWorkspaceFolders(new QueryClient(), 5);
    expect(webmailStore.get(folderDetailsAtom)).toEqual([]);

    finish({ folders: [folder('INBOX/Sent', { flags: ['\\Sent'] })] });
    await vi.waitFor(() =>
      expect(getSentFolderPath(webmailStore.get(folderDetailsAtom))).toBe('INBOX/Sent')
    );
  });

  it('ignores a response without a folder list', async () => {
    const stored = [folder('INBOX')];
    webmailStore.set(folderDetailsAtom, stored);
    fetchFolders.mockResolvedValue({ message: 'unexpected' });

    await loadWorkspaceFolders(new QueryClient());

    expect(webmailStore.get(folderDetailsAtom)).toEqual(stored);
  });
});

describe('mergeFolderDetails', () => {
  it('keeps the stored status when the new list has none', () => {
    expect(mergeFolderDetails([folder('INBOX', { status })], [folder('INBOX')])[0].status).toEqual(
      status
    );
  });

  it('prefers a new status and drops folders that no longer exist', () => {
    const fresh = { ...status, MESSAGES: 9 };
    const merged = mergeFolderDetails(
      [folder('INBOX', { status }), folder('Gone', { status })],
      [folder('INBOX', { status: fresh })]
    );
    expect(merged).toEqual([folder('INBOX', { status: fresh })]);
  });

  it('handles an empty stored list', () => {
    expect(mergeFolderDetails(undefined, [folder('INBOX')])).toEqual([folder('INBOX')]);
  });
});
