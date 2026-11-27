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

import {
  openLoginPopup,
  redirectToLogin,
  refreshSession,
  validateSession,
  PopupBlockedError,
  type SSOAppearance,
} from '@rjyspl/phoenix-sso-react';
import { API_CONFIG } from '../constants/config';
import { ssoProfileAtom, type SsoProfile } from '../state/auth';
import { userSettingsAtom } from '../state/settings';
import { webmailStore } from '../store';
import { API_URL } from './config';
import { LoginError, type LoginResponse } from './auth';

export const SSO_URL = API_CONFIG.ssoURL;
export const SSO_APP_ID = API_CONFIG.ssoAppId;

// Added to the return URL when the popup was blocked and the whole page went to
// SSO instead. Back on the login page with it, the SSO cookie is already set.
export const SSO_REDIRECT_PARAM = 'sso_redirect';

export const isSsoRedirectReturn = () =>
  new URL(window.location.href).searchParams.get(SSO_REDIRECT_PARAM) === '1';

// Radix accent colours (step 9), so the SSO screens use the user's accent
const ACCENT_HEX: Record<string, string> = {
  gray: '#8d8d8d',
  gold: '#978365',
  bronze: '#a18072',
  brown: '#ad7f58',
  yellow: '#ffe629',
  amber: '#ffc53d',
  orange: '#f76b15',
  tomato: '#e54d2e',
  red: '#e5484d',
  ruby: '#e54666',
  crimson: '#e93d82',
  pink: '#d6409f',
  plum: '#ab4aba',
  purple: '#8e4ec6',
  violet: '#6e56cf',
  iris: '#5b5bd6',
  indigo: '#3e63dd',
  blue: '#0090ff',
  cyan: '#00a2c7',
  teal: '#12a594',
  jade: '#29a383',
  green: '#30a46c',
  grass: '#46a758',
  lime: '#bdee63',
  mint: '#86ead4',
  sky: '#7ce2fe',
};

/**
 * Light/dark and accent colour of the app (as ThemeWrapper shows it), for the
 * SSO screens.
 */
export const ssoAppearance = (): SSOAppearance => {
  const ui = webmailStore.get(userSettingsAtom)?.ui;
  return {
    theme: ui?.theme === 'dark' ? 'dark' : 'light',
    themeColor: ACCENT_HEX[ui?.color_scheme || 'orange'],
  };
};

/**
 * Exchanges the SSO session (the SSO-Session-ID cookie, sent with credentials)
 * for a WebMail session. Shows the API's message on failure.
 */
