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
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDefaultStore } from 'jotai';
import { folderDetailsAtom, type FolderDetail } from '../../src/state/folders';

const folderUidValidity = vi.fn();
vi.mock('../../src/api/mailbox', async (original) => ({
  ...(await original<typeof import('../../src/api/mailbox')>()),
  folderUidValidity: (...args: unknown[]) => folderUidValidity(...args),
}));

const { useFolderUidValidity, useUpdateAnyFolderUnreadCount } = await import(
  '../../src/hooks/useFolders'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const store = getDefaultStore();
const inbox = (unread: number): FolderDetail[] => [
  { name: 'Inbox', folder_name: 'INBOX', unread_count: unread },
  { name: 'Sent', folder_name: 'Sent', unread_count: 4 },
];
const unread = (name: string) =>
  store.get(folderDetailsAtom).find((f) => f.folder_name === name)?.unread_count;
const status = (UNSEEN?: number) => ({
  data: { MESSAGES: 10, UIDNEXT: 11, UIDVALIDITY: 1, ...(UNSEEN === undefined ? {} : { UNSEEN }) },
});

let check: () => Promise<unknown> = async () => {};
let changeCount: (folder: string, delta: number) => void = () => {};
const Probe = () => {
  check = useFolderUidValidity('INBOX').refetch;
  changeCount = useUpdateAnyFolderUnreadCount();
  return null;
};

describe('folder unread count from the server', () => {
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(async () => {
    store.set(folderDetailsAtom, inbox(5));
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    folderUidValidity.mockReset();
    folderUidValidity.mockResolvedValue(status(5));
    root = createRoot(document.createElement('div'));
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <Probe />
        </QueryClientProvider>
      )
    );
  });
  afterEach(() => act(() => root.unmount()));

  it('new mail: the next check raises the badge', async () => {
    folderUidValidity.mockResolvedValue(status(7));
    await act(async () => void (await check()));
    expect(unread('INBOX')).toBe(7);
    expect(unread('Sent')).toBe(4);
  });

  it('read on another device: the next check lowers it', async () => {
    folderUidValidity.mockResolvedValue(status(2));
    await act(async () => void (await check()));
    expect(unread('INBOX')).toBe(2);
  });

  it('an answer asked for before the app changed the count is not applied', async () => {
    let answer: (value: unknown) => void = () => {};
    folderUidValidity.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    let pending: Promise<unknown> = Promise.resolve();
    await act(async () => {
      pending = check();
    });
    // Meanwhile the user opens a conversation with 2 unread: 5 -> 3
    act(() => changeCount('INBOX', -2));
    await act(async () => {
      answer(status(5)); // counted before that
      await pending;
    });
    expect(unread('INBOX')).toBe(3);

    // The next check, asked after it, is applied
    folderUidValidity.mockResolvedValue(status(3));
    await act(async () => void (await check()));
    expect(unread('INBOX')).toBe(3);
  });

  it('an older API without UNSEEN changes nothing', async () => {
    folderUidValidity.mockResolvedValue(status());
    await act(async () => void (await check()));
    expect(unread('INBOX')).toBe(5);
  });
});
