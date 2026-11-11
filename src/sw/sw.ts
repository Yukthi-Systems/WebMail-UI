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

/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { handleNavigation } from './navigation';

declare const self: ServiceWorkerGlobalScope;

// Activate new versions right away
self.skipWaiting();
clientsClaim();

// Cache JS, CSS and icons
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Start page requests early
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.navigationPreload?.enable() ?? Promise.resolve());
});

const preloadOrFetch = async (event: FetchEvent | undefined, request: Request) => {
  const preloaded = (await event?.preloadResponse?.catch(() => undefined)) as Response | undefined;
  return preloaded ?? fetch(request);
};

registerRoute(
  new NavigationRoute(
    ({ request, event }) =>
      handleNavigation(request, {
        fetch: (req) => preloadOrFetch(event as FetchEvent | undefined, req),
        getCachedPage: () => matchPrecache('index.html'),
      }),
    { denylist: [/^\/api\//] }
  )
);
