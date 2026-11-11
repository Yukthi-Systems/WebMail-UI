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

/**
 * Keeps users on the latest deployed UI.
 *
 * 1. Stale build check: env-config.js is never cached and carries the id of the
 *    deployed build. If it differs from the id compiled into the running code,
 *    the browser served an old cached app: let the service worker update, then
 *    reload (once).
 * 2. Service worker updates are checked while the app stays open (timer, tab or
 *    window focus, back online). When a new version takes over: reload on the
 *    login page, otherwise show the "new version" banner so an email being
 *    written is not lost.
 * 3. A lazy-loaded chunk that no longer exists on the server (old tab after a
 *    deploy) triggers a reload instead of a broken page.
 * 4. The "Reset app" button (resetApp). Removes service workers, caches and
 *    storage.
 */

import { API_CONFIG } from '../constants/config';
import { getCompanySlugFromPath } from './routeUtils';

const AUTO_RELOAD_KEY = 'app-last-auto-reload';
// Separate guard for the cache wipe that runs when a normal update reload did not help
const HARD_RESET_KEY = 'app-last-hard-reset';
// Automatic reloads closer together than this are skipped, so a problem the reload does
// not fix can never turn into a reload loop
const AUTO_RELOAD_GUARD_MS = 30_000;
const UPDATE_CHECK_INTERVAL_MS = 30 * 60_000;
// Tab focus / back online checks are skipped if the last check was this recent
const UPDATE_CHECK_MIN_GAP_MS = 5 * 60_000;
// Longest time an old cached build waits for the service worker update before reloading
const STALE_UPDATE_TIMEOUT_MS = 8_000;
// Never let cleanup block the reload (e.g. a service worker that does not unregister)
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

/**
 * Login pages (/login and the company login /<slug>) have no unsaved work to
 * lose.
 */
export const isLoginPath = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0]?.toLowerCase() === 'login') return true;
  return segments.length === 1 && getCompanySlugFromPath(pathname) !== null;
};

/**
 * Records an automatic reload and returns true, or returns false when one
 * already happened within the guard window (or sessionStorage is unavailable).
 */
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

/**
 * Clears localStorage, sessionStorage and IndexedDB. Logs the user out of the
 * UI.
 */
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
  // indexedDB.databases() is missing in older browsers; there is nothing to clear then
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

/**
 * Reset app. keepSession: true → remove cached app files only and reload (stays
 * logged in). keepSession: false → also clear all stored data and go to the
 * login page (logs out).
 */
export const resetApp = async ({ keepSession }: { keepSession: boolean }): Promise<void> => {
  await clearAppCaches();
  if (keepSession) {
    window.location.reload();
    return;
  }
  await clearAppStorage();
  // Query parameter makes the browser fetch the page again instead of using any copy
  window.location.replace(`${loginPathFor(window.location.pathname)}?r=${Date.now()}`);
};

/** "Reset app" button handler: asks first, then clears everything and logs out. */
export const confirmAndResetApp = (): void => {
  const confirmed = window.confirm(
    'Reset WebMail on this device?\n\n' +
      'This clears cached files and saved data in this browser and signs you out. ' +
      'Your emails, contacts and settings on the server are not affected.'
  );
  if (confirmed) void resetApp({ keepSession: false });
};

/**
 * Lets the service worker install the new version (it downloads only the files
 * that changed) and resolves once it controls the page, when there is nothing
 * to wait for, or after the timeout.
 */
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
        // No new worker installing: the update already took over (the browser checks on
        // every page load) or there is none. Either way, a reload loads what it has.
        if (!registration.installing && !registration.waiting) finish();
      })
      .catch(finish);
  });
};

/**
 * Run before the first render. Returns true when the app is reloading because
 * the running code is an old cached build (the caller should not render).
 *
 * First try: let the service worker update normally, then reload. If the page
 * is still old right after that, remove the service worker and caches and
 * reload. If even that did not help, give up and run (the update banner still
 * works).
 */
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

// ─── "New version available" state (read by UpdateBanner) ───────────────────

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

/**
 * Reads the build id deployed on the server right now (null if it cannot be
 * read).
 */
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

/**
 * A new service worker took control of the page: is the page now running an old
 * build? Compares build ids, so it is right however the page was opened (also
 * for a page opened without a service worker, e.g. first visit, after "Reset
 * app" or a hard refresh). If the server id cannot be read, a takeover of a
 * page that was already controlled counts as an update and one of an
 * uncontrolled page as the first install.
 */
export const isTakeoverAnUpdate = async (wasControlled: boolean): Promise<boolean> => {
  const serverBuildId = await fetchServerBuildId();
  if (serverBuildId && API_CONFIG.bundleBuildId) {
    return serverBuildId !== API_CONFIG.bundleBuildId;
  }
  return wasControlled;
};

/** Reload when a lazy-loaded chunk fails (it was removed by a newer deploy). */
const handleChunkLoadErrors = () => {
  window.addEventListener('vite:preloadError', (event) => {
    if (claimAutoReload()) {
      event.preventDefault(); // Do not throw, the page is reloading
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
      let lastCheck = Date.now(); // The browser just checked while registering
      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        if (Date.now() - lastCheck < UPDATE_CHECK_MIN_GAP_MS) return;
        lastCheck = Date.now();
        registration.update().catch(() => {
          /* offline or server busy, the next check retries */
        });
      };
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', checkForUpdate);
      // Switching between two visible windows does not change visibility, only focus
      window.addEventListener('focus', checkForUpdate);
      window.addEventListener('online', checkForUpdate);
    })
    .catch((error) => console.error('[appUpdate] service worker registration failed', error));
};

/** Call once at startup. */
export const initAppUpdates = (): void => {
  handleChunkLoadErrors();
  // sw.js only exists in production builds
  if (import.meta.env.PROD) registerServiceWorker();
};
