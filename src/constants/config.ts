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

// Define the shape of your env object for TypeScript
declare global {
  interface Window {
    _env_?: {
      VITE_API_URL?: string;
      VITE_DNS_API_KEY?: string;
      VITE_APP_VERSION?: string;
      VITE_RECAPTCHA_KEY?: string;
      VITE_DNS_API_URL?: string;
    };
  }
}

export const API_CONFIG = {
  // Check runtime window._env_ first, fallback to Vite build-time env
  baseURL: window._env_?.VITE_API_URL || import.meta.env.VITE_API_URL,

  DNS_API_KEY: window._env_?.VITE_DNS_API_KEY || import.meta.env.VITE_DNS_API_KEY,

  timeout: 30000,
  version: window._env_?.VITE_APP_VERSION || import.meta.env.VITE_APP_VERSION || '1.5.7-beta',
  recaptch_key:
    window._env_?.VITE_RECAPTCHA_KEY ||
    import.meta.env.VITE_RECAPTCHA_KEY ||
    '',
  DNS_API_URL: window._env_?.VITE_DNS_API_URL || import.meta.env.VITE_DNS_API_URL,
} as const;
