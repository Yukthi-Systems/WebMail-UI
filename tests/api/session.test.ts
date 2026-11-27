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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webmailStore } from '../../src/store';
import { loginMethodAtom, sessionTokenAtom, ssoProfileAtom } from '../../src/state/auth';
import { userSettingsAtom } from '../../src/state/settings';
import { authHeaders, clearSession, renewSsoSession } from '../../src/api/session';
import { fetchWithAuth } from '../../src/api/fetchWrapper';
import { login, LoginError } from '../../src/api/auth';
import { exchangeSsoSession, loadSsoProfile, ssoAppearance } from '../../src/api/sso';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fetchMock = vi.fn();
let assigned: string | undefined;

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  clearSession();
  assigned = undefined;
  // Capture redirects to the login page instead of navigating
  vi.stubGlobal('location', {
    ...window.location,
    pathname: '/folder/INBOX',
    set href(url: string) {
      assigned = url;
    },
    get href() {
      return 'https://webmail.example.com/folder/INBOX';
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const sentToken = (call: number) =>
  new Headers((fetchMock.mock.calls[call][1] as RequestInit).headers).get('X-Session-Token');

describe('session header', () => {
  it('is X-Session-Token with the stored token', () => {
    webmailStore.set(sessionTokenAtom, 'token-1');
    expect(authHeaders()).toEqual({ 'X-Session-Token': 'token-1' });
  });

  it('is empty when signed out, never an old CSRF header', () => {
    expect(authHeaders()).toEqual({});
  });
});

describe('password login', () => {
  it('takes the session from the JSON body', async () => {
    fetchMock.mockResolvedValue(json(200, { message: 'ok', session_id: 'abc' }));
    await expect(
      login({ email: 'user@example.com', domain: 'example.com', password: 'x' })
    ).resolves.toEqual({ sessionToken: 'abc' });
  });

  it('an SSO-only domain says so, with the API message', async () => {
    fetchMock.mockResolvedValue(
      json(401, { message: 'Your organization signs in with SSO.', login_method: 'sso' })
    );
    const error = await login({
      email: 'u@example.com',
      domain: 'example.com',
      password: 'x',
    }).catch((e) => e);
    expect(error).toBeInstanceOf(LoginError);
    expect(error.loginMethod).toBe('sso');
    expect(error.message).toBe('Your organization signs in with SSO.');
  });
});

describe('SSO exchange', () => {
  it('sends the SSO cookie and gets the session and the email', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { message: 'ok', session_id: 'sso-1' }))
      .mockResolvedValueOnce(json(200, { user_email: 'User@Example.com' }));
    await expect(exchangeSsoSession()).resolves.toEqual({
      sessionToken: 'sso-1',
      email: 'user@example.com',
    });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(sentToken(1)).toBe('sso-1');
  });

  it('shows the API message when SSO is refused', async () => {
    fetchMock.mockResolvedValue(json(401, { message: 'This account is currently disabled.' }));
    await expect(exchangeSsoSession()).rejects.toThrow('This account is currently disabled.');
  });
});

