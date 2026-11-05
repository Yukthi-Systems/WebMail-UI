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
import { unquoteFolder } from './threads';

/**
 * Cache keys of single emails: folder + UID. A UID never changes while the
 * email stays in its folder, so these entries can be cached safely. If the
 * folder's UIDVALIDITY changes, every UID of it is void: noteUidValidity()
 * then drops the folder's entries.
 */
export const emailViewCacheKey = (folder: string, uid: string | number) =>
  ['email', 'view', unquoteFolder(folder), String(uid)] as const;

export const rawEmailCacheKey = (folder: string, uid: string | number) =>
  ['email', 'raw', unquoteFolder(folder), String(uid)] as const;

export const emailAttachmentCacheKey = (folder: string, uid: string | number, partId: string) =>
  ['email', 'attachment', unquoteFolder(folder), String(uid), partId] as const;

/** A conversation opened in the viewer (any UID of it, in `folder`) */
export const threadDetailCacheKey = (folder: string, uid: string | number) =>
  ['thread', 'detail', unquoteFolder(folder), String(uid)] as const;

/** Drops cached bodies / sources / attachments of emails of `folder` (all of them, or only `uids`) */
export function removeEmailCaches(
  queryClient: QueryClient,
  folder: string,
  uids?: (string | number)[]
) {
  const path = unquoteFolder(folder);
  const uidSet = uids ? new Set(uids.map(String)) : null;
  queryClient.removeQueries({
    queryKey: ['email'],
    predicate: ({ queryKey }) =>
      queryKey[2] === path && (!uidSet || uidSet.has(String(queryKey[3]))),
  });
}

// Last UIDVALIDITY seen per folder. In memory only, like the query cache
// itself: after a page reload there is nothing cached that could be stale.
const knownUidValidity = new Map<string, string>();

/**
 * Records a folder's UIDVALIDITY (from GET /folder/uid-validity or any thread
 * response). When it differs from the last one seen, the UIDs cached for that
 * folder may now belong to other emails: drop them and reload its lists.
 * Returns true when the cache was dropped.
 */
export function noteUidValidity(
  queryClient: QueryClient,
  folder: string,
  uidValidity: string | number | null | undefined
): boolean {
  if (uidValidity === null || uidValidity === undefined || uidValidity === '') return false;
  const path = unquoteFolder(folder);
  const value = String(uidValidity);
  const previous = knownUidValidity.get(path);
  knownUidValidity.set(path, value);
  if (previous === undefined || previous === value) return false;

  removeEmailCaches(queryClient, path);
  // A conversation can include emails of several folders: drop them all, it is rare
  queryClient.removeQueries({ queryKey: ['thread'] });
  queryClient.invalidateQueries({ queryKey: ['folder', path] });
  queryClient.invalidateQueries({ queryKey: ['search-emails'] });
  return true;
}

/** For tests */
export const resetKnownUidValidity = () => knownUidValidity.clear();
