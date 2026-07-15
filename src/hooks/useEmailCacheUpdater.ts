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

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Provides two cache-patching utilities that update the React Query email list
 * cache in place, avoiding a network round-trip to re-fetch the email list.
 *
 * Both helpers use a prefix match on ['folder', folder] so every cached page
 * for that folder is updated at once.
 */
export function useEmailCacheUpdater(folder: string) {
  const queryClient = useQueryClient();

  /**
   * Add / remove a flag string from every matching email's FLAGS array. Pass
   * undefined for flagToAdd or flagToRemove to skip that side.
   *
   * Examples: mark as read → patchEmailFlags(ids, '\Seen') mark as unread →
   * patchEmailFlags(ids, undefined, '\Seen') flag → patchEmailFlags(ids,
   * '\Flagged') unflag → patchEmailFlags(ids, undefined, '\Flagged')
   */
  const patchEmailFlags = useCallback(
    (emailIds: number[], flagToAdd?: string, flagToRemove?: string) => {
      if (emailIds.length === 0) return;
      const idSet = new Set(emailIds.map(String));

      const applyFlagPatch = (email: any) => {
        if (!idSet.has(String(email.id))) return email;
        let flags: string[] = [...(email.FLAGS || [])];
        if (flagToRemove) flags = flags.filter((f) => f !== flagToRemove);
        if (flagToAdd && !flags.includes(flagToAdd)) flags = [...flags, flagToAdd];
        return { ...email, FLAGS: flags };
      };

      // Patch folder email list cache (uses `emails` key)
      queryClient.setQueriesData({ queryKey: ['folder', folder], exact: false }, (old: any) => {
        if (!old?.emails) return old;
        return { ...old, emails: old.emails.map(applyFlagPatch) };
      });

      // Patch search results cache — shape: { data: { data: Email[], total_count } }
      queryClient.setQueriesData({ queryKey: ['search-emails'], exact: false }, (old: any) => {
        if (!Array.isArray(old?.data?.data)) return old;
        return {
          ...old,
          data: { ...old.data, data: old.data.data.map(applyFlagPatch) },
        };
      });

      // Patch thread structure cache — shape: Email[] (flat array from useThreadEmails)
      // This covers emails from any folder (INBOX, Sent, etc.) in a thread without refetching.
      queryClient.setQueriesData(
        { queryKey: ['thread', 'structure'], exact: false },
        (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map(applyFlagPatch);
        }
      );
    },
    [queryClient, folder]
  );

  return { patchEmailFlags };
}
