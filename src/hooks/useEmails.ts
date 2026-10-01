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

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  copyEmail,
  createEmailFolder,
  deleteEmail,
  deleteEmailFolder,
  editEmailFolder,
  emails,
  emptyFolder,
  markFolderRead,
  markFlaggedEmail,
  markReadEmail,
  markUnFlaggedEmail,
  moveEmail,
  unmarkReadEmail,
  type DeleteEmailPayload,
  type EmailFolderCreate,
  type EmailFolderEdit,
  type EmailFolders,
  type EmailListOptions,
  type MoveEmailPayload,
  type ReadEmailPayload,
  type UnReadEmailPayload,
} from '../api/mailbox';
import { useRef } from 'react';
import { HttpError } from '../api/fetchWrapper';
import { DEFAULT_EMAIL_SORT } from '../state/emailListView';

/**
 * After any change to a folder, every cached list view of it (all filters,
 * sorts and pages) may be wrong. Marks them stale so each reloads when shown;
 * the visible one reloads right away unless `refetchActive` is false (used for
 * flag changes, which are already patched into the visible list).
 */
export function invalidateFolderLists(
  queryClient: QueryClient,
  folders: (string | undefined)[],
  { refetchActive = true }: { refetchActive?: boolean } = {}
) {
  const refetchType = refetchActive ? 'active' : 'none';
  new Set(folders.filter(Boolean)).forEach((folder) => {
    queryClient.invalidateQueries({ queryKey: ['folder', folder], refetchType });
    // Message count changed (move/delete/empty): refresh the stored UID status
    // too, or the next "new mail?" check sees a difference and reloads again
    if (refetchActive) {
      queryClient.invalidateQueries({ queryKey: ['folderUidValidity', folder] });
    }
  });
  queryClient.invalidateQueries({ queryKey: ['search-emails'], refetchType });
}

export function useEmails(
  folder: string,
  page: number = 1,
  perPage: number = 50,
  full_headers = true,
  {
    sortBy = DEFAULT_EMAIL_SORT.sortBy,
    sortOrder = DEFAULT_EMAIL_SORT.sortOrder,
    filterBy = 'all',
  }: EmailListOptions = {}
) {
  // Logic to handle folder / sort / filter changes gracefully:
  // If any of them changes, we should always default back to page 1
  // to avoid making an API call for a page index that might not exist in the new view.
  const viewKey = `${folder}|${sortBy}|${sortOrder}|${filterBy}`;
  const lastViewKeyRef = useRef(viewKey);
  const isViewChanged = lastViewKeyRef.current !== viewKey;

  if (isViewChanged) {
    lastViewKeyRef.current = viewKey;
  }

  const effectivePage = isViewChanged ? 1 : page;

  return useQuery({
    // Sort/filter go after the existing segments so prefix matches on
    // ['folder', folder, 'page', page, 'perPage', perPage] keep working.
    queryKey: [
      'folder',
      folder,
      'page',
      effectivePage,
      'perPage',
      perPage,
      'fullHeaders',
      full_headers,
      'status',
      'sort',
      sortBy,
      sortOrder,
      'filter',
      filterBy,
    ],
    queryFn: () =>
      emails(folder, effectivePage, perPage, full_headers, { sortBy, sortOrder, filterBy }),

    // 400 (e.g. "Page number exceeds total pages") and 404 won't fix themselves
    retry: (failureCount, error) =>
      !(error instanceof HttpError && (error.status === 400 || error.status === 404)) &&
      failureCount < 5,
    retryDelay: () => 500,

    // Keep the previous page on screen while fetching the new one
    placeholderData: keepPreviousData,

    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    // Reconnect (e.g. wifi drop) should trigger a refresh to catch new mail
    refetchOnReconnect: true,
  });
}

export function useMoveMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, MoveEmailPayload>({
    mutationKey: ['move_mails'],
    mutationFn: (payload: MoveEmailPayload) =>
      moveEmail(payload.path, payload.sourceFolder, payload.destFolder, payload.body),
    onSuccess: (_data, payload) =>
      invalidateFolderLists(queryClient, [payload.sourceFolder, payload.destFolder]),
    retry: 5,
    retryDelay: 500,
  });
}

