import { describe, expect, it, vi } from 'vitest';
import {
  bulkConfirmText,
  bulkOfferText,
  bulkProgressTitle,
  bulkSelectedText,
  bulkUnreadChanges,
  runBulkAction,
} from '../../src/utils/bulkSelection';

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
