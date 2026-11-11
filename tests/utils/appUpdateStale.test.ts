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

// The running code is build "old", the server has build "new"
vi.mock('../../src/constants/config', () => ({
  API_CONFIG: { serverBuildId: 'new', bundleBuildId: 'old' },
}));

const { reloadIfStaleBuild, waitForServiceWorkerUpdate } = await import(
  '../../src/utils/appUpdate'
);

/** Minimal navigator.serviceWorker: a controlled page with one registration. */
const mockServiceWorker = (registration: {
  update: () => Promise<unknown>;
  installing?: unknown;
  waiting?: unknown;
}) => {
  const container = new EventTarget() as EventTarget & Record<string, unknown>;
  container.controller = {};
  container.getRegistration = vi.fn().mockResolvedValue(registration);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
  return container;
};

afterEach(() => {
  // @ts-expect-error test cleanup of the stubbed property
  delete navigator.serviceWorker;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('waitForServiceWorkerUpdate', () => {
  it('returns at once when no service worker controls the page', async () => {
    await expect(waitForServiceWorkerUpdate(50)).resolves.toBeUndefined();
  });

  it('returns once update() finds nothing new to install', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    mockServiceWorker({ update, installing: null, waiting: null });

    await waitForServiceWorkerUpdate(10_000);

    expect(update).toHaveBeenCalledOnce();
  });

  it('waits for the new worker to take control', async () => {
    const container = mockServiceWorker({
      update: vi.fn().mockResolvedValue(undefined),
      installing: {}, // a new version is being installed
    });
    let done = false;
    const waiting = waitForServiceWorkerUpdate(10_000).then(() => (done = true));

    await new Promise((r) => setTimeout(r, 20));
    expect(done).toBe(false);

    container.dispatchEvent(new Event('controllerchange'));
    await waiting;
    expect(done).toBe(true);
  });

  it('gives up after the timeout', async () => {
    mockServiceWorker({ update: vi.fn().mockResolvedValue(undefined), installing: {} });
    const started = Date.now();

    await waitForServiceWorkerUpdate(100);

    expect(Date.now() - started).toBeGreaterThanOrEqual(90);
  });
});

describe('reloadIfStaleBuild', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {}); // jsdom: reload not implemented
  });

  it('updates first, clears caches second, then gives up (never loops)', async () => {
    const lastWarning = () => {
      const calls = vi.mocked(console.warn).mock.calls;
      return String(calls[calls.length - 1]?.[0]);
    };

    await expect(reloadIfStaleBuild()).resolves.toBe(true);
    expect(lastWarning()).toContain('Updating');

    await expect(reloadIfStaleBuild()).resolves.toBe(true);
    expect(lastWarning()).toContain('Clearing caches');

    await expect(reloadIfStaleBuild()).resolves.toBe(false);
    expect(lastWarning()).toContain('Continuing');
  });
});
