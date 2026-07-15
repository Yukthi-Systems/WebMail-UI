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
import { useSetAtom } from 'jotai';
import { login } from '../api/auth';
import { csrfTokenAtom, isVersionTwoUserAtom } from '../state/auth';

import type { LoginCredentials, LoginResponse } from '../api/auth';

export function useLogin() {
  const setCsrfToken = useSetAtom(csrfTokenAtom);
  const setIsVersionTwoUser = useSetAtom(isVersionTwoUserAtom);

  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: login,
    onSuccess: ({ csrfToken, isVersionTwoUser }) => {
      setCsrfToken(csrfToken);
      setIsVersionTwoUser(isVersionTwoUser);
    },
  });
}
