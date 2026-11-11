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
import { handleNavigation } from '../../src/sw/navigation';

const request = new Request('https://mail.example.com/folder/INBOX');
const page = (body: string, status = 200) => new Response(body, { status });
const delay = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const run = (
  fetch: () => Promise<Response>,
  getCachedPage: () => Promise<Response | undefined>,
  timeoutMs = 50
) => handleNavigation(request, { fetch, getCachedPage, timeoutMs });

describe('handleNavigation', () => {
  it('serves the fresh page from the server', async () => {
    const res = await run(
      () => Promise.resolve(page('server')),
      () => Promise.resolve(page('cached'))
    );
    expect(await res.text()).toBe('server');
  });

  it('passes through 4xx answers and redirects from the server', async () => {
    const notFound = await run(
      () => Promise.resolve(page('missing', 404)),
      () => Promise.resolve(page('cached'))
    );
    expect(notFound.status).toBe(404);

    const redirect = { type: 'opaqueredirect', status: 0 } as Response;
    const res = await run(
      () => Promise.resolve(redirect),
      () => Promise.resolve(page('cached'))
    );
    expect(res).toBe(redirect);
  });

  it('uses the cached page when the server is down or mid-deploy (5xx)', async () => {
    const down = await run(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(page('cached'))
    );
    expect(await down.text()).toBe('cached');

    const deploying = await run(
      () => Promise.resolve(page('bad gateway', 502)),
      () => Promise.resolve(page('cached'))
    );
    expect(await deploying.text()).toBe('cached');
  });

  it('uses the cached page when the server is slow', async () => {
    const started = Date.now();
    const res = await run(
      () => delay(500, page('server')),
      () => Promise.resolve(page('cached')),
      50
    );
    expect(await res.text()).toBe('cached');
    expect(Date.now() - started).toBeLessThan(400);
  });

  it('keeps waiting for a slow server when nothing is cached', async () => {
    const res = await run(
      () => delay(120, page('server')),
      () => Promise.resolve(undefined),
      30
    );
    expect(await res.text()).toBe('server');
  });

  it("returns the server's error when it is down and nothing is cached", async () => {
    const res = await run(
      () => Promise.resolve(page('bad gateway', 502)),
      () => Promise.resolve(undefined)
    );
    expect(res.status).toBe(502);
  });

  it('shows the offline page instead of failing when nothing works', async () => {
    const res = await run(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.reject(new Error('cache broken'))
    );
    expect(res.status).toBe(503);
    expect(await res.text()).toContain("Can't reach WebMail");
  });
});
