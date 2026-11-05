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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/api/config.ts', () => ({ API_URL: 'https://api.test', authCheck: () => {} }));

import { useEmailThreads } from '../../src/hooks/useEmails';
import type { EmailFilterBy, EmailSortOrder } from '../../src/state/emailListView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let urls: URL[];
let root: Root;
let queryClient: QueryClient;

const Probe = ({ filterBy, sortOrder }: { filterBy: EmailFilterBy; sortOrder: EmailSortOrder }) => {
  useEmailThreads('INBOX', 1, 50, { filterBy, sortOrder });
  return null;
};

const show = async (filterBy: EmailFilterBy, sortOrder: EmailSortOrder = 'desc') => {
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Probe, { filterBy, sortOrder })
      )
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  urls = [];
  queryClient = new QueryClient();
  root = createRoot(document.createElement('div'));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(new URL(url));
      return new Response(JSON.stringify({ threads: [], total_count: 0, total_pages: 0 }), {
        status: 200,
      });
    })
  );
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

describe('conversation list filters', () => {
  it('asks the API when the filter changes', async () => {
    await show('all');
    await show('unread');

    expect(urls.map((url) => url.searchParams.get('filter_by'))).toEqual(['all', 'unread']);
    expect(urls[1].pathname).toBe('/email/threads/50/1');
  });

  it('asks the API when the sort order changes', async () => {
    await show('all', 'desc');
    await show('all', 'asc');

    expect(urls.map((url) => url.searchParams.get('sort_order'))).toEqual(['desc', 'asc']);
  });

  it('serves a filter opened again within 5 minutes from the cache, without a call', async () => {
    await show('all');
    await show('unread');
    await show('all');
    await show('unread');

    expect(urls).toHaveLength(2);
  });
});
