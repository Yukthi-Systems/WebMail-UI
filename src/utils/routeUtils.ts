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
 * Reserved top-level route segments that should not be interpreted as company
 * slugs.
 */
export const RESERVED_ROUTES = [
  'login',
  'admin',
  '1219',
  'folder',
  'settings',
  'help',
  'video',
  'contacts',
  'api',
  'verify',
  'reset-password',
];

/** Checks if a given path segment is a reserved system route. */
export function isReservedRoute(segment: string): boolean {
  if (!segment) return true; // root path is essentially reserved/handled by index
  return RESERVED_ROUTES.includes(segment.toLowerCase());
}

/**
 * Extracts the company slug from a pathname if it exists. Assumes the slug is
 * the first segment of the path, unless that segment is reserved.
 */
export function getCompanySlugFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const firstSegment = segments[0];
  if (isReservedRoute(firstSegment)) {
    return null;
  }

  return firstSegment;
}
