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

import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { loadSsoProfile, refreshSsoSessionIfDue } from '../api/sso';
import { loginMethodAtom, ssoProfileAtom } from '../state/auth';
import { webmailStore } from '../store';

const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Keeps an SSO user's SSO session alive while WebMail is open: re-issued every
 * 3 days, checked hourly and when the tab comes back. Nothing for password
 * users.
 */
export function useSsoSessionRefresh() {
  const loginMethod = useAtomValue(loginMethodAtom);

  useEffect(() => {
    if (loginMethod !== 'sso') return;
    void refreshSsoSessionIfDue();
    // Name and organization, if not loaded at sign-in (e.g. SSO unreachable then)
    if (!webmailStore.get(ssoProfileAtom)) void loadSsoProfile();
    const interval = setInterval(() => void refreshSsoSessionIfDue(), CHECK_EVERY_MS);
    const onVisible = () => {
      if (!document.hidden) void refreshSsoSessionIfDue();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loginMethod]);
}
