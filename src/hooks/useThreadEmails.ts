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

// src/hooks/useThreadEmails.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emailFetchByIds } from '../api/mailbox';
import { useMemo } from 'react';
import type { EmailLike } from '../utils/emailThreading';

// Normalize Message-IDs so "<msg@id>" and "msg@id" compare equal.
const normalizeId = (id: string = '') => id.replace(/[<>]/g, '').trim();

// Which of the requested IDs were not found in the fetched emails?
const getMissingIds = (requestedIds: string[], foundEmails: EmailLike[]) => {
  const foundIds = new Set(
    foundEmails.map((e) =>
      normalizeId((e['Message-ID'] || e['Message-Id'] || e['message-id'] || '') as string)
    )
  );
  return requestedIds.filter((id) => !foundIds.has(normalizeId(id)));
};

// Retry a fetch call up to `attempts` times with a fixed delay between tries
const withRetry = async <T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
};

// Stable query key — exported so callers can pre-populate or invalidate the cache.
export const createThreadQueryKey = (currentFolder: string, messageIds: string[]) => {
  const idsKey = messageIds.length > 0 ? messageIds.slice().sort().join('|') : 'empty';
  return ['thread', 'structure', currentFolder, idsKey] as const;
};

/**
 * Fetches all emails belonging to a thread.
 *
 * Always searches three locations in order, filling gaps at each step:
 *   1. currentFolder  — the folder the user is currently viewing
 *   2. inboxFolder    — for replies received from other parties
 *   3. sentFolder     — for replies sent by the user from a different folder
 *
 * This means threading works in any folder (Sent Mail, custom folders, etc.)
 * without any hardcoded folder-name checks.
 */
export function useThreadEmails(
  messageIds: string[],
  currentFolder: string,
  sentFolder: string = 'Sent',
  inboxFolder: string = 'INBOX',
  enabled: boolean = true
) {
  const queryKey = useMemo(
    () => createThreadQueryKey(currentFolder, messageIds),
    [currentFolder, messageIds]
  );

  return useQuery({
    queryKey,

    queryFn: async () => {
      if (messageIds.length === 0) return [];

      let allEmails: EmailLike[] = [];

      // 1. Current folder — the primary source
      try {
        const result = await withRetry(() =>
          emailFetchByIds({ folderPath: currentFolder, messageIds })
        );
        if (result?.emails) {
          allEmails = result.emails.map((e: EmailLike) => ({ ...e, folderPath: currentFolder }));
        }
      } catch (err) {
        console.warn(`[Thread] Failed to fetch from ${currentFolder}:`, err);
      }

      // 2. Inbox — for replies/messages received from other people
      const missingAfterCurrent = getMissingIds(messageIds, allEmails);
      if (missingAfterCurrent.length > 0 && inboxFolder !== currentFolder) {
        try {
          const result = await withRetry(() =>
            emailFetchByIds({ folderPath: inboxFolder, messageIds: missingAfterCurrent })
          );
          if (result?.emails) {
            allEmails = [
              ...allEmails,
              ...result.emails.map((e: EmailLike) => ({ ...e, folderPath: inboxFolder })),
            ];
          }
        } catch (err) {
          console.warn(`[Thread] Failed to fetch from ${inboxFolder}:`, err);
        }
      }

      // 3. Sent folder — for replies sent by the user when viewing from another folder
      const missingAfterInbox = getMissingIds(messageIds, allEmails);
      if (
        missingAfterInbox.length > 0 &&
        sentFolder !== currentFolder &&
        sentFolder !== inboxFolder
      ) {
        try {
          const result = await withRetry(() =>
            emailFetchByIds({ folderPath: sentFolder, messageIds: missingAfterInbox })
          );
          if (result?.emails) {
            allEmails = [
              ...allEmails,
              ...result.emails.map((e: EmailLike) => ({ ...e, folderPath: sentFolder })),
            ];
          }
        } catch (err) {
          console.warn(`[Thread] Failed to fetch from ${sentFolder}:`, err);
        }
      }

      // Deduplicate by normalized Message-ID
      const seen = new Set<string>();
      return allEmails.filter((e) => {
        const id = normalizeId(
          (e['Message-ID'] || e['Message-Id'] || e['message-id'] || '') as string
        );
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    },

    enabled: enabled && messageIds.length > 0,

    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 5,
    retryDelay: () => 500,
    placeholderData: (previousData) => previousData,
  });
}

// Helper hook for optimistic thread updates
export function useThreadMutations(currentFolder: string, messageIds: string[]) {
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => createThreadQueryKey(currentFolder, messageIds),
    [currentFolder, messageIds]
  );

  return {
    optimisticallyRemove: (emailId: number) => {
      queryClient.setQueryData(queryKey, (old: EmailLike[] = []) =>
        old.filter((email) => Number(email.id) !== emailId)
      );
    },

    optimisticallyRestore: (email: EmailLike) => {
      queryClient.setQueryData(queryKey, (old: EmailLike[] = []) => {
        const exists = old.some((e) => e.id === email.id);
        if (exists) return old;
        return [...old, email].sort(
          (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
        );
      });
    },

    invalidateThread: () => {
      queryClient.invalidateQueries({ queryKey, exact: true });
    },

    invalidateFolder: () => {
      queryClient.invalidateQueries({
        queryKey: ['thread', 'structure', currentFolder],
        exact: false,
      });
    },

    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['thread'], exact: false });
    },
  };
}
