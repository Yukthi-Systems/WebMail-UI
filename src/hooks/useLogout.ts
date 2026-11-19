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

import { useMutation } from '@tanstack/react-query';
import { logout } from '../api/auth.ts';

/** Signs out and opens the login page at `loginPath`. */
export function useLogout() {
  return useMutation({
    mutationFn: async (loginPath: string) => {
      // Signed out on this device even if the server can't be reached
      await logout().catch(() => undefined);
      localStorage.clear();
      sessionStorage.clear();
      // A full page load drops the cached data, state and timers at once. Clearing
      // them while the mailbox is still shown made it reload everything without a
      // session (406 errors).
      window.location.replace(loginPath);
    },
  });
}
