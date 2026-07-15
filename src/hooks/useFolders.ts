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

import { useQuery } from '@tanstack/react-query';
import { folders, foldersFullPath, folderUidValidity, foldersQuota } from '../api/mailbox';
import { buildFolderTree } from '../utils/folderUtils';

import { type EmailFolders, defaultFolders } from '../api/mailbox';
import { useEffect, useMemo, useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { folderDetailsAtom } from '../state/folders';

const FOLDER_RETRY_DELAY = () => 500;

export function useFolders() {
  return useQuery<EmailFolders, Error>({
    queryKey: ['folders'],
    queryFn: folders,
    initialData: [defaultFolders, []],
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 5,
    retryDelay: FOLDER_RETRY_DELAY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useFoldersFullPath() {
  const setFolderDetails = useSetAtom(folderDetailsAtom);

  const query: any = useQuery<EmailFolders, Error>({
    queryKey: ['foldersFullPath'],
    queryFn: foldersFullPath,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 5,
    retryDelay: FOLDER_RETRY_DELAY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      setFolderDetails(query.data.folders);
    } else if (query.isError || (query.isSuccess && !query.data)) {
      setFolderDetails([]);
    }
  }, [query.isSuccess, query.isError, query.data, setFolderDetails]);

  return query;
}

interface FolderItem {
  flags: string[];
  delimiter: string;
  folder_name: string;
  unread_count: number;
}

// Update the hook to handle the correct data structure
export const useFoldersDropdown = () => {
  const { data, ...queryResult } = useQuery<EmailFolders>({
    queryKey: ['foldersFullPath'],
    queryFn: foldersFullPath,
    staleTime: 1000 * 60 * 5,
  });

  const folders = useMemo(() => {
    if (!data) return [];

    // Handle different possible structures of the API response
    if (Array.isArray(data)) {
      // If data is already an array, use it directly
      return buildFolderTree(data as unknown as FolderItem[]);
    } else if (typeof data === 'object' && data !== null) {
      // If data is an object, check for common properties that might contain the folders array
      const foldersArray = (data as any).folders || (data as any).items || (data as any).data || [];

      return buildFolderTree(foldersArray as FolderItem[]);
    }

    return [];
  }, [data]);

  return { data: folders, ...queryResult };
};

export function useUpdateFolderUnreadCount(folderName: string) {
  const setFolderDetails = useSetAtom(folderDetailsAtom);

  return useCallback(
    (delta: number) => {
      setFolderDetails((prev: any[]) =>
        Array.isArray(prev)
          ? prev.map((f: any) =>
              f.folder_name === folderName
                ? { ...f, unread_count: Math.max(0, (f.unread_count || 0) + delta) }
                : f
            )
          : prev
      );
    },
    [folderName, setFolderDetails]
  );
}

// General-purpose variant: folder name is passed at call time, not at hook time.
// Use this when the target folder is only known at runtime (e.g. move/copy dialogs).
export function useUpdateAnyFolderUnreadCount() {
  const setFolderDetails = useSetAtom(folderDetailsAtom);

  return useCallback(
    (folderName: string, delta: number) => {
      setFolderDetails((prev: any[]) =>
        Array.isArray(prev)
          ? prev.map((f: any) =>
              f.folder_name === folderName
                ? { ...f, unread_count: Math.max(0, (f.unread_count || 0) + delta) }
                : f
            )
          : prev
      );
    },
    [setFolderDetails]
  );
}

export function useFolderUidValidity(folderPath?: string) {
  return useQuery<{ MESSAGES: number; UIDNEXT: number; UIDVALIDITY: number }, Error>({
    queryKey: ['folderUidValidity', folderPath],
    queryFn: async () => {
      const response = await folderUidValidity(folderPath!);
      return response.data;
    },
    enabled: !!folderPath,
    retry: 5,
    retryDelay: 500,
  });
}

export function useFolderQuota(folderPath: string = 'User quota') {
  return useQuery<any, Error>({
    queryKey: ['folderQuota', folderPath],
    queryFn: () => foldersQuota(folderPath),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 5,
    retryDelay: 500,
    refetchOnWindowFocus: false,
  });
}
