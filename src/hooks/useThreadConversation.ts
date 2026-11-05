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

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { emailThread, type ThreadDetail } from '../api/mailbox';
import { HttpError } from '../api/fetchWrapper';
import { noteUidValidity, threadDetailCacheKey } from '../utils/emailCache';
import { parseEmailDate } from '../utils/dateFormat';
import type { EmailLike } from '../utils/threads';

/** Same email: UIDs are only unique inside a folder */
export const isSameEmail = (a: EmailLike, b: EmailLike) =>
  String(a.id) === String(b.id) && a.folderPath === b.folderPath;

const byDate = (a: EmailLike, b: EmailLike) =>
  (parseEmailDate(a.Date)?.getTime() ?? 0) - (parseEmailDate(b.Date)?.getTime() ?? 0);

/**
 * The conversation of email `uid` (in `folder`): all its emails, oldest first,
 * including your replies from the Sent folder. Each email has its own
 * folderPath; load bodies with that folder.
 */
export function useThreadConversation(
  uid: string,
  folder: string,
  { sentFolder, enabled = true }: { sentFolder?: string; enabled?: boolean } = {}
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: threadDetailCacheKey(folder, uid),
    queryFn: async () => {
      const data = await emailThread(uid, folder, { sentFolder });
      noteUidValidity(queryClient, folder, data.uid_validity);
      return data;
    },
    enabled: enabled && /^\d+$/.test(uid) && !!folder,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    // 404: the email is gone (moved / deleted elsewhere), retrying won't help
    retry: (failureCount, error) =>
      !(error instanceof HttpError && error.status === 404) && failureCount < 3,
    retryDelay: () => 500,
  });
}

/** Optimistic updates of the open conversation (delete / move of one email) */
export function useThreadMutations(folder: string, uid: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => threadDetailCacheKey(folder, uid), [folder, uid]);

  return useMemo(
    () => ({
      optimisticallyRemove: (email: EmailLike) => {
        queryClient.setQueryData<ThreadDetail>(queryKey, (old) =>
          old ? { ...old, emails: old.emails.filter((e) => !isSameEmail(e, email)) } : old
        );
      },

      optimisticallyRestore: (email: EmailLike) => {
        queryClient.setQueryData<ThreadDetail>(queryKey, (old) => {
          if (!old || old.emails.some((e) => isSameEmail(e, email))) return old;
          return { ...old, emails: [...old.emails, email].sort(byDate) };
        });
      },

      invalidateThread: () => {
        queryClient.invalidateQueries({ queryKey, exact: true });
      },
    }),
    [queryClient, queryKey]
  );
}

/**
 * A reply was accepted for sending: show it in every open conversation that contains the email it answers. The
 * send goes through a queue, so nothing reloads the conversation automatically;
 * the reply stays a preview until the user reloads it.
 */
export function addPendingReply(
  queryClient: QueryClient,
  original: EmailLike,
  reply: EmailLike
) {
  queryClient.setQueriesData<ThreadDetail>({ queryKey: ['thread', 'detail'] }, (old) => {
    if (!old?.emails?.some((e) => isSameEmail(e, original))) return old;
    return { ...old, emails: [...old.emails, reply] };
  });
}

