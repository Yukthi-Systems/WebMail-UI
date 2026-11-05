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

import { beforeEach, describe, expect, it } from 'vitest';
import { getStoredBimiRecord, storeBimiRecord } from '../../src/utils/bimiCache';

const DAY = 24 * 60 * 60 * 1000;
const withLogo = { exists: true, logo: 'https://x.com/logo.svg' };
const withoutLogo = { exists: false };

describe('bimiCache', () => {
  beforeEach(() => localStorage.clear());

  it('remembers a logo for 7 days', () => {
    storeBimiRecord('x.com', withLogo, 0);
    expect(getStoredBimiRecord('x.com', 6 * DAY)).toEqual(withLogo);
    expect(getStoredBimiRecord('x.com', 8 * DAY)).toBeNull();
  });

  it('remembers "no logo" for one day only', () => {
    storeBimiRecord('x.com', withoutLogo, 0);
    expect(getStoredBimiRecord('x.com', DAY - 1)).toEqual(withoutLogo);
    expect(getStoredBimiRecord('x.com', DAY + 1)).toBeNull();
  });

  it('keeps other domains and survives broken stored data', () => {
    storeBimiRecord('x.com', withLogo, 0);
    storeBimiRecord('y.com', withoutLogo, 0);
    expect(getStoredBimiRecord('x.com', 1)).toEqual(withLogo);
    localStorage.setItem('webmail-bimi-cache-v1', 'not json');
    expect(getStoredBimiRecord('x.com')).toBeNull();
  });

  it('drops the oldest domains past the limit', () => {
    for (let i = 0; i < 505; i++) storeBimiRecord(`d${i}.com`, withLogo, i);
    expect(getStoredBimiRecord('d0.com', 505)).toBeNull();
    expect(getStoredBimiRecord('d504.com', 505)).toEqual(withLogo);
  });
});
