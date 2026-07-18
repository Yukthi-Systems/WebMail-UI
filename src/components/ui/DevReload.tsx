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

// src/components/DevReload.tsx
import { useEffect } from 'react';

const DevReload = () => {
  useEffect(() => {
    // Only run in development or when we want auto-reload
    if (import.meta.env.DEV || window.location.hostname !== 'localhost') {
      const checkForUpdates = async () => {
        try {
          const timestamp = Date.now();
          const response = await fetch(`/src/main.tsx?t=${timestamp}`, { method: 'HEAD' });
          const lastModified = response.headers.get('Last-Modified');
          const etag = response.headers.get('ETag');

          // Store initial values on first run
          if (!window.devReloadLastModified) {
            window.devReloadLastModified = lastModified;
            window.devReloadEtag = etag;
            return;
          }

          if (
            (lastModified && lastModified !== window.devReloadLastModified) ||
            (etag && etag !== window.devReloadEtag)
          ) {
            window.devReloadLastModified = lastModified;
            window.devReloadEtag = etag;
            window.location.reload();
          }
        } catch {
          // If source files not accessible, try checking built files
          try {
            const builtResponse = await fetch('/index.html?' + Date.now(), { method: 'HEAD' });
            const builtModified = builtResponse.headers.get('Last-Modified');

            if (!window.devReloadBuiltModified) {
              window.devReloadBuiltModified = builtModified;
              return;
            }

            if (builtModified && builtModified !== window.devReloadBuiltModified) {
              window.devReloadBuiltModified = builtModified;
              window.location.reload();
            }
          } catch (buildError) {
            console.error('error checking for updates:', buildError);

            // Silently ignore all errors
          }
        }
      };

      const interval = setInterval(checkForUpdates, 2000);
      checkForUpdates(); // Initial check

      return () => clearInterval(interval);
    }
  }, []);

  return null; // This component doesn't render anything
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    devReloadLastModified?: string | null;
    devReloadEtag?: string | null;
    devReloadBuiltModified?: string | null;
  }
}

export default DevReload;