export function useCopyMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, MoveEmailPayload>({
    mutationKey: ['copy_mails'],
    mutationFn: (payload: MoveEmailPayload) =>
      copyEmail(payload.path, payload.sourceFolder, payload.destFolder, payload.body),
    onSuccess: (_data, payload) =>
      invalidateFolderLists(queryClient, [payload.sourceFolder, payload.destFolder]),
    retry: 5,
    retryDelay: 500,
  });
}

export function useDeleteMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, DeleteEmailPayload>({
    mutationKey: ['delete_mails'],
    mutationFn: (payload: DeleteEmailPayload) => deleteEmail(payload.path, payload.body),
    onSuccess: (_data, payload) => invalidateFolderLists(queryClient, [payload.path]),
    retry: 5,
    retryDelay: 500,
  });
}

export function useSeenMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, ReadEmailPayload>({
    mutationKey: ['mark_read_mails'],
    mutationFn: (payload: ReadEmailPayload) => markReadEmail(payload.path, payload.body),
    // Idempotent — safe to retry once on transient IMAP failure
    onSuccess: (_data, payload) =>
      invalidateFolderLists(queryClient, [payload.path], { refetchActive: false }),
    retry: 5,
    retryDelay: 500,
  });
}

export function useUnseenMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, UnReadEmailPayload>({
    mutationKey: ['mark_unread_mails'],
    mutationFn: (payload: UnReadEmailPayload) => unmarkReadEmail(payload.path, payload.body),
    onSuccess: (_data, payload) =>
      invalidateFolderLists(queryClient, [payload.path], { refetchActive: false }),
    retry: 5,
    retryDelay: 500,
  });
}

export function useFlaggedMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, ReadEmailPayload>({
    mutationKey: ['mark_flagged_mails'],
    mutationFn: (payload: ReadEmailPayload) => markFlaggedEmail(payload.path, payload.body),
    onSuccess: (_data, payload) =>
      invalidateFolderLists(queryClient, [payload.path], { refetchActive: false }),
    retry: 5,
    retryDelay: 500,
  });
}

export function useUnFlaggedMail() {
  const queryClient = useQueryClient();
  return useMutation<EmailFolders, Error, UnReadEmailPayload>({
    mutationKey: ['mark_unflagged_mails'],
    mutationFn: (payload: UnReadEmailPayload) => markUnFlaggedEmail(payload.path, payload.body),
    onSuccess: (_data, payload) =>
      invalidateFolderLists(queryClient, [payload.path], { refetchActive: false }),
    retry: 5,
    retryDelay: 500,
  });
}

export function useCreateEmailFolder() {
  return useMutation<EmailFolders, Error, EmailFolderCreate>({
    mutationKey: ['create_email_folder'],
    mutationFn: (payload: EmailFolderCreate) => createEmailFolder(payload.path || ''),
    retry: 5,
    retryDelay: 500,
  });
}

export function useEditEmailFolder() {
  return useMutation<EmailFolders, Error, EmailFolderEdit>({
    mutationKey: ['edit_email_folder'],
    mutationFn: (payload: EmailFolderEdit) =>
      editEmailFolder(payload.oldpath || '', payload.newpath || ''),
    retry: 5,
    retryDelay: 500,
  });
}

export function useDeleteEmailFolder() {
  return useMutation<EmailFolders, Error, EmailFolderCreate>({
    mutationKey: ['delete_email_folder'],
    mutationFn: (payload: EmailFolderCreate) => deleteEmailFolder(payload.path || ''),
    retry: 5,
    retryDelay: 500,
  });
}

export function useMarkFolderRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['mark_folder_read'],
    mutationFn: (folderPath: string) => markFolderRead(folderPath),
    onSuccess: (_data, folderPath) => invalidateFolderLists(queryClient, [folderPath]),
  });
}

export function useEmptyFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['empty_folder'],
    mutationFn: (folderPath: string) => emptyFolder(folderPath),
    onSuccess: (_data, folderPath) => invalidateFolderLists(queryClient, [folderPath]),
  });
}
