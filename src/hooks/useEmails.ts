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

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import {
  copyEmail,
  createEmailFolder,
  deleteEmail,
  deleteEmailFolder,
  editEmailFolder,
  emails,
  markFlaggedEmail,
  markReadEmail,
  markUnFlaggedEmail,
  moveEmail,
  unmarkReadEmail,
  type DeleteEmailPayload,
  type EmailFolderCreate,
  type EmailFolderEdit,
  type EmailFolders,
  type MoveEmailPayload,
  type ReadEmailPayload,
  type UnReadEmailPayload,
} from '../api/mailbox';
import { useRef } from 'react';

export function useEmails(
  folder: string,
  page: number = 1,
  perPage: number = 50,
  full_headers = true
) {
  // Logic to handle folder changes gracefully:
  // If the folder changes, we should always default back to page 1
  // to avoid making an API call for a page index that might not exist in the new folder.
  const lastFolderRef = useRef(folder);
  const isFolderChanged = lastFolderRef.current !== folder;

  if (isFolderChanged) {
    lastFolderRef.current = folder;
  }

  const effectivePage = isFolderChanged ? 1 : page;

  return useQuery({
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
    ],
    queryFn: () => emails(folder, effectivePage, perPage, full_headers),

    retry: 5,
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
  return useMutation<EmailFolders, Error, MoveEmailPayload>({
    mutationKey: ['move_mails'],
    mutationFn: (payload: MoveEmailPayload) =>
      moveEmail(payload.path, payload.sourceFolder, payload.destFolder, payload.body),
    retry: 5,
    retryDelay: 500,
  });
}

export function useCopyMail() {
  return useMutation<EmailFolders, Error, MoveEmailPayload>({
    mutationKey: ['copy_mails'],
    mutationFn: (payload: MoveEmailPayload) =>
      copyEmail(payload.path, payload.sourceFolder, payload.destFolder, payload.body),
    retry: 5,
    retryDelay: 500,
  });
}

export function useDeleteMail() {
  return useMutation<EmailFolders, Error, DeleteEmailPayload>({
    mutationKey: ['delete_mails'],
    mutationFn: (payload: DeleteEmailPayload) => deleteEmail(payload.path, payload.body),
    retry: 5,
    retryDelay: 500,
  });
}

export function useSeenMail() {
  return useMutation<EmailFolders, Error, ReadEmailPayload>({
    mutationKey: ['mark_read_mails'],
    mutationFn: (payload: ReadEmailPayload) => markReadEmail(payload.path, payload.body),
    // Idempotent — safe to retry once on transient IMAP failure
    retry: 5,
    retryDelay: 500,
  });
}

export function useUnseenMail() {
  return useMutation<EmailFolders, Error, UnReadEmailPayload>({
    mutationKey: ['mark_unread_mails'],
    mutationFn: (payload: UnReadEmailPayload) => unmarkReadEmail(payload.path, payload.body),
    retry: 5,
    retryDelay: 500,
  });
}

export function useFlaggedMail() {
  return useMutation<EmailFolders, Error, ReadEmailPayload>({
    mutationKey: ['mark_flagged_mails'],
    mutationFn: (payload: ReadEmailPayload) => markFlaggedEmail(payload.path, payload.body),
    retry: 5,
    retryDelay: 500,
  });
}

export function useUnFlaggedMail() {
  return useMutation<EmailFolders, Error, UnReadEmailPayload>({
    mutationKey: ['mark_unflagged_mails'],
    mutationFn: (payload: UnReadEmailPayload) => markUnFlaggedEmail(payload.path, payload.body),
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
