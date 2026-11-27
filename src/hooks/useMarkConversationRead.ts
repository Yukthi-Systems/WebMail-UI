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
import { useUpdateAnyFolderUnreadCount } from './useFolders';
import { forgetKeptUnread, isKeptUnread, keptUnreadKey } from '../utils/keptUnread';
import { isUnreadThreadEmail, unquoteFolder, type EmailLike } from '../utils/threads';

/**
 * Opening a conversation reads all of it, like Gmail: its unread emails are
 * marked read in one request per folder (usually one), so the row in the list
 * and the folder's count clear. Nothing is sent when nothing is unread.
 *
 * Once per email per opening (`openKey`): one the user marks unread while the
 * conversation is open stays unread. An email that arrives while it is open is
 * marked too. Lists and counts are updated once the server confirmed.
 */
export function useMarkConversationRead({
  emails,
  folder,
  openKey,
  active,
}: {
  emails: EmailLike[];
  /** Folder of the opened conversation (for emails without their own folderPath) */
  folder: string;
  /** Changes when another conversation, or the same one again, is opened. */
  openKey: string;
  active: boolean;
}) {
  const { mutateAsync: markRead } = useSeenMail();
  const { patchEmailFlags } = useEmailCacheUpdater(folder);
  const updateUnreadCount = useUpdateAnyFolderUnreadCount();

  // Emails already handled during this opening
  const handled = useRef({ openKey, keys: new Set<string>(), reopened: false });
  if (handled.current.openKey !== openKey) {
    handled.current = { openKey, keys: new Set(), reopened: false };
  }

  useEffect(() => {
    if (!active || emails.length === 0) return;
    const state = handled.current;
    const folderOf = (email: EmailLike) => unquoteFolder(email.folderPath || folder);

    // Opening it again reads it, even emails kept unread last time
    if (!state.reopened) {
      state.reopened = true;
      emails.forEach((email) => forgetKeptUnread(folderOf(email), String(email.id ?? '')));
    }

    const byFolder = new Map<string, number[]>();
    for (const email of emails) {
      const uid = String(email.id ?? '');
      const path = folderOf(email);
      const key = keptUnreadKey(path, uid);
      if (state.keys.has(key) || !/^\d+$/.test(uid)) continue;
      state.keys.add(key);
      // Marked unread by the user while open: leave it
      if (!isUnreadThreadEmail(email) || isKeptUnread(path, uid)) continue;
      byFolder.set(path, [...(byFolder.get(path) ?? []), Number(uid)]);
    }

    byFolder.forEach((uids, path) => {
      // A promise, not mutate's onSuccess: that one is dropped if the view closes first
      markRead({ path, body: uids })
        .then(() => {
          patchEmailFlags(uids, '\\Seen', undefined, path);
          updateUnreadCount(path, -uids.length);
        })
        .catch(() => {
          // Still unread on the server: try again next time it is opened
          uids.forEach((uid) => state.keys.delete(keptUnreadKey(path, uid)));
        });
    });
  }, [active, emails, folder, markRead, patchEmailFlags, updateUnreadCount]);
}
