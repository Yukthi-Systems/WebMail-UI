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
import { createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';

vi.mock('../../../../src/api/config.ts', () => ({ API_URL: 'https://api.test', authCheck: () => {} }));
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ folder: 'INBOX' }),
  useNavigate: () => () => {},
  Link: () => null,
}));

// Counts how often the list renders: the toolbar renders once per EmailList render
const { renders, stub, cards } = vi.hoisted(() => {
  const renders = { count: 0 };
  const cards: { email: { id: string } }[] = [];
  return { renders, cards, stub: () => ({ default: () => null }) };
});
vi.mock('../../../../src/hooks/useToast', () => {
  const toast = { success: () => {}, error: () => {}, loading: () => '', dismiss: () => {} };
  return { useToast: () => toast };
});
vi.mock('../../../../src/components/mailbox/EmailList/EmailToolbar', () => ({
  default: () => {
    renders.count++;
    return null;
  },
}));
vi.mock('../../../../src/components/mailbox/EmailList/EmailCard', () => ({
  default: (props: { email: { id: string } }) => {
    cards.push(props);
    return null;
  },
}));
vi.mock('../../../../src/components/mailbox/EmailList/EmailViewer', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/EmailComposer', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/EmailEmptyState', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/EmailSkeleton', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/MoveEmail', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/PermanentDeleteConfirm', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/EmptyFolderBanner', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/BulkActionDialog', () => stub());
vi.mock('../../../../src/components/mailbox/EmailList/BulkSelectBanner', () => stub());
vi.mock('../../../../src/components/common/ResizeblePanel', () => stub());
vi.mock('../../../../src/components/composer/CustomModal', () => stub());
vi.mock('../../../../src/components/common/header/SearchResultBanner', () => stub());
vi.mock('../../../../src/components/contacts/BulkCreateView', () => ({ BulkCreateView: () => null }));

import EmailList from '../../../../src/components/mailbox/EmailList/index';
import { webmailStore } from '../../../../src/store';
import { emailSortAtom, DEFAULT_EMAIL_SORT } from '../../../../src/state/emailListView';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let root: Root;

beforeEach(() => {
  webmailStore.set(emailSortAtom, DEFAULT_EMAIL_SORT);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  );
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      // The plain list keeps loading: this is the moment that looped
      if (url.includes('/email/fetch/')) return new Promise(() => {});
      return Promise.resolve(
        new Response(JSON.stringify({ threads: [], total_count: 0, total_pages: 0, data: {} }), {
          status: 200,
        })
      );
    })
  );
  root = createRoot(document.createElement('div'));
});

afterEach(() => {
  root.unmount();
  vi.unstubAllGlobals();
});

const row = (uid: string) => ({
  id: uid,
  thread_id: uid,
  email_ids: [uid],
  message_count: 1,
  unread_count: 0,
  is_unread: false,
  is_flagged: false,
  has_attachment: false,
  latest: { id: uid, uid, From: 'a@x.com', To: 'b@x.com', Subject: 's', FLAGS: ['\\Seen'] },
});

describe('EmailList', () => {
  it('selecting a row changes the props of that row only, so memo skips the others', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ threads: [row('1'), row('2')], total_count: 2, total_pages: 1, data: {} }),
          { status: 200 }
        )
      )
    );
    root.render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(JotaiProvider, { store: webmailStore } as { store: typeof webmailStore; children?: ReactNode }, createElement(EmailList))
      )
    );
    await wait(200);

    const latest = (id: string) =>
      [...cards].reverse().find((card) => card.email.id === id) as unknown as Record<string, unknown> & {
        onSelectionChange: (id: string, selected: boolean, index: number) => void;
      };
    const before = { one: latest('1'), two: latest('2') };
    expect(before.two).toBeTruthy();

    before.one.onSelectionChange('1', true, 0);
    await wait(50);

    const after = { one: latest('1'), two: latest('2') };
    const changed = (a: Record<string, unknown>, b: Record<string, unknown>) =>
      Object.keys({ ...a, ...b }).filter((key) => a[key] !== b[key]);

    expect(after.one.isSelected).toBe(true);
    expect(changed(before.two, after.two)).not.toContain('isSelected');
    // Entering selection mode changes these for every row; nothing else may change
    expect(changed(before.two, after.two).filter((key) => key !== 'isSelectionMode')).toEqual([]);
  });


  it('does not re-render in a loop while a list without data is loading', async () => {
    const queryClient = new QueryClient();
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(JotaiProvider, { store: webmailStore } as { store: typeof webmailStore; children?: ReactNode }, createElement(EmailList))
      )
    );
    await wait(200);

    // Sort by size: switches to /email/fetch, which has no data yet
    webmailStore.set(emailSortAtom, { sortBy: 'size', sortOrder: 'desc' });
    await wait(50);
    renders.count = 0;
    await wait(300);

    expect(renders.count).toBeLessThan(5);
  });
});
