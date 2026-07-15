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

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { csrfTokenAtom } from '../state/auth';
import { logout } from '../api/auth.ts';
import { resetLayoutCache } from '../routes/_baselayout.tsx';

export function useLogout() {
  const setCsrfToken = useSetAtom(csrfTokenAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear all cached queries and mutations
      queryClient.clear();
      resetLayoutCache();
      setCsrfToken(null);
      localStorage.clear();
      sessionStorage.clear();
    },
  });
}
