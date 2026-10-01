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

// EmptyFolderBanner.tsx
import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useState } from 'react';
import { MdDeleteForever } from 'react-icons/md';
import { useEmptyFolder } from '../../../hooks/useEmails';
import { useToast } from '../../../hooks/useToast';
import { folderDetailsAtom, type FolderDetail } from '../../../state/folders';
import { getEmptiableFolderKind } from '../../../utils/folderUtils';

interface EmptyFolderBannerProps {
  folder: string;
  folderDetail?: FolderDetail | null;
  /** Number of emails in the folder, for the confirmation text (when known). */
  emailCount?: number;
  onEmptied?: () => void;
}

/**
 * "Empty Trash now" / "Empty Spam now" bar shown at the top of a Trash or Spam
 * list. Permanently deletes every email in the folder after confirmation.
 */
const EmptyFolderBanner = ({
  folder,
  folderDetail,
  emailCount,
  onEmptied,
}: EmptyFolderBannerProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const setFolderDetails = useSetAtom(folderDetailsAtom);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { mutate, isPending } = useEmptyFolder();

  const kind = getEmptiableFolderKind(folder, folderDetail ?? undefined);
  if (!kind) return null;

  const label = kind === 'trash' ? 'Trash' : 'Spam';
  const countText =
    typeof emailCount === 'number'
      ? `all ${emailCount} email${emailCount === 1 ? '' : 's'}`
      : 'all emails';

  const handleEmpty = () => {
    mutate(folder, {
      onSuccess: (res) => {
        setIsConfirmOpen(false);

        // Show the empty list right away; the reload confirms it
        queryClient.setQueriesData(
          { queryKey: ['folder', folder], exact: false },
          (old: Record<string, unknown> | undefined) =>
            old ? { ...old, emails: [], total_count: 0, total_pages: 0 } : old
        );
        setFolderDetails((prev) =>
          Array.isArray(prev)
            ? prev.map((f) =>
                f.folder_name === folder
                  ? {
                      ...f,
                      unread_count: 0,
                      ...(f.status ? { status: { ...f.status, MESSAGES: 0 } } : {}),
                    }
                  : f
              )
            : prev
        );

        toast.success({
          description: res.deleted_count
            ? `${res.deleted_count} email${res.deleted_count === 1 ? '' : 's'} deleted`
            : res.message,
        });
        onEmptied?.();
      },
      onError: (error) => {
        setIsConfirmOpen(false);
        toast.error({ description: error.message || `Failed to empty ${label}` });
      },
    });
  };

  return (
    <>
      <div className="flex items-center justify-center gap-2 px-3 py-2 text-xs text-[var(--gray-11)] bg-[var(--gray-2)] border-b border-[var(--gray-5)]">
        <span>Emails in {label} can be deleted permanently.</span>
        <button
          onClick={() => setIsConfirmOpen(true)}
          disabled={isPending}
          className="inline-flex items-center gap-1 font-medium text-[var(--accent-11)] hover:underline disabled:opacity-50 disabled:no-underline"
        >
          <MdDeleteForever size={14} />
          Empty {label} now
        </button>
      </div>

      <AlertDialog.Root
        open={isConfirmOpen}
        onOpenChange={(open) => !isPending && setIsConfirmOpen(open)}
      >
        <AlertDialog.Content style={{ maxWidth: 450, borderRadius: 12 }}>
          <AlertDialog.Title>Empty {label}?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            <Text color="gray">
              Permanently delete {countText} in {label}? This can&apos;t be undone.
            </Text>
          </AlertDialog.Description>
          <Flex gap="3" justify="end" mt="4">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" disabled={isPending}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            {/* Not AlertDialog.Action: that closes the dialog before the request finishes */}
            <Button color="red" onClick={handleEmpty} disabled={isPending} loading={isPending}>
              Empty {label}
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
};

export default EmptyFolderBanner;
