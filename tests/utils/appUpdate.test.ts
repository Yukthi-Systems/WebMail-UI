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
import {
  claimAutoReload,
  clearAppCaches,
  clearAppStorage,
  confirmAndResetApp,
  isChunkLoadError,
  isLoginPath,
  isStaleBuild,
} from '../../src/utils/appUpdate';

describe('isStaleBuild', () => {
  it('is stale when the server has a different build', () => {
    expect(isStaleBuild('server-2', 'bundle-1')).toBe(true);
  });

  it('is not stale when the builds match', () => {
    expect(isStaleBuild('build-1', 'build-1')).toBe(false);
  });

  it('is not stale when either id is unknown (dev, or an image without build-id)', () => {
    expect(isStaleBuild('', 'bundle-1')).toBe(false);
    expect(isStaleBuild('server-1', '')).toBe(false);
  });
});

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x.com/assets/Login-B6CpUsUk.js',
    'Importing a module script failed.',
    'error loading dynamically imported module',
    'Unable to preload CSS for /assets/index-abc.css',
    "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of 'text/html'.",
  ])('detects %s', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('ignores other errors', () => {
    expect(isChunkLoadError(new Error('Missing required parameters: sitekey'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('isLoginPath', () => {
  it.each([
    ['/login', true],
    ['/login/', true],
    ['/acme', true], // company login page
    ['/', false],
    ['/folder/inbox', false],
    ['/settings', false],
    ['/acme/folder/inbox', false],
  ])('%s → %s', (path, expected) => {
    expect(isLoginPath(path)).toBe(expected);
  });
});

describe('claimAutoReload', () => {
  beforeEach(() => sessionStorage.clear());

  it('allows the first reload and blocks another within 30 seconds', () => {
    expect(claimAutoReload(1_000_000)).toBe(true);
    expect(claimAutoReload(1_000_000 + 29_000)).toBe(false);
  });

  it('allows a reload again after 30 seconds', () => {
    expect(claimAutoReload(1_000_000)).toBe(true);
    expect(claimAutoReload(1_000_000 + 31_000)).toBe(true);
  });
});

describe('clearAppCaches', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // @ts-expect-error test cleanup of the stubbed property
    delete navigator.serviceWorker;
  });

  it('unregisters service workers and deletes all caches', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: vi.fn().mockResolvedValue([{ unregister }, { unregister }]) },
    });
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['workbox-precache-v2', 'other']),
      delete: deleteCache,
    });

    await clearAppCaches();

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-v2');
    expect(deleteCache).toHaveBeenCalledWith('other');
  });
});

describe('clearAppStorage', () => {
  it('clears localStorage and sessionStorage', async () => {
    localStorage.setItem('userDetails', '{}');
    sessionStorage.setItem('x', '1');

    await clearAppStorage();

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('confirmAndResetApp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does nothing when the user cancels', () => {
    localStorage.setItem('userDetails', '{}');
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    confirmAndResetApp();

    expect(localStorage.getItem('userDetails')).toBe('{}');
  });
});
