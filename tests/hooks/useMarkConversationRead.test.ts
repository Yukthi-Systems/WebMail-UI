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
import type { EmailLike } from '../../src/utils/threads';

const markRead = vi.fn();
const patchEmailFlags = vi.fn();
const updateUnread = vi.fn();
vi.mock('../../src/hooks/useEmails', () => ({ useSeenMail: () => ({ mutateAsync: markRead }) }));
vi.mock('../../src/hooks/useEmailCacheUpdater', () => ({
  useEmailCacheUpdater: () => ({ patchEmailFlags }),
}));
vi.mock('../../src/hooks/useFolders', () => ({
  useUpdateAnyFolderUnreadCount: () => updateUnread,
}));

const { useMarkConversationRead } = await import('../../src/hooks/useMarkConversationRead');
const { keepUnread } = await import('../../src/utils/keptUnread');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const email = (id: number, seen: boolean, folderPath = 'INBOX'): EmailLike =>
  ({ id, folderPath, FLAGS: seen ? ['\\Seen'] : [] }) as EmailLike;

type Props = { emails: EmailLike[]; openKey?: string; active?: boolean };
const Probe = ({ emails, openKey = 'INBOX:3', active = true }: Props) => {
  useMarkConversationRead({ emails, folder: 'INBOX', openKey, active });
  return null;
};

describe('opening a conversation reads all of it', () => {
  let root: Root;
  const show = (props: Props) => act(async () => root.render(createElement(Probe, props)));

  beforeEach(() => {
    root = createRoot(document.createElement('div'));
    vi.clearAllMocks();
    markRead.mockResolvedValue({});
  });
  afterEach(() => act(() => root.unmount()));

  it('marks every unread email in one request, then clears the row and the count', async () => {
    await show({ emails: [email(1, false), email(2, true), email(3, false)] });
    expect(markRead).toHaveBeenCalledTimes(1);
    expect(markRead).toHaveBeenCalledWith({ path: 'INBOX', body: [1, 3] });
    expect(patchEmailFlags).toHaveBeenCalledWith([1, 3], '\\Seen', undefined, 'INBOX');
    expect(updateUnread).toHaveBeenCalledWith('INBOX', -2);
  });

  it('sends nothing when nothing is unread', async () => {
    await show({ emails: [email(1, true), email(2, true)] });
    expect(markRead).not.toHaveBeenCalled();
    expect(updateUnread).not.toHaveBeenCalled();
  });

  it('one request per folder (UIDs are per folder)', async () => {
    await show({ emails: [email(1, false), email(7, false, 'Sent')] });
    expect(markRead).toHaveBeenCalledWith({ path: 'INBOX', body: [1] });
    expect(markRead).toHaveBeenCalledWith({ path: 'Sent', body: [7] });
    expect(updateUnread).toHaveBeenCalledWith('Sent', -1);
  });

  it('counts only once the server confirmed', async () => {
    let confirm = () => {};
    markRead.mockReturnValue(new Promise<void>((resolve) => (confirm = resolve)));
    await show({ emails: [email(1, false)] });
    expect(updateUnread).not.toHaveBeenCalled();
    await act(async () => confirm());
    expect(updateUnread).toHaveBeenCalledWith('INBOX', -1);
  });

  it('an email the user marks unread while it is open stays unread', async () => {
    await show({ emails: [email(1, false), email(2, true)] });
    markRead.mockClear();
    keepUnread('INBOX', [2]); // what "Mark as unread" does
    await show({ emails: [email(1, true), email(2, false)] });
    expect(markRead).not.toHaveBeenCalled();
  });

  it('an email arriving while the conversation is open is marked too', async () => {
    await show({ emails: [email(1, true)] });
    await show({ emails: [email(1, true), email(4, false)] });
    expect(markRead).toHaveBeenCalledWith({ path: 'INBOX', body: [4] });
  });

  it('opening it again reads emails kept unread last time', async () => {
    keepUnread('INBOX', [2]);
    await show({ emails: [email(2, false)], openKey: 'INBOX:2' });
    expect(markRead).toHaveBeenCalledWith({ path: 'INBOX', body: [2] });
  });

  it('nothing changes when marking fails', async () => {
    markRead.mockRejectedValue(new Error('offline'));
    await show({ emails: [email(1, false)] });
    expect(patchEmailFlags).not.toHaveBeenCalled();
    expect(updateUnread).not.toHaveBeenCalled();
  });

  it('does nothing while not shown as a conversation', async () => {
    await show({ emails: [email(1, false)], active: false });
    expect(markRead).not.toHaveBeenCalled();
  });
});
