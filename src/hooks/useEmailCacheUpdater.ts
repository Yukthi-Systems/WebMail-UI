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

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { patchRowFlags, unquoteFolder, type EmailLike } from '../utils/threads';
import type { ThreadDetail } from '../api/mailbox';
import { emailFilterAtom, type EmailFilterBy } from '../state/emailListView';
import { invalidateFolderLists } from './useEmails';

// The flag each server-side list filter depends on
const FILTER_FLAG: Record<EmailFilterBy, string | null> = {
  all: null,
  unread: '\\Seen',
  read: '\\Seen',
  flagged: '\\Flagged',
  unflagged: '\\Flagged',
};

/**
 * Applies a flag change of the emails `emailIds` of `folder` to every cached
 * list, search result and open conversation, without refetching. Only emails
 * of that folder are touched: UIDs repeat across folders.
 */
export function patchCachedFlags(
  queryClient: QueryClient,
  folder: string,
  emailIds: number[],
  flagToAdd?: string,
  flagToRemove?: string
) {
  if (emailIds.length === 0) return;
  const path = unquoteFolder(folder);
  const uids = new Set(emailIds.map(Number));
  const inFolder = (email: EmailLike) => !email.folderPath || email.folderPath === path;
  const patch = <T extends EmailLike>(email: T): T =>
    inFolder(email) ? patchRowFlags(email, uids, flagToAdd, flagToRemove) : email;

  // This folder's lists (plain and conversation view, all pages)
  queryClient.setQueriesData(
    { queryKey: ['folder', path], exact: false },
    (old: { emails?: EmailLike[] } | undefined) => {
      if (!Array.isArray(old?.emails)) return old;
      return { ...old, emails: old.emails.map(patch) };
    }
  );

  // Search results — shape: { data: { data: Email[], total_count } }
  queryClient.setQueriesData(
    { queryKey: ['search-emails'], exact: false },
    (old: { data?: { data?: EmailLike[] } } | undefined) => {
      if (!Array.isArray(old?.data?.data)) return old;
      return { ...old, data: { ...old.data, data: old.data.data.map(patch) } };
    }
  );

  // Open conversations: their emails come from several folders, each has folderPath
  queryClient.setQueriesData(
    { queryKey: ['thread', 'detail'], exact: false },
    (old: ThreadDetail | undefined) => {
      if (!Array.isArray(old?.emails)) return old;
      return { ...old, emails: old.emails.map(patch), row: old.row && patch(old.row) };
    }
  );
}

/**
 * Cache-patching utility that updates cached email lists in place, avoiding a
 * network round-trip to re-fetch them.
 *
 * Ids are UIDs, which are only unique inside a folder: only emails of
 * `folder` are patched (UID 42 in Sent is another email than UID 42 here).
 */
export function useEmailCacheUpdater(folder: string) {
  const queryClient = useQueryClient();
  const emailFilter = useAtomValue(emailFilterAtom);

  /**
   * Add / remove a flag string from the FLAGS of the emails `emailIds` of this
   * folder. Pass undefined for flagToAdd or flagToRemove to skip that side.
   * Conversation rows containing one of them are updated too.
   *
   * Examples: mark as read → patchEmailFlags(ids, '\Seen') mark as unread →
   * patchEmailFlags(ids, undefined, '\Seen') flag → patchEmailFlags(ids,
   * '\Flagged') unflag → patchEmailFlags(ids, undefined, '\Flagged')
   */
  const patchEmailFlags = useCallback(
    (emailIds: number[], flagToAdd?: string, flagToRemove?: string, emailsFolder = folder) => {
      if (emailIds.length === 0) return;
      // emailsFolder: the folder of these UIDs when not the hook's (e.g. search in another folder)
      const path = unquoteFolder(emailsFolder);
      patchCachedFlags(queryClient, path, emailIds, flagToAdd, flagToRemove);

      // Other cached views of this folder (other filters / sorts / pages) may no
      // longer match: mark them stale so they reload when shown.
      invalidateFolderLists(queryClient, [path], { refetchActive: false });

      // A filtered list (e.g. Unread) no longer matches once that flag changes —
      // refetch it so the item drops out and counts/pages stay right.
      const filterFlag = FILTER_FLAG[emailFilter];
      if (filterFlag && (flagToAdd === filterFlag || flagToRemove === filterFlag)) {
        queryClient.invalidateQueries({ queryKey: ['folder', path] });
      }
    },
    [queryClient, folder, emailFilter]
  );

  return { patchEmailFlags };
}
