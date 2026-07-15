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

// src/hooks/useEmailListActions.ts
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDeleteMail,
  useMoveMail,
  useSeenMail,
  useUnseenMail,
  useFlaggedMail,
  useUnFlaggedMail,
} from './useEmails';
import { useToast } from '../components/ui/ToastComponent';
import type { Email } from '../api/mailbox';

interface UseEmailListActionsProps {
  folder?: string;
  currentPage: number;
  PER_PAGE: number;
  undoTime: number;
}

interface PendingAction {
  emailIds: number[];
  originalFolder: string;
}

export const useEmailListActions = ({
  folder = 'INBOX',
  currentPage,
  PER_PAGE,
  undoTime,
}: UseEmailListActionsProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const pendingDeleteActions = useRef<Map<string, PendingAction>>(new Map());

  const { mutate: moveMutate } = useMoveMail();
  const { mutate: markUnReadMutate } = useUnseenMail();
  const { mutate: markReadMutate } = useSeenMail();
  const { mutate: markUnFlaggedMutate } = useUnFlaggedMail();
  const { mutate: markFlaggedMutate } = useFlaggedMail();
  const { mutate: deleteMutate } = useDeleteMail();

  const handleSuccess = useCallback(
    (message: string) => {
      queryClient.invalidateQueries({
        queryKey: ['folder', folder, 'page', currentPage, 'perPage', PER_PAGE],
      });
      toast.success({ description: message });
    },
    [folder, currentPage, PER_PAGE, queryClient, toast]
  );

  const handleError = useCallback(
    (error: any, defaultMessage: string) => {
      toast.error({
        description: error?.message || defaultMessage,
      });
    },
    [toast]
  );

  // Helper to check if email is unread
  const isEmailUnread = useCallback((email: Email): boolean => {
    const flags = email.FLAGS || [];
    return Array.isArray(flags) ? !flags.includes('\\Seen') : !String(flags).includes('\\Seen');
  }, []);

  // Function to mark as read only if unread
  const markAsReadIfUnread = useCallback(
    (email: Email, emailIds: number[], singleEmailId?: string) => {
      const emailIdNum = singleEmailId ? Number(singleEmailId) : emailIds[0];

      if (isEmailUnread(email)) {
        markReadMutate(
          {
            path: folder,
            body: [emailIdNum],
          },
          {
            onSuccess: (res: any) => {
              handleSuccess(res?.message || 'Email marked as read');
            },
            onError: (error) => {
              handleError(error, 'Failed to mark email as read');
            },
          }
        );
      }
    },
    [folder, markReadMutate, handleSuccess, handleError, isEmailUnread]
  );

  const handleDeleteAction = useCallback(
    (actionId: string, emailsToActOn: number[], permanentDelete: boolean = false) => {
      if (permanentDelete || folder === 'Trash') {
        deleteMutate(
          {
            path: folder,
            body: emailsToActOn,
          },
          {
            onSuccess: (res: any) => {
              handleSuccess(res?.message || 'Email permanently deleted.');
              pendingDeleteActions.current.delete(actionId);
            },
            onError: (error) => {
              handleError(error, 'Failed to delete email');
              pendingDeleteActions.current.delete(actionId);
            },
          }
        );
      } else {
        // Move to trash with undo option
        toast.success({
          description: 'Email moved to trash',
          undo: {
            label: 'Undo',
            onClick: () => {
              const action = pendingDeleteActions.current.get(actionId);
              if (action) {
                moveMutate(
                  {
                    path: 'Trash',
                    sourceFolder: 'Trash',
                    destFolder: action.originalFolder,
                    body: action.emailIds,
                  },
                  {
                    onSuccess: () => {
                      handleSuccess('Delete operation cancelled');
                    },
                    onError: (error) => {
                      handleError(error, 'Failed to undo delete operation');
                    },
                  }
                );
                pendingDeleteActions.current.delete(actionId);
              }
            },
            duration: undoTime,
          },
        });

        setTimeout(() => {
          if (pendingDeleteActions.current.has(actionId)) {
            moveMutate(
              {
                path: folder,
                sourceFolder: folder,
                destFolder: 'Trash',
                body: emailsToActOn,
              },
              {
                onSuccess: () => {
                  handleSuccess('Email moved to trash');
                  pendingDeleteActions.current.delete(actionId);
                },
                onError: (error) => {
                  handleError(error, 'Failed to move email to trash');
                  pendingDeleteActions.current.delete(actionId);
                },
              }
            );
          }
        }, undoTime);
      }
    },
    [folder, deleteMutate, moveMutate, handleSuccess, handleError, toast, undoTime]
  );

  const deleteEmails = useCallback(
    (emailsToActOn: number[], singleEmailId?: string) => {
      const actionId = `delete-${Date.now()}-${Math.random()}`;
      const emailIds = singleEmailId ? [Number(singleEmailId)] : emailsToActOn;

      pendingDeleteActions.current.set(actionId, {
        emailIds,
        originalFolder: folder,
      });

      handleDeleteAction(actionId, emailIds, folder === 'Trash');
    },
    [folder, handleDeleteAction]
  );

  const markAsRead = useCallback(
    (emailIds: number[], markAsUnread: boolean = false) => {
      const mutate = markAsUnread ? markUnReadMutate : markReadMutate;
      const successMessage = markAsUnread ? 'Email marked as unread' : 'Email marked as read';

      mutate(
        {
          path: folder,
          body: emailIds,
        },
        {
          onSuccess: (res: any) => {
            handleSuccess(res?.message || successMessage);
          },
          onError: (error) => {
            handleError(error, `Failed to ${markAsUnread ? 'unread' : 'read'} email`);
          },
        }
      );
    },
    [folder, markReadMutate, markUnReadMutate, handleSuccess, handleError]
  );

  const markAsFlagged = useCallback(
    (emailIds: number[], removeFlag: boolean = false) => {
      const mutate = removeFlag ? markUnFlaggedMutate : markFlaggedMutate;
      const successMessage = removeFlag ? 'Flag removed' : 'Email flagged';

      mutate(
        {
          path: folder,
          body: emailIds,
        },
        {
          onSuccess: (res: any) => {
            handleSuccess(res?.message || successMessage);
          },
          onError: (error) => {
            handleError(error, `Failed to ${removeFlag ? 'remove flag' : 'flag email'}`);
          },
        }
      );
    },
    [folder, markFlaggedMutate, markUnFlaggedMutate, handleSuccess, handleError]
  );

  return {
    deleteEmails,
    markAsRead,
    markAsReadIfUnread,
    markAsFlagged,
    isEmailUnread,
    pendingDeleteActions: pendingDeleteActions.current,
  };
};