describe('expired session', () => {
  it('an SSO user gets a new session silently and the request is retried once', async () => {
    webmailStore.set(sessionTokenAtom, 'old');
    webmailStore.set(loginMethodAtom, 'sso');
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Oops! Session expired' }))
      .mockResolvedValueOnce(json(200, { session_id: 'new' })) // /user/login/sso
      .mockResolvedValueOnce(json(200, { user_email: 'user@example.com' })) // /user/validate
      .mockResolvedValueOnce(json(200, { folders: [] })); // the retry

    const res = await fetchWithAuth('https://api.example.com/folder/path', {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    expect(sentToken(0)).toBe('old');
    expect(sentToken(3)).toBe('new');
    expect(webmailStore.get(sessionTokenAtom)).toBe('new');
    expect(assigned).toBeUndefined();
  });

  it('a password user goes to the login page', async () => {
    webmailStore.set(sessionTokenAtom, 'old');
    webmailStore.set(loginMethodAtom, 'password');
    fetchMock.mockResolvedValue(json(401, { message: 'Oops! Session expired' }));

    await expect(fetchWithAuth('https://api.example.com/folder/path')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(assigned).toBe('/login');
    expect(webmailStore.get(sessionTokenAtom)).toBeNull();
  });

  it('when SSO can no longer renew it, the SSO user goes to the login page', async () => {
    webmailStore.set(sessionTokenAtom, 'old');
    webmailStore.set(loginMethodAtom, 'sso');
    fetchMock
      .mockResolvedValueOnce(json(406, { message: 'Oops! Session ID not found' }))
      .mockResolvedValueOnce(json(401, { message: 'Invalid SSO token' }));

    await expect(fetchWithAuth('https://api.example.com/folder/path')).rejects.toThrow();
    expect(assigned).toBe('/login');
  });

  it('requests failing at the same time share one renewal', async () => {
    webmailStore.set(loginMethodAtom, 'sso');
    fetchMock
      .mockResolvedValueOnce(json(200, { session_id: 'shared' }))
      .mockResolvedValueOnce(json(200, { user_email: 'user@example.com' }));
    const [a, b] = await Promise.all([renewSsoSession(), renewSsoSession()]);
    expect([a, b]).toEqual(['shared', 'shared']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('another 401 (e.g. the mail server refused) does not sign the user out', async () => {
    webmailStore.set(sessionTokenAtom, 'token');
    fetchMock.mockResolvedValue(json(401, { message: 'IMAP login failed' }));
    await expect(fetchWithAuth('https://api.example.com/folder/path')).rejects.toThrow(
      'IMAP login failed'
    );
    expect(assigned).toBeUndefined();
    expect(webmailStore.get(sessionTokenAtom)).toBe('token');
  });
});

describe('SSO screens follow the app theme', () => {
  it('dark mode and the accent colour', () => {
    webmailStore.set(userSettingsAtom, {
      ui: { theme: 'dark', color_scheme: 'blue' },
    } as never);
    expect(ssoAppearance()).toEqual({ theme: 'dark', themeColor: '#0090ff' });
  });

  it('light and orange by default (e.g. on the login page)', () => {
    webmailStore.set(userSettingsAtom, null);
    expect(ssoAppearance()).toEqual({ theme: 'light', themeColor: '#f76b15' });
  });
});

describe('SSO profile (name and organization)', () => {
  beforeEach(() => webmailStore.set(ssoProfileAtom, null));

  it('comes from the SSO session, sent with the SSO cookie', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        message: 'ok',
        email: 'user@example.com',
        first_name: 'Asha',
        last_name: null,
        organization_id: 'org-1',
        organization_name: 'Example Org',
      })
    );
    await loadSsoProfile();
    expect(webmailStore.get(ssoProfileAtom)).toEqual({
      email: 'user@example.com',
      firstName: 'Asha',
      lastName: null,
      organizationId: 'org-1',
      organizationName: 'Example Org',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/session');
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('SSO unreachable or blocked (e.g. CORS): nothing stored, sign-in not affected', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(loadSsoProfile()).resolves.toBeNull();
    expect(webmailStore.get(ssoProfileAtom)).toBeNull();
    warn.mockRestore();
  });

  it('is taken from the SSO login response when the API sends user_info (no extra request)', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, {
        session_id: 'sso-2',
        user_info: {
          email: 'User@Example.com',
          first_name: 'Asha',
          last_name: 'K',
          organization_id: 'org-2',
          organization_name: 'Example Org',
        },
      })
    );
    await expect(exchangeSsoSession()).resolves.toEqual({
      sessionToken: 'sso-2',
      email: 'user@example.com',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(webmailStore.get(ssoProfileAtom)?.organizationName).toBe('Example Org');
  });
});
