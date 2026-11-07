import { describe, expect, it, vi } from 'vitest';
import {
  bulkConfirmText,
  bulkCounts,
  bulkExcludedUids,
  bulkOfferText,
  bulkProgressTitle,
  bulkSelectedText,
  bulkUnreadChanges,
  isRowBulkSelected,
  isRowInBulkRange,
  NO_EXCLUSIONS,
  refreshExclusions,
  runBulkAction,
  setRowsExcluded,
} from '../../src/utils/bulkSelection';
import type { EmailLike, ThreadInfo } from '../../src/utils/threads';

const email = (id: number): EmailLike => ({ id: String(id) });

/** A conversation row: its id is the latest UID, its thread id the oldest */
const conversation = (...emailIds: number[]): EmailLike => ({
  id: String(emailIds[emailIds.length - 1]),
  thread: { threadId: String(emailIds[0]), emailIds } as ThreadInfo,
});

describe('exclusions across pages', () => {
  const MAX_UID = 1000;

  it('excludes a row and includes it again', () => {
    const row = email(5);
    const excluded = setRowsExcluded(NO_EXCLUSIONS, [row], true);
    expect(isRowBulkSelected(row, MAX_UID, excluded)).toBe(false);
    expect(bulkExcludedUids(excluded)).toEqual([5]);

    const included = setRowsExcluded(excluded, [row], false);
    expect(isRowBulkSelected(row, MAX_UID, included)).toBe(true);
    expect(bulkExcludedUids(included)).toEqual([]);
  });

  it('keeps exclusions of pages that are no longer loaded', () => {
    const pageTwo = [email(20), email(21)];
    const pageThree = [email(30), email(31)];
    const exclusions = setRowsExcluded(NO_EXCLUSIONS, [pageTwo[0]], true);

    // Page three on screen: its rows are ticked, page two's exclusion is still sent
    expect(pageThree.every((row) => isRowBulkSelected(row, MAX_UID, exclusions))).toBe(true);
    expect(refreshExclusions(exclusions, pageThree)).toBe(exclusions);
    expect(bulkExcludedUids(exclusions)).toEqual([20]);

    // Back on page two: still unticked, and only that row
    expect(isRowBulkSelected(pageTwo[0], MAX_UID, exclusions)).toBe(false);
    expect(isRowBulkSelected(pageTwo[1], MAX_UID, exclusions)).toBe(true);
  });

  it('doing a whole page only touches that page', () => {
    const pageOne = [email(10), email(11)];
    const pageTwo = [email(20), email(21)];
    const exclusions = setRowsExcluded(NO_EXCLUSIONS, [...pageOne, ...pageTwo], true);
    expect(bulkExcludedUids(setRowsExcluded(exclusions, pageTwo, false))).toEqual([10, 11]);
  });

  it('sends all UIDs of a conversation and recognises it after a new reply', () => {
    const excluded = setRowsExcluded(NO_EXCLUSIONS, [conversation(7, 9, 12)], true);
    expect(bulkExcludedUids(excluded)).toEqual([7, 9, 12]);

    // The row id changes from 12 to 15, the conversation stays unticked
    expect(isRowBulkSelected(conversation(7, 9, 12, 15), MAX_UID, excluded)).toBe(false);
  });

  it('adds UIDs that a reload revealed in an unticked conversation', () => {
    const excluded = setRowsExcluded(NO_EXCLUSIONS, [conversation(7, 9)], true);
    const refreshed = refreshExclusions(excluded, [conversation(7, 9, 12), conversation(3, 4)]);
    expect(bulkExcludedUids(refreshed)).toEqual([7, 9, 12]);
    expect(refreshExclusions(refreshed, [conversation(7, 9, 12)])).toBe(refreshed);
  });

  it('leaves rows newer than max_uid unselected', () => {
    expect(isRowInBulkRange(email(1001), MAX_UID)).toBe(false);
    expect(isRowBulkSelected(email(1001), MAX_UID, NO_EXCLUSIONS)).toBe(false);
    expect(isRowBulkSelected(conversation(1001, 1002), MAX_UID, NO_EXCLUSIONS)).toBe(false);
  });

  it('selects a conversation with both older and newer emails', () => {
    expect(isRowBulkSelected(conversation(999, 1001), MAX_UID, NO_EXCLUSIONS)).toBe(true);
  });
});

