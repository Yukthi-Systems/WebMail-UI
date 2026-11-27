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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../src/api/fetchWrapper';
import { QUERY_RETRY, SAFE_CHANGE_RETRY, retryDelay, shouldRetry } from '../../src/api/retryPolicy';

const http = (status: number) => new HttpError('failed', status);
/** How many retries a policy allows for this error. */
const retriesFor = (retry: (count: number, error: Error) => boolean, error: Error) => {
  let count = 0;
  while (retry(count, error) && count < 50) count++;
  return count;
};

describe('retry policy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loading data: at most 2 retries for a server error or a network error', () => {
    expect(retriesFor(QUERY_RETRY.retry, http(500))).toBe(2);
    expect(retriesFor(QUERY_RETRY.retry, http(502))).toBe(2);
    expect(retriesFor(QUERY_RETRY.retry, new TypeError('Failed to fetch'))).toBe(2);
  });

  it('server busy (429 / 503): only 1 retry', () => {
    expect(retriesFor(QUERY_RETRY.retry, http(429))).toBe(1);
    expect(retriesFor(QUERY_RETRY.retry, http(503))).toBe(1);
  });

  it('errors that will not change are never retried', () => {
    for (const status of [400, 401, 403, 404, 406, 409, 422, 424]) {
      expect(retriesFor(QUERY_RETRY.retry, http(status))).toBe(0);
    }
    expect(retriesFor(QUERY_RETRY.retry, new Error('Oops! Session expired'))).toBe(0);
  });

  it('safe changes (mark read, flag): at most 1 retry', () => {
    expect(retriesFor(SAFE_CHANGE_RETRY.retry, http(500))).toBe(1);
    expect(retriesFor(SAFE_CHANGE_RETRY.retry, http(404))).toBe(0);
  });

  it('waits longer each time, never more than 10 s', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1); // the longest wait
    expect([0, 1, 2, 3, 4].map((n) => retryDelay(n, http(500)))).toEqual([
      1000, 2000, 4000, 8000, 10000,
    ]);
  });

  it('waits longer when the server says it is busy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    expect(retryDelay(0, http(503))).toBe(3000);
  });

  it('spreads retries out (random between half and the full wait)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(retryDelay(0, http(500))).toBe(500);
  });

  it('a policy with 0 retries never retries', () => {
    expect(retriesFor(shouldRetry(0), http(500))).toBe(0);
  });
});
