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

// Page loads: server first, cached copy as fallback.

export const NETWORK_TIMEOUT_MS = 3_000;

type NavigationDeps = {
  fetch: (request: Request) => Promise<Response>;
  getCachedPage: () => Promise<Response | undefined>;
  timeoutMs?: number;
};

// Only network errors and 5xx fall back to the cache
const isUsable = (response: Response | null): response is Response =>
  !!response && (response.type === 'opaqueredirect' || response.status < 500);

/** Never fails: server, then cache, then offline page. */
export const handleNavigation = async (
  request: Request,
  { fetch, getCachedPage, timeoutMs = NETWORK_TIMEOUT_MS }: NavigationDeps
): Promise<Response> => {
  const network = fetch(request).catch(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  const first = await Promise.race([network, timedOut]);
  clearTimeout(timer);
  if (first !== 'timeout' && isUsable(first)) return first;

  const cached = await getCachedPage().catch(() => undefined);
  if (cached) return cached;

  const late = first === 'timeout' ? await network : first;
  return late ?? offlinePage();
};

export const offlinePage = (): Response =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>WebMail</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#1e293b}@media (prefers-color-scheme:dark){body{background:#0f172a;color:#f1f5f9}}main{text-align:center;padding:16px}p{color:#64748b}button{margin-top:8px;padding:10px 20px;border:0;border-radius:8px;background:#f97316;color:#fff;font-size:15px;cursor:pointer}</style>
</head><body><main><h1>Can't reach WebMail</h1><p>Check your internet connection and try again.</p><button onclick="location.reload()">Retry</button></main>
<script>addEventListener('online',()=>location.reload())</script></body></html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    }
  );
