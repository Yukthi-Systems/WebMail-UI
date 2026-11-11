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

// Keeps users on the latest deployed UI: stale build check, update checks, chunk reloads, reset.

import { API_CONFIG } from '../constants/config';
import { getCompanySlugFromPath } from './routeUtils';

const AUTO_RELOAD_KEY = 'app-last-auto-reload';
const HARD_RESET_KEY = 'app-last-hard-reset';
const AUTO_RELOAD_GUARD_MS = 30_000; // Min gap between automatic reloads (prevents loops)
const UPDATE_CHECK_INTERVAL_MS = 30 * 60_000;
const UPDATE_CHECK_MIN_GAP_MS = 5 * 60_000; // Throttle for focus / online checks
const STALE_UPDATE_TIMEOUT_MS = 8_000;
const CLEANUP_TIMEOUT_MS = 3_000;

// ─── Checks ──────────────────────────────────────────────────────────────────

/** True when the running code is not the build deployed on the server. */
export const isStaleBuild = (
  serverBuildId: string = API_CONFIG.serverBuildId,
  bundleBuildId: string = API_CONFIG.bundleBuildId
): boolean => Boolean(serverBuildId && bundleBuildId && serverBuildId !== bundleBuildId);

/** True for errors thrown when a lazy-loaded JS/CSS file could not be loaded. */
export const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|is not a valid JavaScript MIME type|Expected a JavaScript.*module script/i.test(
    message
  );
};

/** /login or a company login page /<slug>. */
export const isLoginPath = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0]?.toLowerCase() === 'login') return true;
  return segments.length === 1 && getCompanySlugFromPath(pathname) !== null;
};

/** False if an automatic reload ran within the guard window. */
export const claimAutoReload = (
  now: number = Date.now(),
  key: string = AUTO_RELOAD_KEY
): boolean => {
  try {
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last < AUTO_RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(key, String(now));
    return true;
  } catch {
    return false;
  }
};

// ─── Cleanup ─────────────────────────────────────────────────────────────────

const withTimeout = (work: Promise<unknown>) =>
  Promise.race([
    work.catch((e) => console.error('[appUpdate] cleanup step failed', e)),
    new Promise((resolve) => setTimeout(resolve, CLEANUP_TIMEOUT_MS)),
  ]);

/** Unregisters every service worker and deletes all Cache Storage. */
export const clearAppCaches = async (): Promise<void> => {
  const steps: Promise<unknown>[] = [];
  if ('serviceWorker' in navigator) {
    steps.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
    );
  }
  if ('caches' in window) {
    steps.push(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))));
  }
  await withTimeout(Promise.all(steps));
};

const deleteIndexedDb = (name: string) =>
  new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });

/** Clears localStorage, sessionStorage and IndexedDB (logs the user out). */
export const clearAppStorage = async (): Promise<void> => {
  try {
    localStorage.clear();
  } catch {
    /* storage blocked */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* storage blocked */
  }
  if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
    await withTimeout(
      indexedDB
        .databases()
        .then((dbs) => Promise.all(dbs.map((db) => (db.name ? deleteIndexedDb(db.name) : null))))
    );
  }
};

const loginPathFor = (pathname: string) => {
  if (isLoginPath(pathname)) return pathname;
  const slug = getCompanySlugFromPath(pathname);
  return slug ? `/${slug}` : '/login';
};

/** Clears app files and reloads; without keepSession also logs out. */
export const resetApp = async ({ keepSession }: { keepSession: boolean }): Promise<void> => {
  await clearAppCaches();
  if (keepSession) {
    window.location.reload();
    return;
  }
  await clearAppStorage();
  window.location.replace(`${loginPathFor(window.location.pathname)}?r=${Date.now()}`);
};

/** "Reset app" button handler. */
export const confirmAndResetApp = (): void => {
  const confirmed = window.confirm(
    'Reset WebMail on this device?\n\n' +
      'This clears cached files and saved data in this browser and signs you out. ' +
      'Your emails, contacts and settings on the server are not affected.'
  );
  if (confirmed) void resetApp({ keepSession: false });
};

