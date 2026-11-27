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

import type { SsoProfile } from '../state/auth';

/** "First Last" from the SSO profile, '' when there is none. */
export const ssoFullName = (profile?: SsoProfile | null): string =>
  [profile?.firstName, profile?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

/**
 * The name emails are sent with: the Display Name from Settings, else the SSO
 * user's first and last name, else the part of the address before "@".
 */
export const senderName = (
  settingsName: string | undefined,
  profile: SsoProfile | null | undefined,
  email: string | undefined
): string => settingsName?.trim() || ssoFullName(profile) || email?.split('@')[0] || '';
