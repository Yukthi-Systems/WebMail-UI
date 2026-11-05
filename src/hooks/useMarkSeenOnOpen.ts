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

import { useEffect, useRef } from 'react';
import { useSeenMail } from './useEmails';
import { useEmailCacheUpdater } from './useEmailCacheUpdater';
import { useUpdateFolderUnreadCount } from './useFolders';

/**
 * Marks an opened email as read, once, and updates the cached lists and the
 * folder's unread count.
 *
 * - Fetched now by useEmailView (mark_as_read=true): the server already marked
 *   it, only the cache is updated.
 * - Shown from the hover prefetch (mark_as_read=false): it is marked here.
 *
 * Used by the single email view and by each card of a conversation; `active`
 * tells which one shows the email, so it is counted once.
 */
export function useMarkSeenOnOpen({
  uid,
  folder,
  isUnread,
  isLoaded,
  isLoading,
  active,
}: {
  uid: string;
  folder: string;
  isUnread: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  active: boolean;
}) {
  const { mutate: markRead } = useSeenMail();
  const { patchEmailFlags } = useEmailCacheUpdater(folder);
  const updateFolderUnreadCount = useUpdateFolderUnreadCount(folder);

  const key = `${folder}:${uid}`;
  // Whether this email's view was fetched while open (the API then marked it read)
  const fetchedRef = useRef({ key, fetched: false });
  if (fetchedRef.current.key !== key) fetchedRef.current = { key, fetched: false };
  if (isLoading) fetchedRef.current.fetched = true;

  const doneRef = useRef('');

  useEffect(() => {
    if (!active || !isLoaded || isLoading || !isUnread || !/^\d+$/.test(uid)) return;
    if (doneRef.current === key) return;
    doneRef.current = key;

    const syncCache = () => {
      patchEmailFlags([Number(uid)], '\\Seen');
      updateFolderUnreadCount(-1);
    };

    if (fetchedRef.current.fetched) {
      syncCache();
    } else {
      markRead({ path: folder, body: [Number(uid)] }, { onSuccess: syncCache });
    }
  }, [
    active,
    isLoaded,
    isLoading,
    isUnread,
    uid,
    folder,
    key,
    markRead,
    patchEmailFlags,
    updateFolderUnreadCount,
  ]);
}
