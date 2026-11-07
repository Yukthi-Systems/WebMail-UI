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

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bulkEmails, folderUidValidity, type BulkAction } from '../api/mailbox';
import type { SearchRequest } from '../api/search';
import {
  bulkDoneText,
  bulkExcludedUids,
  bulkUnreadChanges,
  NO_EXCLUSIONS,
  runBulkAction,
  type BulkExclusions,
} from '../utils/bulkSelection';
import { invalidateFolderLists } from './useEmails';
import { useUpdateAnyFolderUnreadCount } from './useFolders';
import { useToast } from './useToast';

export interface PendingBulkAction {
  action: BulkAction;
  destFolder?: string;
  destName?: string;
}

interface UseBulkSelectionOptions {
  folder: string;
  filterBy: string;
  search: SearchRequest | null;
  conversations: boolean;
  /** Clears the selected rows; called before the lists reload */
  onFinished: () => void;
}

/**
 * Select all in a folder, filter or search, not only the loaded page.
 * Remembers the newest email at that moment (mail arriving later is not
 * touched), the folder's UIDVALIDITY, the total at that moment and the rows
 * unticked since, on any page.
 */
export function useBulkSelection({
  folder,
  filterBy,
  search,
  conversations,
  onFinished,
}: UseBulkSelectionOptions) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const updateUnreadCount = useUpdateAnyFolderUnreadCount();

  const [selection, setSelection] = useState<{
    maxUid: number;
    uidValidity: string;
    totalAtSelectAll: number;
  } | null>(null);
  const [exclusions, setExclusions] = useState<BulkExclusions>(NO_EXCLUSIONS);
  const [isSelecting, setIsSelecting] = useState(false);
  const [pending, setPending] = useState<PendingBulkAction | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Clearing also drops a select-all that is still waiting for the server
  const selectRequest = useRef(0);

  const clear = () => {
    selectRequest.current += 1;
    setIsSelecting(false);
    setSelection(null);
    setExclusions(NO_EXCLUSIONS);
  };

  const selectAll = async (totalAtSelectAll: number) => {
    const request = ++selectRequest.current;
    setExclusions(NO_EXCLUSIONS);
    setIsSelecting(true);
    try {
      const { data } = await folderUidValidity(folder);
      if (request !== selectRequest.current) return;
      setSelection({
        maxUid: data.UIDNEXT - 1,
        uidValidity: String(data.UIDVALIDITY),
        totalAtSelectAll,
      });
    } catch (error) {
      if (request !== selectRequest.current) return;
      toast.error({
        description: error instanceof Error ? error.message : 'Failed to select all emails',
      });
    } finally {
      if (request === selectRequest.current) setIsSelecting(false);
    }
  };

  // A selection only means something for the list it was made on
  const listKey = JSON.stringify([folder, filterBy, conversations, search && { ...search, page: 0 }]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (selection || isSelecting) {
      clear();
      onFinished();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  const run = async () => {
    if (!pending || !selection) return;
    const { action, destFolder, destName } = pending;
    setProgress({ done: 0, total: 0 });
    const excludeUids = bulkExcludedUids(exclusions);

    const result = await runBulkAction(
      () =>
        bulkEmails({
          folder_path: folder,
          action,
          max_uid: selection.maxUid,
          uid_validity: selection.uidValidity,
          dest_folder: destFolder,
          exclude_uids: excludeUids,
          filter_by: filterBy,
          search: search ?? undefined,
          conversations,
        }),
      (done, total) => setProgress({ done, total })
    );

    setPending(null);
    setProgress(null);
    clear();
    onFinished();

    bulkUnreadChanges(action, folder, result, destFolder).forEach(([changedFolder, change]) => {
      if (change) updateUnreadCount(changedFolder, change);
    });
    invalidateFolderLists(queryClient, [folder, destFolder]);

    if (result.error) {
      toast.error({
        description: `${result.error.message}. ${bulkDoneText(action, result.done, destName)} before it stopped.`,
      });
    } else {
      toast.success({ description: bulkDoneText(action, result.done, destName) });
    }
  };

  return {
    selection,
    exclusions,
    setExclusions,
    isSelecting,
    selectAll,
    clear,
    pending,
    progress,
    /** Asks for confirmation; `run` then does the work */
    request: (action: BulkAction, destFolder?: string, destName?: string) =>
      setPending({ action, destFolder, destName }),
    cancel: () => setPending(null),
    run,
  };
}