export const exchangeSsoSession = async (): Promise<LoginResponse> => {
  const res = await fetch(`${API_URL}/user/login/sso`, { method: 'POST', credentials: 'include' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.session_id) {
    const fallback =
      res.status === 503
        ? "We couldn't reach your mail server. Please try again in a few minutes."
        : 'Single sign-on failed. Please try again.';
    const err = new LoginError(body.message || fallback);
    err.status = res.status;
    throw err;
  }
  // user_info: name and organization, like the other apps' SSO logins return it
  const profile = toSsoProfile(body.user_info);
  if (profile) webmailStore.set(ssoProfileAtom, profile);
  return {
    sessionToken: body.session_id,
    email: profile?.email.toLowerCase() || (await sessionEmail(body.session_id)),
  };
};

/** The SSO user's details, from a login response's user_info or the SSO session. */
const toSsoProfile = (info: unknown): SsoProfile | null => {
  if (!info || typeof info !== 'object') return null;
  const data = info as Record<string, unknown>;
  if (typeof data.email !== 'string' || typeof data.organization_name !== 'string') return null;
  return {
    email: data.email,
    firstName: typeof data.first_name === 'string' ? data.first_name : '',
    lastName: typeof data.last_name === 'string' ? data.last_name : null,
    organizationId: String(data.organization_id ?? ''),
    organizationName: data.organization_name,
  };
};

/**
 * The signed-in address (SSO doesn't give it to the app): from GET
 * /user/validate.
 */
const sessionEmail = async (sessionToken: string): Promise<string | undefined> => {
  try {
    const res = await fetch(`${API_URL}/user/validate`, {
      headers: { 'X-Session-Token': sessionToken },
    });
    const body = await res.json().catch(() => ({}));
    return typeof body.user_email === 'string' ? body.user_email.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
};

/** The user closed the SSO popup: not an error to show. */
export const isPopupClosed = (err: unknown) =>
  err instanceof Error && /popup was closed/i.test(err.message);

/**
 * Signs in with SSO: the SSO popup, then the WebMail session. A blocked popup
 * falls back to sending the whole page to SSO (this promise then never
 * settles). Rejects when the user closes the popup or SSO / WebMail refuse the
 * login.
 */
export const loginWithSso = async (): Promise<LoginResponse> => {
  const url = new URL(window.location.href);
  if (url.searchParams.get(SSO_REDIRECT_PARAM) === '1') {
    // Back from the full-page fallback: the SSO cookie is set already
    url.searchParams.delete(SSO_REDIRECT_PARAM);
    window.history.replaceState({}, '', url.pathname + url.search);
  } else {
    try {
      await openLoginPopup(SSO_URL, SSO_APP_ID, { width: 500, height: 650, ...ssoAppearance() });
    } catch (err) {
      if (err instanceof PopupBlockedError) {
        url.searchParams.set(SSO_REDIRECT_PARAM, '1');
        redirectToLogin(SSO_URL, SSO_APP_ID, { returnTo: url.toString(), ...ssoAppearance() });
        return new Promise<LoginResponse>(() => {});
      }
      throw err;
    }
  }

  const session = await exchangeSsoSession();
  markSsoSessionFresh();
  return session;
};

/**
 * The user's name and organization from the SSO session itself (sent with the
 * SSO cookie): only when the WebMail login didn't return them. Null when there
 * is no SSO session or SSO can't be reached (e.g. this origin not in SSO's
 * CORS).
 */
export const loadSsoProfile = async (): Promise<SsoProfile | null> => {
  try {
    const profile = toSsoProfile(await validateSession(SSO_URL));
    if (profile) webmailStore.set(ssoProfileAtom, profile);
    return profile;
  } catch (err) {
    console.warn('[SSO] Could not load the profile', err);
    return null;
  }
};

// The SSO cookie is re-issued every few days, so it doesn't run out while in use
const SSO_LAST_REFRESH_KEY = 'sso_last_refresh_at';
const SSO_REFRESH_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

/** A fresh SSO sign-in just issued a new cookie: restart the 3-day clock. */
export const markSsoSessionFresh = (): void => {
  try {
    localStorage.setItem(SSO_LAST_REFRESH_KEY, String(Date.now()));
  } catch {
    // Storage unavailable: at worst it refreshes early
  }
};

let refreshInFlight = false;

/**
 * Re-issues the SSO cookie if the last refresh was 3+ days ago. Safe to call
 * often.
 */
export const refreshSsoSessionIfDue = async (): Promise<void> => {
  if (refreshInFlight) return;
  let last = 0;
  try {
    last = Number(localStorage.getItem(SSO_LAST_REFRESH_KEY)) || 0;
  } catch {
    // Storage unavailable: treat it as due
  }
  if (Date.now() - last < SSO_REFRESH_INTERVAL_MS) return;

  refreshInFlight = true;
  try {
    // null: no SSO session to extend (it can only be replaced by signing in again)
    const result = await refreshSession(SSO_URL);
    markSsoSessionFresh();
    if (!result) console.warn('[SSO] No active SSO session to refresh');
  } catch (err) {
    // SSO unreachable: keep the old time so the next check tries again
    console.error('[SSO] Session refresh failed', err);
  } finally {
    refreshInFlight = false;
  }
};
