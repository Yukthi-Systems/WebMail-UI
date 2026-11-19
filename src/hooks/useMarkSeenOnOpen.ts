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
import { forgetKeptUnread, isKeptUnread } from '../utils/keptUnread';

/**
 * Marks an opened email as read, once, and updates the cached lists and the
 * folder's unread count.
 *
 * Only skipped when the view was fetched during this open and came back \Seen
 * (the server marked it). A hover prefetch (mark_as_read=false, maybe still in
 * flight when opened) or an older cached view gets marked here.
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
  seenOnServer,
  active,
}: {
  uid: string;
  folder: string;
  isUnread: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  /** The loaded view's flags include \Seen. */
  seenOnServer: boolean;
  active: boolean;
}) {
  const { mutateAsync: markRead } = useSeenMail();
  const { patchEmailFlags } = useEmailCacheUpdater(folder);
  const updateFolderUnreadCount = useUpdateFolderUnreadCount(folder);

  const key = `${folder}:${uid}`;
  // Whether this email's view was fetched while open
  const fetchedRef = useRef({ key, fetched: false });
  if (fetchedRef.current.key !== key) fetchedRef.current = { key, fetched: false };
  if (isLoading) fetchedRef.current.fetched = true;

  const doneRef = useRef('');

  // Opening it (again) reads it, even if it was kept unread before
  useEffect(() => {
    forgetKeptUnread(folder, uid);
  }, [folder, uid]);

  useEffect(() => {
    if (!active || !isLoaded || isLoading || !isUnread || !/^\d+$/.test(uid)) return;
    if (doneRef.current === key) return;
    // Marked unread by the user while open: leave it
    if (isKeptUnread(folder, uid)) return;
    doneRef.current = key;

    const syncCache = () => {
      patchEmailFlags([Number(uid)], '\\Seen');
      updateFolderUnreadCount(-1);
    };

    if (fetchedRef.current.fetched && seenOnServer) {
      syncCache();
    } else {
      // A promise, not mutate's onSuccess: that one is dropped when the component
      // unmounts first (closed quickly, or StrictMode's remount in development)
      markRead({ path: folder, body: [Number(uid)] })
        .then(syncCache)
        .catch(() => {
          /* still unread on the server: nothing to update */
        });
    }
  }, [
    active,
    isLoaded,
    isLoading,
    isUnread,
    seenOnServer,
    uid,
    folder,
    key,
    markRead,
    patchEmailFlags,
    updateFolderUnreadCount,
  ]);
}
