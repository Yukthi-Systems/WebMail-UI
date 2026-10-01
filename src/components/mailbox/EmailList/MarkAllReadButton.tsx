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

// MarkAllReadButton.tsx
import { Button } from '@radix-ui/themes';
import { useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { MdDoneAll } from 'react-icons/md';
import { useMarkFolderRead } from '../../../hooks/useEmails';
import { useToast } from '../../../hooks/useToast';
import { folderDetailsAtom } from '../../../state/folders';
import { searchStateAtom } from '../../../state/search';
import type { EmailLike } from '../../../utils/emailThreading';

interface MarkAllReadButtonProps {
  /** 'icon' renders a compact icon-only trigger (mobile toolbar). */
  variant?: 'button' | 'icon';
}

/**
 * Marks every unread email of the open folder as read on the server — including
 * emails not loaded in the UI. Disabled when the folder has no unread emails.
 */
const MarkAllReadButton = ({ variant = 'button' }: MarkAllReadButtonProps) => {
  const { folder: routeFolder } = useParams({ strict: false });
  const folder = routeFolder || 'INBOX';
  const [folderDetails, setFolderDetails] = useAtom(folderDetailsAtom);
  const isSearchActive = useAtomValue(searchStateAtom).isActive;
  const queryClient = useQueryClient();
  const toast = useToast();
  const { mutate, isPending } = useMarkFolderRead();

  if (isSearchActive) return null;

  const unreadCount = Array.isArray(folderDetails)
    ? folderDetails.find((f) => f.folder_name === folder)?.unread_count
    : undefined;
  // Unknown count (folder list not loaded yet) keeps the action available
  const isDisabled = isPending || unreadCount === 0;

  const handleClick = () => {
    mutate(folder, {
      onSuccess: (res) => {
        setFolderDetails((prev) =>
          Array.isArray(prev)
            ? prev.map((f) => (f.folder_name === folder ? { ...f, unread_count: 0 } : f))
            : prev
        );

        // Show the loaded rows as read right away; the reload confirms it
        queryClient.setQueriesData(
          { queryKey: ['folder', folder], exact: false },
          (old: { emails?: EmailLike[] } | undefined) => {
            if (!Array.isArray(old?.emails)) return old;
            return {
              ...old,
              emails: old.emails.map((email) =>
                email.FLAGS?.includes('\\Seen')
                  ? email
                  : { ...email, FLAGS: [...(email.FLAGS || []), '\\Seen'] }
              ),
            };
          }
        );

        toast.success({
          description: res.marked_count
            ? `${res.marked_count} email${res.marked_count === 1 ? '' : 's'} marked as read`
            : res.message,
        });
      },
      onError: (error) => {
        toast.error({ description: error.message || 'Failed to mark all emails as read' });
      },
    });
  };

  const title = unreadCount === 0 ? 'No unread emails' : 'Mark all as read';

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors disabled:opacity-50"
        title={title}
        aria-label="Mark all as read"
      >
        <MdDoneAll size={18} className={isPending ? 'animate-pulse' : ''} />
      </button>
    );
  }

  return (
    <Button
      variant="soft"
      size="2"
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      aria-label="Mark all as read"
    >
      <MdDoneAll size={16} className={isPending ? 'animate-pulse' : ''} />
    </Button>
  );
};

export default MarkAllReadButton;
