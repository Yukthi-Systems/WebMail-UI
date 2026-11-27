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
import { loadSsoProfile, loginWithSso } from '../api/sso';
import { loginMethodAtom, sessionTokenAtom, ssoProfileAtom } from '../state/auth';
import { webmailStore } from '../store';
import { userDetailsAtom } from '../state/userDetails';

import type { LoginCredentials, LoginResponse } from '../api/auth';

/** Password login. */
export function useLogin() {
  const setSessionToken = useSetAtom(sessionTokenAtom);
  const setLoginMethod = useSetAtom(loginMethodAtom);

  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: login,
    onSuccess: ({ sessionToken }) => {
      setLoginMethod('password');
      setSessionToken(sessionToken);
    },
  });
}

/**
 * Single sign-on: the SSO popup (or full-page fallback), then the WebMail
 * session.
 */
export function useSsoLogin() {
  const setSessionToken = useSetAtom(sessionTokenAtom);
  const setLoginMethod = useSetAtom(loginMethodAtom);

  const setUserDetails = useSetAtom(userDetailsAtom);

  return useMutation<LoginResponse, Error, void>({
    mutationFn: loginWithSso,
    onSuccess: ({ sessionToken, email }) => {
      if (email) setUserDetails({ email, domain: email.split('@')[1] });
      setLoginMethod('sso');
      setSessionToken(sessionToken);
      // Name and organization, if the login response didn't have them
      if (!webmailStore.get(ssoProfileAtom)) void loadSsoProfile();
    },
  });
}
