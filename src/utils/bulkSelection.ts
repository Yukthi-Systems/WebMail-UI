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

// Select all in a folder, filter or search: texts and the request loop.

import type { BulkAction, BulkEmailResponse } from '../api/mailbox';

export const countEmails = (count: number) =>
  `${count.toLocaleString('en-US')} email${count === 1 ? '' : 's'}`;

/** Where the selection comes from: decides the wording of the banner */
export type BulkScope = 'folder' | 'filter' | 'search';

const scopeText = (scope: BulkScope) =>
  scope === 'search' ? 'matching this search' : scope === 'filter' ? 'in this view' : 'in this folder';

/** Offered once every row of the page is selected */
export const bulkOfferText = (
  rowCount: number,
  totalEmails: number,
  conversations: boolean,
  scope: BulkScope
) => ({
  message: `All ${rowCount} ${conversations ? 'conversations' : 'emails'} on this page are selected.`,
  action: `Select all ${countEmails(totalEmails)} ${scopeText(scope)}`,
});

/** Shown while the whole folder, filter or search is selected */
export const bulkSelectedText = (totalEmails: number, excluded: number, scope: BulkScope) => {
  const selected = Math.max(0, totalEmails - excluded);
  return excluded > 0
    ? `${selected.toLocaleString('en-US')} of ${countEmails(totalEmails)} ${scopeText(scope)} are selected.`
    : `All ${countEmails(totalEmails)} ${scopeText(scope)} are selected.`;
};

/** Question and details of the confirmation */
export const bulkConfirmText = (
  action: BulkAction,
  count: number,
  conversations: boolean,
  destName?: string
): { title: string; detail?: string; confirmLabel: string; danger?: boolean } => {
  const emails = countEmails(count);
  switch (action) {
    case 'read':
      return { title: `Mark ${emails} as read?`, confirmLabel: 'Mark as read' };
    case 'unread':
      return {
        title: conversations
          ? 'Mark the selected conversations as unread?'
          : `Mark ${emails} as unread?`,
        detail: conversations ? 'The latest email of each conversation becomes unread.' : undefined,
        confirmLabel: 'Mark as unread',
      };
    case 'flag':
      return { title: `Flag ${emails}?`, confirmLabel: 'Flag' };
    case 'unflag':
      return { title: `Remove the flag from ${emails}?`, confirmLabel: 'Remove flag' };
    case 'move':
      return {
        title: `Move ${emails} to ${destName ?? 'the folder'}?`,
        detail: conversations ? 'Your replies stay in your Sent folder.' : undefined,
        confirmLabel: 'Move',
      };
    case 'delete':
      return {
        title: `Permanently delete ${emails}?`,
        detail: 'This cannot be undone.',
        confirmLabel: 'Delete permanently',
        danger: true,
      };
  }
};

/** Heading of the dialog while the action runs */
export const bulkProgressTitle = (action: BulkAction, destName?: string) => {
  switch (action) {
    case 'read':
      return 'Marking as read…';
    case 'unread':
      return 'Marking as unread…';
    case 'flag':
      return 'Flagging…';
    case 'unflag':
      return 'Removing flags…';
    case 'move':
      return `Moving to ${destName ?? 'the folder'}…`;
    case 'delete':
      return 'Deleting…';
  }
};

export const bulkDoneText = (action: BulkAction, done: number, destName?: string) => {
  const emails = countEmails(done);
  switch (action) {
    case 'read':
      return `${emails} marked as read`;
    case 'unread':
      return `${emails} marked as unread`;
    case 'flag':
      return `${emails} flagged`;
    case 'unflag':
      return `Flag removed from ${emails}`;
    case 'move':
      return `${emails} moved to ${destName ?? 'the folder'}`;
    case 'delete':
      return `${emails} permanently deleted`;
  }
};

export interface BulkRunResult {
  done: number;
  unreadAffected: number;
  error?: Error;
}

/**
 * The API works for about 20 seconds per request and reports what remains:
 * repeat until nothing remains. Each request finds the remaining emails again,
 * so nothing is done twice. Never rejects: emails already changed stay changed,
 * and the caller has to reload the lists either way.
 */
export const runBulkAction = async (
  send: () => Promise<BulkEmailResponse>,
  onProgress: (done: number, total: number) => void
): Promise<BulkRunResult> => {
  const result: BulkRunResult = { done: 0, unreadAffected: 0 };
  try {
    for (;;) {
      const response = await send();
      result.done += response.done;
      result.unreadAffected += response.unread_affected;
      onProgress(result.done, result.done + response.remaining);
      if (response.remaining === 0) return result;
      if (response.done === 0) {
        throw new Error('The mail server did not change any more emails');
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error : new Error(String(error));
    return result;
  }
};

/** Changes to the unread counts of the folders, as [folder, change] */
export const bulkUnreadChanges = (
  action: BulkAction,
  folder: string,
  result: BulkRunResult,
  destFolder?: string
): [string, number][] => {
  switch (action) {
    case 'read':
      return [[folder, -result.done]];
    case 'unread':
      return [[folder, result.done]];
    case 'move':
      return [
        [folder, -result.unreadAffected],
        [destFolder ?? '', result.unreadAffected],
      ];
    case 'delete':
      return [[folder, -result.unreadAffected]];
    default:
      return [];
  }
};