describe('bulkCounts', () => {
  const MAX_UID = 1000;

  it('keeps a running total across pages', () => {
    const exclusions = setRowsExcluded(
      setRowsExcluded(NO_EXCLUSIONS, [email(20)], true),
      [conversation(30, 31, 32)],
      true
    );
    expect(bulkCounts(14937, 14937, exclusions, MAX_UID)).toEqual({
      total: 14937,
      excluded: 4,
      selected: 14933,
    });
  });

  it('does not count mail that arrived after select all', () => {
    expect(bulkCounts(100, 105, NO_EXCLUSIONS, MAX_UID).selected).toBe(100);
  });

  it('follows the list when emails have left it', () => {
    expect(bulkCounts(100, 97, NO_EXCLUSIONS, MAX_UID).selected).toBe(97);
  });

  it('counts only the older emails of an unticked conversation', () => {
    const exclusions = setRowsExcluded(NO_EXCLUSIONS, [conversation(999, 1000, 1001)], true);
    expect(bulkExcludedUids(exclusions)).toEqual([999, 1000, 1001]);
    expect(bulkCounts(100, 101, exclusions, MAX_UID)).toEqual({
      total: 100,
      excluded: 2,
      selected: 98,
    });
  });

  it('counts a UID once and never goes below zero', () => {
    const exclusions = {
      'thread-1': [1, 2],
      'thread-2': [2, 3],
    };
    expect(bulkCounts(2, 2, exclusions, MAX_UID)).toEqual({ total: 2, excluded: 3, selected: 0 });
  });
});

const reply = (done: number, remaining: number, unread = 0) => ({
  folder_path: 'INBOX',
  action: 'move' as const,
  done,
  remaining,
  unread_affected: unread,
});

describe('runBulkAction', () => {
  it('repeats until nothing remains and adds up the results', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(reply(5000, 9000, 10))
      .mockResolvedValueOnce(reply(5000, 4000, 20))
      .mockResolvedValueOnce(reply(4000, 0, 5));
    const onProgress = vi.fn();

    expect(await runBulkAction(send, onProgress)).toEqual({ done: 14000, unreadAffected: 35 });
    expect(send).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls).toEqual([
      [5000, 14000],
      [10000, 14000],
      [14000, 14000],
    ]);
  });

  it('stops when a request changes nothing, instead of looping for ever', async () => {
    const send = vi.fn().mockResolvedValue(reply(0, 100));
    const result = await runBulkAction(send, vi.fn());
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('keeps what was already done when a request fails', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(reply(5000, 1000, 3))
      .mockRejectedValueOnce(new Error('network'));
    const result = await runBulkAction(send, vi.fn());
    expect(result.done).toBe(5000);
    expect(result.unreadAffected).toBe(3);
    expect(result.error?.message).toBe('network');
  });

  it('finishes when there was nothing to do', async () => {
    const send = vi.fn().mockResolvedValue(reply(0, 0));
    expect(await runBulkAction(send, vi.fn())).toEqual({ done: 0, unreadAffected: 0 });
  });
});

describe('texts', () => {
  it('offers the whole folder, filter or search', () => {
    expect(bulkOfferText(50, 14937, true, 'folder')).toEqual({
      message: 'All 50 conversations on this page are selected.',
      action: 'Select all 14,937 emails in this folder',
    });
    expect(bulkOfferText(50, 80, false, 'filter').action).toBe('Select all 80 emails in this view');
    expect(bulkOfferText(50, 1, false, 'search').action).toBe(
      'Select all 1 email matching this search'
    );
  });

  it('shows what is left out of the selection', () => {
    expect(bulkSelectedText(14937, 0, 'folder')).toBe('All 14,937 emails in this folder are selected.');
    expect(bulkSelectedText(14937, 3, 'folder')).toBe(
      '14,934 of 14,937 emails in this folder are selected.'
    );
  });

  it('warns before a permanent delete and says replies stay in Sent', () => {
    const remove = bulkConfirmText('delete', 10, true);
    expect(remove.danger).toBe(true);
    expect(remove.detail).toBe('This cannot be undone.');
    expect(bulkConfirmText('move', 10, true, 'Trash').title).toBe('Move 10 emails to Trash?');
    expect(bulkConfirmText('move', 10, true, 'Trash').detail).toContain('Sent');
    expect(bulkConfirmText('move', 10, false, 'Trash').detail).toBeUndefined();
  });

  it('says that only the latest email becomes unread in a conversation', () => {
    expect(bulkConfirmText('unread', 10, true).detail).toContain('latest email');
    expect(bulkConfirmText('unread', 10, false).title).toBe('Mark 10 emails as unread?');
  });
});

describe('bulkProgressTitle', () => {
  it('names what is running', () => {
    expect(bulkProgressTitle('move', 'Trash')).toBe('Moving to Trash…');
    expect(bulkProgressTitle('delete')).toBe('Deleting…');
  });
});

describe('bulkUnreadChanges', () => {
  const result = { done: 100, unreadAffected: 7 };

  it('follows the emails between folders', () => {
    expect(bulkUnreadChanges('read', 'INBOX', result)).toEqual([['INBOX', -100]]);
    expect(bulkUnreadChanges('unread', 'INBOX', result)).toEqual([['INBOX', 100]]);
    expect(bulkUnreadChanges('move', 'INBOX', result, 'Trash')).toEqual([
      ['INBOX', -7],
      ['Trash', 7],
    ]);
    expect(bulkUnreadChanges('delete', 'Trash', result)).toEqual([['Trash', -7]]);
    expect(bulkUnreadChanges('flag', 'INBOX', result)).toEqual([]);
  });
});
