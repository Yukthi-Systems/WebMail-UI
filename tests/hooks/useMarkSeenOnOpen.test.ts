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
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const markRead = vi.fn();
const patchEmailFlags = vi.fn();
const updateUnread = vi.fn();
vi.mock('../../src/hooks/useEmails', () => ({ useSeenMail: () => ({ mutateAsync: markRead }) }));
vi.mock('../../src/hooks/useEmailCacheUpdater', () => ({
  useEmailCacheUpdater: () => ({ patchEmailFlags }),
}));
vi.mock('../../src/hooks/useFolders', () => ({ useUpdateFolderUnreadCount: () => updateUnread }));

const { useMarkSeenOnOpen } = await import('../../src/hooks/useMarkSeenOnOpen');
const { keepUnread } = await import('../../src/utils/keptUnread');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type State = { isLoaded: boolean; isLoading: boolean; seenOnServer: boolean; isUnread?: boolean };

const Probe = (state: State) => {
  useMarkSeenOnOpen({ uid: '42', folder: 'INBOX', isUnread: true, active: true, ...state });
  return null;
};

describe('useMarkSeenOnOpen', () => {
  let root: Root;
  const show = (state: State) => act(async () => root.render(createElement(Probe, state)));

  beforeEach(() => {
    root = createRoot(document.createElement('div'));
    vi.clearAllMocks();
    markRead.mockResolvedValue({});
  });
  afterEach(() => act(() => root.unmount()));

  it('opened and fetched with mark_as_read: server already marked it, only the cache', async () => {
    await show({ isLoaded: false, isLoading: true, seenOnServer: false });
    await show({ isLoaded: true, isLoading: false, seenOnServer: true });
    expect(markRead).not.toHaveBeenCalled();
    expect(patchEmailFlags).toHaveBeenCalledWith([42], '\\Seen');
    expect(updateUnread).toHaveBeenCalledWith(-1);
  });

  it('opened while the hover prefetch was loading: marks it on the server', async () => {
    // Joined the prefetch (mark_as_read=false): it comes back without \Seen
    await show({ isLoaded: false, isLoading: true, seenOnServer: false });
    await show({ isLoaded: true, isLoading: false, seenOnServer: false });
    expect(markRead).toHaveBeenCalledWith({ path: 'INBOX', body: [42] });
  });

  it('shown from an older cached view: marks it on the server even if that said \\Seen', async () => {
    await show({ isLoaded: true, isLoading: false, seenOnServer: true });
    expect(markRead).toHaveBeenCalledOnce();
  });

  it('counts it only once the server confirmed', async () => {
    let confirm = () => {};
    markRead.mockReturnValue(new Promise<void>((resolve) => (confirm = resolve)));
    await show({ isLoaded: true, isLoading: false, seenOnServer: false });
    expect(updateUnread).not.toHaveBeenCalled();
    await act(async () => confirm());
    expect(updateUnread).toHaveBeenCalledWith(-1);
  });

  it('still updates the list when the view closed before the server answered', async () => {
    let confirm = () => {};
    markRead.mockReturnValue(new Promise<void>((resolve) => (confirm = resolve)));
    await show({ isLoaded: true, isLoading: false, seenOnServer: false });
    act(() => root.unmount());
    root = createRoot(document.createElement('div'));
    await act(async () => confirm());
    expect(patchEmailFlags).toHaveBeenCalledWith([42], '\\Seen');
    expect(updateUnread).toHaveBeenCalledWith(-1);
  });

  it('changes nothing when marking read fails', async () => {
    markRead.mockRejectedValue(new Error('offline'));
    await show({ isLoaded: true, isLoading: false, seenOnServer: false });
    expect(patchEmailFlags).not.toHaveBeenCalled();
    expect(updateUnread).not.toHaveBeenCalled();
  });

  it('keeps an email unread when the user marks it unread while it is open', async () => {
    await show({ isLoaded: true, isLoading: false, seenOnServer: true, isUnread: false });
    keepUnread('INBOX', [42]); // what the mark-unread request does
    await show({ isLoaded: true, isLoading: false, seenOnServer: true, isUnread: true });
    expect(markRead).not.toHaveBeenCalled();
    expect(updateUnread).not.toHaveBeenCalled();
  });

  it('does not mark it again after the user marks it unread', async () => {
    await show({ isLoaded: false, isLoading: true, seenOnServer: false });
    await show({ isLoaded: true, isLoading: false, seenOnServer: true });
    keepUnread('INBOX', [42]);
    await show({ isLoaded: true, isLoading: false, seenOnServer: true, isUnread: true });
    expect(markRead).not.toHaveBeenCalled();
    expect(updateUnread).toHaveBeenCalledOnce();
  });

  it('marks it read when fresher data shows it unread after it was shown as read', async () => {
    // Cached conversation said read; the reload says unread (marked unread earlier elsewhere)
    await show({ isLoaded: true, isLoading: false, seenOnServer: true, isUnread: false });
    await show({ isLoaded: true, isLoading: false, seenOnServer: true, isUnread: true });
    expect(markRead).toHaveBeenCalledOnce();
  });

  it('opening it again reads it, even if it was kept unread', async () => {
    keepUnread('INBOX', [42]);
    act(() => root.unmount());
    root = createRoot(document.createElement('div'));
    await show({ isLoaded: true, isLoading: false, seenOnServer: true });
    expect(markRead).toHaveBeenCalledOnce();
  });

  it('does nothing for an email already read', async () => {
    await show({ isLoaded: true, isLoading: false, seenOnServer: true, isUnread: false });
    expect(markRead).not.toHaveBeenCalled();
    expect(updateUnread).not.toHaveBeenCalled();
  });
});
