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

import type { QueryClient } from '@tanstack/react-query';
import { foldersFullPath } from '../api/mailbox';
import { folderDetailsAtom, type FolderDetail } from '../state/folders';
import { webmailStore } from '../store';

export const FOLDERS_FULL_PATH_QUERY_KEY = ['foldersFullPath'] as const;

/** A slow mail server must not keep the user out: after this the app opens anyway. */
const WORKSPACE_FOLDERS_TIMEOUT_MS = 10000;

/**
 * /folder/path has no UID status, so the stored one is kept. Otherwise the "new
 * mail?" check sees no status, reports a change and reloads the list needlessly.
 */
export const mergeFolderDetails = (
  previous: FolderDetail[] | undefined | null,
  folders: FolderDetail[]
): FolderDetail[] => {
  const statusByFolder = new Map(
    (Array.isArray(previous) ? previous : []).map((folder) => [folder.folder_name, folder.status])
  );
  return folders.map((folder) =>
    folder.status || !statusByFolder.get(folder.folder_name)
      ? folder
      : { ...folder, status: statusByFolder.get(folder.folder_name) }
  );
};

/**
 * Loads the folder list before the app renders (route loader, while the loading
 * screen is up), so everything derived from it is right on the first request:
 * above all the Sent folder sent as `sent_folder` by the conversation list.
 *
 * Never rejects. On a failure or timeout the app opens with the stored list; the
 * request keeps running and useFoldersFullPath picks up its result.
 */
export const loadWorkspaceFolders = async (
  queryClient: QueryClient,
  timeoutMs: number = WORKSPACE_FOLDERS_TIMEOUT_MS
): Promise<void> => {
  const load = queryClient
    .fetchQuery({
      queryKey: FOLDERS_FULL_PATH_QUERY_KEY,
      queryFn: foldersFullPath as unknown as () => Promise<{ folders?: FolderDetail[] }>,
    })
    .then((data) => {
      if (Array.isArray(data?.folders)) {
        const folders = data.folders;
        webmailStore.set(folderDetailsAtom, (previous) => mergeFolderDetails(previous, folders));
      }
    });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });

  try {
    await Promise.race([load, timeout]);
  } catch (error) {
    console.warn('Could not load the folder list before opening the app:', error);
  } finally {
    clearTimeout(timer);
  }
};
