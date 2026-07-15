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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emailRaw } from '../api/mailbox';
import { useCallback } from 'react';

export function rawEmailCacheKey(id: string, folderPath: string, messageId: string) {
  return ['email', 'raw', messageId || id, folderPath] as const;
}

export function useEmailRaw(id: string, folderPath: string, messageId: string, enabled = true) {
  return useQuery({
    queryKey: ['email', 'raw', messageId || id, folderPath],
    queryFn: () => emailRaw(id, folderPath, true),

    enabled: enabled && !!id && !!folderPath,

    retry: 5,
    retryDelay: () => 500,
    // If it fails after retries, don't refetch automatically on window focus
    refetchOnWindowFocus: false,

    // --- Performance & Cache ---
    // Only cache when keyed by a stable IMAP Message-ID.
    // Sequence IDs change after deletions, so a sequence-ID key must never
    // serve stale content for a different email that inherited the same ID.
    staleTime: messageId ? 10 * 60 * 1000 : 0,
    gcTime: messageId ? 30 * 60 * 1000 : 0,
    refetchOnMount: false,
  });
}

export const useEmailPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchEmailContent = useCallback(
    (id: string, folderPath: string, messageId: string) => {
      if (!id || !folderPath) return;

      const queryKey = ['email', 'raw', messageId || id, folderPath];

      const cachedData = queryClient.getQueryData(queryKey);
      if (cachedData) return;

      // 4. Debounce or delay prefetch to ensure priority requests finish first
      setTimeout(() => {
        // Only trigger if the user isn't already fetching other raw content
        const isAnythingFetching =
          queryClient.isFetching({
            queryKey: ['email', 'raw'],
          }) > 0;

        if (!isAnythingFetching) {
          queryClient.prefetchQuery({
            queryKey: queryKey,
            // Pass the numeric id for the API, but it's stored under messageId key
            queryFn: () => emailRaw(id, folderPath, false),
            staleTime: 10 * 60 * 1000, // Sync with useEmailRaw staleTime
          });
        }
      }, 600);
    },
    [queryClient]
  );

  return { prefetchEmailContent };
};
