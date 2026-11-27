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

import { HttpError } from './fetchWrapper';

const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);

const BUSY = new Set([429, 503]);

const statusOf = (error: unknown) => (error instanceof HttpError ? error.status : undefined);

export const shouldRetry =
  (maxRetries: number) =>
    (failureCount: number, error: Error): boolean => {
      if (/session/i.test(error?.message ?? '')) return false;
      const status = statusOf(error);
      if (status !== undefined && !TRANSIENT.has(status)) return false;
      const limit = status !== undefined && BUSY.has(status) ? Math.min(1, maxRetries) : maxRetries;
      return failureCount < limit;
    };


export const retryDelay = (failureCount: number, error: Error): number => {
  const base = BUSY.has(statusOf(error) ?? 0) ? 3000 : 1000;
  const delay = Math.min(base * 2 ** failureCount, 10_000);
  return delay / 2 + Math.random() * (delay / 2);
};

export const QUERY_RETRY = { retry: shouldRetry(2), retryDelay } as const;

export const SAFE_CHANGE_RETRY = { retry: shouldRetry(1), retryDelay } as const;


export const NO_RETRY = { retry: false } as const;
