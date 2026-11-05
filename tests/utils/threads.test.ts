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

import { describe, expect, it } from 'vitest';
import {
  MissingUidError,
  countUnread,
  expandRowIds,
  normalizeEmail,
  patchRowFlags,
  rowKey,
  threadToRow,
  unquoteFolder,
  type ApiThread,
} from '../../src/utils/threads';

const apiThread = (overrides: Partial<ApiThread> = {}): ApiThread => ({
  id: '67',
  thread_id: '2',
  email_ids: ['2', '3', '67'],
  sent_email_ids: ['310'],
  sent_folder_path: 'Sent',
  subject: 'Project A',
  message_count: 4,
  folder_message_count: 3,
  unread_count: 1,
  is_unread: true,
  is_flagged: false,
  has_attachment: true,
  participants: ['Alice <alice@x.com>', 'Me <me@x.com>'],
  latest: { id: '67', uid: '67', From: 'Alice <alice@x.com>', FLAGS: ['\\Seen'], Subject: 'Re: Project A' },
  last_message: { id: '310', uid: '310', From: 'Me <me@x.com>', folder_path: 'Sent' },
  ...overrides,
});

describe('normalizeEmail', () => {
  it('makes id the UID, never the sequence number', () => {
    const email = normalizeEmail({ id: '5', uid: '1201', Subject: 'x' }, 'INBOX');
    expect(email.id).toBe('1201');
    expect(email.uid).toBe('1201');
    expect(email.folderPath).toBe('INBOX');
  });

  it('keeps the folder the API reports for the email (replies from Sent)', () => {
    expect(normalizeEmail({ uid: '9', folder_path: 'Sent' }, 'INBOX').folderPath).toBe('Sent');
  });

  it('removes the quotes the API echoes back for folders with spaces', () => {
    expect(normalizeEmail({ uid: '9', folder_path: '"Sent Items"' }, 'INBOX').folderPath).toBe(
      'Sent Items'
    );
    expect(unquoteFolder('"My Folder"')).toBe('My Folder');
    expect(unquoteFolder('INBOX')).toBe('INBOX');
  });

  it('refuses an email without a UID (an old API): it would act on the wrong email', () => {
    expect(() => normalizeEmail({ id: '5' }, 'INBOX')).toThrow(MissingUidError);
    expect(() => normalizeEmail({ id: '5', uid: null }, 'INBOX')).toThrow(MissingUidError);
    expect(() => normalizeEmail({ id: '5', uid: 'abc' }, 'INBOX')).toThrow(MissingUidError);
  });
});

describe('threadToRow', () => {
  it('uses the latest email of the folder as the row and keeps the conversation summary', () => {
    const row = threadToRow(apiThread(), 'INBOX');
    expect(row.id).toBe('67');
    expect(row.folderPath).toBe('INBOX');
    expect(row.thread).toMatchObject({
      threadId: '2',
      emailIds: [2, 3, 67],
      sentEmailIds: [310],
      sentFolderPath: 'Sent',
      messageCount: 4,
      folderMessageCount: 3,
      unreadCount: 1,
    });
    expect(row.thread?.lastMessage?.folderPath).toBe('Sent');
    expect(row.has_attachment).toBe(true);
  });

  it('derives FLAGS from the whole conversation', () => {
    // latest email is read, but another one is not: the row is unread
    expect(threadToRow(apiThread(), 'INBOX').FLAGS).not.toContain('\\Seen');
    const readFlagged = threadToRow(apiThread({ is_unread: false, is_flagged: true }), 'INBOX');
    expect(readFlagged.FLAGS).toEqual(expect.arrayContaining(['\\Seen', '\\Flagged']));
  });

  it('works without Sent data (listing the Sent folder itself)', () => {
    const row = threadToRow(
      apiThread({ sent_email_ids: undefined, sent_folder_path: undefined, last_message: undefined }),
      'Sent'
    );
    expect(row.thread?.sentEmailIds).toEqual([]);
    expect(row.thread?.sentFolderPath).toBeNull();
    expect(row.thread?.folderMessageCount).toBe(3);
  });

  it('keeps search matches', () => {
    const row = threadToRow(apiThread({ matched_email_ids: ['3'] }), 'INBOX');
    expect(row.thread?.matchedEmailIds).toEqual([3]);
  });

  it('gives conversations a key that survives a new reply', () => {
    expect(rowKey(threadToRow(apiThread(), 'INBOX'))).toBe('thread-2');
    expect(rowKey({ id: '5' })).toBe('email-5');
  });
});

describe('expandRowIds / countUnread', () => {
  const rows = [
    threadToRow(apiThread(), 'INBOX'),
    { id: '80', FLAGS: [] },
    { id: '81', FLAGS: ['\\Seen'] },
  ];

  it('expands a conversation row to all its emails of the folder, not the Sent replies', () => {
    expect(expandRowIds(rows, [67, 80])).toEqual([2, 3, 67, 80]);
  });

  it('keeps ids it does not know (an email opened from search)', () => {
    expect(expandRowIds(rows, [999])).toEqual([999]);
  });

  it('counts unread emails, a conversation by its unread count', () => {
    expect(countUnread(rows, [67, 80, 81])).toBe(2);
    // expanded UIDs work too
    expect(countUnread(rows, [2, 3, 67])).toBe(1);
  });
});

describe('patchRowFlags', () => {
  const uids = (...ids: number[]) => new Set(ids);

  it('patches a plain email only when its UID is hit', () => {
    const email = { id: '5', FLAGS: [] as string[] };
    expect(patchRowFlags(email, uids(5), '\\Seen').FLAGS).toEqual(['\\Seen']);
    expect(patchRowFlags(email, uids(6), '\\Seen')).toBe(email);
  });

  it('marks a conversation read when all its emails are marked read', () => {
    const row = patchRowFlags(threadToRow(apiThread(), 'INBOX'), uids(2, 3, 67), '\\Seen');
    expect(row.thread?.unreadCount).toBe(0);
    expect(row.FLAGS).toContain('\\Seen');
  });

  it('marking its latest email unread makes the conversation unread', () => {
    const read = threadToRow(apiThread({ is_unread: false, unread_count: 0 }), 'INBOX');
    const row = patchRowFlags(read, uids(67), undefined, '\\Seen');
    expect(row.thread?.unreadCount).toBe(1);
    expect(row.FLAGS).not.toContain('\\Seen');
  });

  it('only clears the conversation flag when every email was unflagged', () => {
    const flagged = threadToRow(apiThread({ is_flagged: true }), 'INBOX');
    expect(patchRowFlags(flagged, uids(67), undefined, '\\Flagged').thread?.isFlagged).toBe(true);
    const all = patchRowFlags(flagged, uids(2, 3, 67), undefined, '\\Flagged');
    expect(all.thread?.isFlagged).toBe(false);
    expect(all.FLAGS).not.toContain('\\Flagged');
  });

  it('leaves a conversation alone when none of its emails is hit', () => {
    const row = threadToRow(apiThread(), 'INBOX');
    expect(patchRowFlags(row, uids(999), '\\Seen')).toBe(row);
  });
});
