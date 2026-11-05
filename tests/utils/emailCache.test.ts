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

import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  emailViewCacheKey,
  noteUidValidity,
  rawEmailCacheKey,
  removeEmailCaches,
  resetKnownUidValidity,
  threadDetailCacheKey,
} from './emailCache';
import { patchCachedFlags } from '../hooks/useEmailCacheUpdater';
import { threadToRow } from './threads';

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  resetKnownUidValidity();
});

describe('cache keys', () => {
  it('are folder + UID (quotes removed), never a Message-ID or sequence number', () => {
    expect(emailViewCacheKey('"Sent Items"', 42)).toEqual(['email', 'view', 'Sent Items', '42']);
    expect(rawEmailCacheKey('INBOX', '42')).toEqual(['email', 'raw', 'INBOX', '42']);
    expect(threadDetailCacheKey('INBOX', 7)).toEqual(['thread', 'detail', 'INBOX', '7']);
  });

  it('the same UID in two folders are two entries', () => {
    queryClient.setQueryData(emailViewCacheKey('INBOX', 42), 'inbox email');
    queryClient.setQueryData(emailViewCacheKey('Sent', 42), 'sent email');
    expect(queryClient.getQueryData(emailViewCacheKey('INBOX', 42))).toBe('inbox email');
    expect(queryClient.getQueryData(emailViewCacheKey('Sent', 42))).toBe('sent email');
  });
});

describe('removeEmailCaches', () => {
  it('drops only the given UIDs of the given folder', () => {
    queryClient.setQueryData(emailViewCacheKey('INBOX', 1), 'a');
    queryClient.setQueryData(rawEmailCacheKey('INBOX', 2), 'b');
    queryClient.setQueryData(emailViewCacheKey('Sent', 1), 'c');

    removeEmailCaches(queryClient, 'INBOX', [1]);

    expect(queryClient.getQueryData(emailViewCacheKey('INBOX', 1))).toBeUndefined();
    expect(queryClient.getQueryData(rawEmailCacheKey('INBOX', 2))).toBe('b');
    expect(queryClient.getQueryData(emailViewCacheKey('Sent', 1))).toBe('c');
  });
});

describe('noteUidValidity', () => {
  it('drops the folder cache when UIDVALIDITY changes, and only then', () => {
    queryClient.setQueryData(emailViewCacheKey('INBOX', 1), 'a');
    queryClient.setQueryData(emailViewCacheKey('Sent', 1), 'b');

    expect(noteUidValidity(queryClient, 'INBOX', 100)).toBe(false); // first time: just remember
    expect(noteUidValidity(queryClient, 'INBOX', '100')).toBe(false); // unchanged
    expect(queryClient.getQueryData(emailViewCacheKey('INBOX', 1))).toBe('a');

    expect(noteUidValidity(queryClient, 'INBOX', 200)).toBe(true);
    expect(queryClient.getQueryData(emailViewCacheKey('INBOX', 1))).toBeUndefined();
    // other folders keep their cache
    expect(queryClient.getQueryData(emailViewCacheKey('Sent', 1))).toBe('b');
  });

  it('marks the folder lists stale', () => {
    noteUidValidity(queryClient, 'INBOX', 1);
    queryClient.setQueryData(['folder', 'INBOX', 'page', 1], { emails: [] });
    noteUidValidity(queryClient, 'INBOX', 2);
    expect(queryClient.getQueryState(['folder', 'INBOX', 'page', 1])?.isInvalidated).toBe(true);
  });

  it('ignores a missing value', () => {
    expect(noteUidValidity(queryClient, 'INBOX', undefined)).toBe(false);
    expect(noteUidValidity(queryClient, 'INBOX', '')).toBe(false);
  });
});

describe('patchCachedFlags', () => {
  it('patches only emails of the given folder (UID 42 in Sent is another email)', () => {
    queryClient.setQueryData(['folder', 'INBOX', 'page', 1], {
      emails: [{ id: '42', folderPath: 'INBOX', FLAGS: [] }],
    });
    queryClient.setQueryData(['search-emails', { folder: 'Sent' }], {
      data: { data: [{ id: '42', folderPath: 'Sent', FLAGS: [] }], total_count: 1 },
    });
    queryClient.setQueryData(threadDetailCacheKey('INBOX', 42), {
      emails: [
        { id: '42', folderPath: 'INBOX', FLAGS: [] },
        { id: '42', folderPath: 'Sent', FLAGS: [] },
      ],
      row: { id: '42', folderPath: 'INBOX', FLAGS: [] },
    });

    patchCachedFlags(queryClient, 'INBOX', [42], '\\Seen');

    const list = queryClient.getQueryData<{ emails: { FLAGS: string[] }[] }>([
      'folder',
      'INBOX',
      'page',
      1,
    ]);
    expect(list?.emails[0].FLAGS).toEqual(['\\Seen']);

    const search = queryClient.getQueryData<{ data: { data: { FLAGS: string[] }[] } }>([
      'search-emails',
      { folder: 'Sent' },
    ]);
    expect(search?.data.data[0].FLAGS).toEqual([]);

    const thread = queryClient.getQueryData<{ emails: { FLAGS: string[] }[] }>(
      threadDetailCacheKey('INBOX', 42)
    );
    expect(thread?.emails[0].FLAGS).toEqual(['\\Seen']);
    expect(thread?.emails[1].FLAGS).toEqual([]);
  });

  it('updates conversation rows containing the email', () => {
    const row = threadToRow(
      {
        id: '67',
        thread_id: '2',
        email_ids: ['2', '67'],
        message_count: 2,
        unread_count: 2,
        is_unread: true,
        is_flagged: false,
        has_attachment: false,
        latest: { uid: '67', FLAGS: [] },
      },
      'INBOX'
    );
    queryClient.setQueryData(['folder', 'INBOX', 'threads', 'page', 1], { emails: [row] });

    patchCachedFlags(queryClient, 'INBOX', [2, 67], '\\Seen');

    const data = queryClient.getQueryData<{ emails: typeof row[] }>([
      'folder',
      'INBOX',
      'threads',
      'page',
      1,
    ]);
    expect(data?.emails[0].thread?.unreadCount).toBe(0);
    expect(data?.emails[0].FLAGS).toContain('\\Seen');
  });
});
