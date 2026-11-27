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
import moment from 'moment-timezone/builds/moment-timezone-with-data-1970-2030';

// The smaller time zone data (1970-2030) must give the same times as the full set
describe('time zone data used for email dates', () => {
  const at = (iso: string, zone: string) => moment.utc(iso).tz(zone).format('YYYY-MM-DD HH:mm Z');

  it('India (no daylight saving)', () => {
    expect(at('2026-11-27T08:50:26Z', 'Asia/Kolkata')).toBe('2026-11-27 14:20 +05:30');
  });

  it('New York in winter and in summer (daylight saving)', () => {
    expect(at('2026-01-15T12:00:00Z', 'America/New_York')).toBe('2026-01-15 07:00 -05:00');
    expect(at('2026-07-15T12:00:00Z', 'America/New_York')).toBe('2026-07-15 08:00 -04:00');
  });

  it('London and Sydney, older emails too', () => {
    expect(at('2012-07-01T12:00:00Z', 'Europe/London')).toBe('2012-07-01 13:00 +01:00');
    expect(at('2015-01-01T00:00:00Z', 'Australia/Sydney')).toBe('2015-01-01 11:00 +11:00');
  });

  it('knows every zone in the Settings list', async () => {
    const { TIMEZONES } = await import('../../src/utils/constants');
    const missing = TIMEZONES.map((t: { value: string }) => t.value).filter(
      (zone: string) => zone !== 'UTC' && !moment.tz.zone(zone)
    );
    expect(missing).toEqual([]);
  });
});
