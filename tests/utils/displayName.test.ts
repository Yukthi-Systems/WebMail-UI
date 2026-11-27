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

import { describe, expect, it } from 'vitest';
import { senderName, ssoFullName } from '../../src/utils/displayName';

const profile = {
  email: 'asha@example.com',
  firstName: 'Asha',
  lastName: 'Kumar',
  organizationId: 'org-1',
  organizationName: 'Example Org',
};

describe('display name', () => {
  it('the Display Name from Settings wins', () => {
    expect(senderName('Asha K (Sales)', profile, 'asha@example.com')).toBe('Asha K (Sales)');
  });

  it('empty in Settings: the SSO first and last name', () => {
    expect(senderName('', profile, 'asha@example.com')).toBe('Asha Kumar');
    expect(senderName('   ', profile, 'asha@example.com')).toBe('Asha Kumar');
  });

  it('SSO user without a last name: just the first name', () => {
    expect(ssoFullName({ ...profile, lastName: null })).toBe('Asha');
    expect(ssoFullName({ ...profile, lastName: '' })).toBe('Asha');
  });

  it('password user with no Display Name: the part of the address before @', () => {
    expect(senderName(undefined, null, 'asha@example.com')).toBe('asha');
  });
});
