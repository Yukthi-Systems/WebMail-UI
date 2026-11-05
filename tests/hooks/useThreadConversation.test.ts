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

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { threadDetailCacheKey } from '../../src/utils/emailCache';
import type { ThreadDetail } from '../../src/api/mailbox';
import type { EmailLike } from '../../src/utils/threads';
import { addPendingReply } from '../../src/hooks/useThreadConversation';

vi.mock('../../src/api/mailbox', () => ({ emailThread: vi.fn() }));

const email = (id: string, folderPath = 'INBOX') => ({ id, folderPath }) as unknown as EmailLike;
const pending = {
  ...email('pending-1', 'Sent'),
  pending: { html: '<p>hi</p>', text: 'hi' },
} as EmailLike;

describe('addPendingReply', () => {
  let queryClient: QueryClient;
  const open = threadDetailCacheKey('INBOX', '10');
  const other = threadDetailCacheKey('INBOX', '20');

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData(open, { emails: [email('9'), email('10')] } as ThreadDetail);
    queryClient.setQueryData(other, { emails: [email('20')] } as ThreadDetail);
  });

  it('adds the reply only to the conversation holding the email it answers', () => {
    addPendingReply(queryClient, email('10'), pending);
    expect(queryClient.getQueryData<ThreadDetail>(open)?.emails).toEqual([
      email('9'),
      email('10'),
      pending,
    ]);
    expect(queryClient.getQueryData<ThreadDetail>(other)?.emails).toEqual([email('20')]);
  });

  it('does not ask the server for anything: the conversation is not invalidated', () => {
    addPendingReply(queryClient, email('10'), pending);
    expect(queryClient.getQueryState(open)?.isInvalidated).toBe(false);
  });

  it('leaves the reload to the user: a manual reload replaces the preview', async () => {
    addPendingReply(queryClient, email('10'), pending);
    const real = { emails: [email('9'), email('10'), email('49', 'Sent')] } as ThreadDetail;
    await queryClient.fetchQuery({ queryKey: open, queryFn: () => real });
    expect(queryClient.getQueryData<ThreadDetail>(open)).toEqual(real);
  });
});
