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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./config.ts', () => ({ API_URL: 'https://api.test', authCheck: () => {} }));

import {
  copyEmail,
  deleteEmail,
  emailAttachment,
  emailRaw,
  emailThread,
  emailThreads,
  emailView,
  emails,
  markFlaggedEmail,
  markReadEmail,
  markUnFlaggedEmail,
  moveEmail,
  unmarkReadEmail,
} from './mailbox';
import { searchEmails, searchThreads } from './search';
import { MissingUidError } from '../utils/threads';

type Call = { url: URL; init: RequestInit };
let calls: Call[];
let nextBody: unknown;

beforeEach(() => {
  calls = [];
  nextBody = { message: 'ok' };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url: new URL(url), init });
      const body = JSON.stringify(nextBody);
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
    })
  );
});

afterEach(() => vi.unstubAllGlobals());

const lastCall = () => calls[calls.length - 1];
const param = (name: string) => lastCall().url.searchParams.get(name);

describe('every call that names an email sends use_uid=true', () => {
  const cases: [string, () => Promise<unknown>, string, string][] = [
    ['view', () => emailView('1201', 'INBOX'), 'GET', '/email/view/1201'],
    ['raw', () => emailRaw('1201', 'INBOX'), 'GET', '/email/raw/1201'],
    ['attachment', () => emailAttachment('1201', '2', 'INBOX'), 'GET', '/email/attachment/1201/2'],
    ['move', () => moveEmail('INBOX', 'INBOX', 'Trash', [1201]), 'PUT', '/email/move'],
    ['copy', () => copyEmail('INBOX', 'INBOX', 'Archive', [1201]), 'PATCH', '/email/copy'],
    ['delete', () => deleteEmail('Trash', [1201]), 'DELETE', '/email/permanently'],
    ['read', () => markReadEmail('INBOX', [1201]), 'PUT', '/email/mark/read'],
    ['unread', () => unmarkReadEmail('INBOX', [1201]), 'PATCH', '/email/mark/unseen'],
    ['flag', () => markFlaggedEmail('INBOX', [1201]), 'PUT', '/email/mark/flagged'],
    ['unflag', () => markUnFlaggedEmail('INBOX', [1201]), 'PATCH', '/email/mark/unflagged'],
  ];

  it.each(cases)('%s', async (_name, call, method, path) => {
    await call();
    expect(lastCall().url.pathname).toBe(path);
    expect(lastCall().init.method).toBe(method);
    expect(param('use_uid')).toBe('true');
    expect(param('folder_path')).toBeTruthy();
  });

  it('sends the UIDs as a JSON list of numbers', async () => {
    await moveEmail('INBOX', 'INBOX', 'Trash', [1201, 1210]);
    expect(lastCall().init.body).toBe('[1201,1210]');
    expect(param('source_folder')).toBe('INBOX');
    expect(param('dest_folder')).toBe('Trash');
  });

  it('quotes folders with spaces once, also when already quoted', async () => {
    await markReadEmail('Sent Items', [1]);
    expect(param('folder_path')).toBe('"Sent Items"');
    await markReadEmail('"Sent Items"', [1]);
    expect(param('folder_path')).toBe('"Sent Items"');
    await moveEmail('My Box', 'My Box', 'Old Mail', [1]);
    expect(param('source_folder')).toBe('"My Box"');
    expect(param('dest_folder')).toBe('"Old Mail"');
  });
});

describe('listings: id is the UID', () => {
  it('emails() replaces the sequence id with the UID', async () => {
    nextBody = {
      emails: [{ id: '3', uid: '1201', Subject: 'a', FLAGS: [] }],
      total_count: 1,
      total_pages: 1,
    };
    const page = await emails('INBOX', 1, 50);
    expect(page.emails[0].id).toBe('1201');
    expect(page.emails[0].folderPath).toBe('INBOX');
  });

  it('emails() fails loudly when the API gives no UIDs (old API)', async () => {
    nextBody = { emails: [{ id: '3', Subject: 'a' }], total_count: 1, total_pages: 1 };
    await expect(emails('INBOX', 1, 50)).rejects.toThrow(MissingUidError);
  });

  it('searchEmails() normalizes results to the searched folder', async () => {
    nextBody = { data: { data: [{ id: '3', uid: '77', FLAGS: [] }], total_count: 1 } };
    const res = await searchEmails({ folder: 'Archive', limit: 50, page: 1 });
    expect(res.data.data[0]).toMatchObject({ id: '77', folderPath: 'Archive' });
  });
});

const thread = {
  id: '67',
  thread_id: '2',
  email_ids: ['2', '67'],
  sent_email_ids: ['310'],
  sent_folder_path: 'Sent',
  message_count: 3,
  unread_count: 1,
  is_unread: true,
  is_flagged: false,
  has_attachment: false,
  participants: ['Alice <a@x>'],
  latest: { id: '67', uid: '67', FLAGS: [], folder_path: 'INBOX' },
};

describe('conversations', () => {
  it('emailThreads() lists one row per conversation with conversation totals', async () => {
    nextBody = {
      total_count: 60,
      total_pages: 6,
      total_messages: 66,
      uid_validity: 1730700000,
      sent_folder_path: 'Sent',
      threads: [thread],
    };
    const page = await emailThreads('INBOX', 2, 10, { sentFolder: 'Sent', filterBy: 'unread' });

    expect(lastCall().url.pathname).toBe('/email/threads/10/2');
    expect(param('folder_path')).toBe('INBOX');
    expect(param('sent_folder')).toBe('Sent');
    expect(param('filter_by')).toBe('unread');
    expect(page.total_count).toBe(60);
    expect(page.total_pages).toBe(6);
    expect(page.uid_validity).toBe('1730700000');
    expect(page.emails[0]).toMatchObject({ id: '67', thread: { emailIds: [2, 67] } });
  });

  it('emailThread() keeps each email in its own folder', async () => {
    nextBody = {
      ...thread,
      uid_validity: 5,
      emails: [
        { id: '2', uid: '2', folder_path: 'INBOX' },
        { id: '310', uid: '310', folder_path: 'Sent' },
        { id: '67', uid: '67', folder_path: 'INBOX' },
      ],
    };
    const detail = await emailThread('67', 'INBOX', { sentFolder: 'Sent' });
    expect(lastCall().url.pathname).toBe('/email/thread/67');
    expect(detail.emails.map((e) => `${e.folderPath}:${e.id}`)).toEqual([
      'INBOX:2',
      'Sent:310',
      'INBOX:67',
    ]);
    expect(detail.uid_validity).toBe('5');
  });

  it('searchThreads() returns conversation rows in the search response shape', async () => {
    nextBody = { data: { total_count: 1, threads: [{ ...thread, matched_email_ids: ['2'] }] } };
    const res = await searchThreads(
      { folder: 'INBOX', subject: 'project', limit: 50, page: 1 },
      { filterBy: 'all', sentFolder: 'Sent' }
    );
    expect(lastCall().url.pathname).toBe('/email/search/threads');
    expect(JSON.parse(String(lastCall().init.body))).toMatchObject({ subject: 'project' });
    expect(res.data.total_count).toBe(1);
    expect(res.data.data[0].thread?.matchedEmailIds).toEqual([2]);
  });
});