/** Waits for the updated service worker to take over (or timeout). */
export const waitForServiceWorkerUpdate = async (
  timeoutMs: number = STALE_UPDATE_TIMEOUT_MS
): Promise<void> => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    navigator.serviceWorker.addEventListener('controllerchange', finish);

    registration
      .update()
      .then(() => {
        if (!registration.installing && !registration.waiting) finish();
      })
      .catch(finish);
  });
};

/** Before first render: update, then clear caches, then give up. */
export const reloadIfStaleBuild = async (): Promise<boolean> => {
  if (!isStaleBuild()) return false;
  const builds = `running ${API_CONFIG.bundleBuildId}, server has ${API_CONFIG.serverBuildId}`;

  if (claimAutoReload()) {
    console.warn(`[appUpdate] old build (${builds}). Updating.`);
    await waitForServiceWorkerUpdate();
    window.location.reload();
    return true;
  }
  if (claimAutoReload(Date.now(), HARD_RESET_KEY)) {
    console.warn(`[appUpdate] still an old build after updating (${builds}). Clearing caches.`);
    await resetApp({ keepSession: true });
    return true;
  }
  console.warn(`[appUpdate] still an old build after clearing caches (${builds}). Continuing.`);
  return false;
};

// ─── Update banner state ─────────────────────────────────────────────────────

let updateAvailable = false;
const listeners = new Set<() => void>();

export const isUpdateAvailable = (): boolean => updateAvailable;

export const subscribeToUpdate = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const announceUpdate = () => {
  if (updateAvailable) return;
  updateAvailable = true;
  listeners.forEach((listener) => listener());
};

// ─── Registration ────────────────────────────────────────────────────────────

/** Build id currently deployed on the server, or null. */
export const fetchServerBuildId = async (): Promise<string | null> => {
  try {
    const response = await fetch('/env-config.js', { cache: 'no-store' });
    if (!response.ok) return null;
    const match = (await response.text()).match(/VITE_BUILD_ID:\s*"([^"]*)"/);
    return match?.[1] || null;
  } catch {
    return null;
  }
};

/** True if a service worker takeover left this page on an old build. */
export const isTakeoverAnUpdate = async (wasControlled: boolean): Promise<boolean> => {
  const serverBuildId = await fetchServerBuildId();
  if (serverBuildId && API_CONFIG.bundleBuildId) {
    return serverBuildId !== API_CONFIG.bundleBuildId;
  }
  return wasControlled;
};

/** Reload when a lazy-loaded chunk is gone after a deploy. */
const handleChunkLoadErrors = () => {
  window.addEventListener('vite:preloadError', (event) => {
    if (claimAutoReload()) {
      event.preventDefault();
      window.location.reload();
    }
  });
};

/** Registers the service worker and keeps checking for new versions. */
const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  let controlled = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', async () => {
    const wasControlled = controlled;
    controlled = true;
    if (reloading || !(await isTakeoverAnUpdate(wasControlled))) return;
    if (isLoginPath(window.location.pathname)) {
      reloading = true;
      window.location.reload();
    } else {
      announceUpdate();
    }
  });

  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      let lastCheck = Date.now();
      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        if (Date.now() - lastCheck < UPDATE_CHECK_MIN_GAP_MS) return;
        lastCheck = Date.now();
        registration.update().catch(() => {});
      };
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', checkForUpdate);
      // Focus covers switching between two visible windows
      window.addEventListener('focus', checkForUpdate);
      window.addEventListener('online', checkForUpdate);
    })
    .catch((error) => console.error('[appUpdate] service worker registration failed', error));
};

/** Call once at startup. */
export const initAppUpdates = (): void => {
  handleChunkLoadErrors();
  if (import.meta.env.PROD) registerServiceWorker();
};
