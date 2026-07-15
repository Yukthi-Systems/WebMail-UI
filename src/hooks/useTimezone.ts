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

import { useAtomValue } from 'jotai';
import moment, { type MomentInput } from 'moment-timezone';
import { userSettingsAtom } from '../state/settings';

type Nullable<T> = T | null | undefined;

interface UseUserTimezoneReturn {
  formatUserDate: (date: Nullable<MomentInput>, formatString?: string) => string;
  formatUserDateNice: (date: Nullable<MomentInput>) => string;
  formatUserDateOnly: (date: Nullable<MomentInput>) => string;
  formatUserTimeOnly: (date: Nullable<MomentInput>) => string;
  formatUserDateShort: (date: Nullable<MomentInput>) => string;
  formatUserDateTable: (date: Nullable<MomentInput>) => string;
  formatEmailDate: (date: Nullable<MomentInput>) => string;
  convertToUTC: (dateInput: Nullable<MomentInput>) => string | null;
  userTimezone: string;
  timeFormat: '12h' | '24h';
}

const resolveDisplayTimezone = (tz?: string) => {
  if (!tz || tz === 'UTC') {
    return moment.tz.guess(); // browser local
  }
  return tz;
};

export const useUserTimezone = (): UseUserTimezoneReturn => {
  const userProfile = useAtomValue(userSettingsAtom);

  const timezone: string = resolveDisplayTimezone(userProfile?.ui?.timezone);
  const timeFormat: '12h' | '24h' = userProfile?.ui?.time_format === '24h' ? '24h' : '12h';

  // Centralized time token — use this everywhere instead of hardcoding
  const timeToken = timeFormat === '24h' ? 'HH:mm' : 'h:mm A';

  /**
   * Convert a date in user's timezone to UTC ISO string. Use only before
   * sending data to API.
   */
  const convertToUTC = (dateInput: Nullable<MomentInput>): string | null => {
    if (!dateInput) return null;
    const m = moment.tz(dateInput, timezone);
    if (!m.isValid()) return null;
    return m.utc().toISOString();
  };

  /** Format a UTC date into user's timezone. */
  const formatUserDate = (
    date: Nullable<MomentInput>,
    formatString: string = `MMM DD, YYYY ${timeToken}`
  ): string => {
    if (!date) return '';
    const m = moment.utc(date);
    if (!m.isValid()) return 'Invalid Date';
    return m.tz(timezone).format(formatString);
  };

  /**
   * Intelligent email date formatter with time priority:
   *
   * - Today: "3:45 PM" / "15:45"
   * - Yesterday: "Yesterday 3:45 PM" / "Yesterday 15:45"
   * - Last 6 days: "Mon 3:45 PM" / "Mon 15:45"
   * - This year: "Jan 15, 3:45 PM" / "Jan 15, 15:45"
   * - Older: "Jan 15, 2023"
   */
  const formatEmailDate = (date: Nullable<MomentInput>): string => {
    if (!date) return '';
    const m = moment.utc(date);
    if (!m.isValid()) return 'Invalid Date';

    const emailDate = m.tz(timezone);
    const now = moment.tz(timezone);

    // Today - show time only
    if (emailDate.isSame(now, 'day')) {
      return emailDate.format(timeToken);
    }

    // Yesterday - show with time
    if (emailDate.isSame(now.clone().subtract(1, 'day'), 'day')) {
      return emailDate.format(`[Yesterday] ${timeToken}`);
    }

    // Within last 6 days - show day name with time
    const daysAgo = now.diff(emailDate, 'days');
    if (daysAgo >= 0 && daysAgo < 7) {
      return emailDate.format(`ddd ${timeToken}`);
    }

    // This year - show month, day, and time
    if (emailDate.isSame(now, 'year')) {
      return emailDate.format(`MMM D, ${timeToken}`);
    }

    // Older - show full date without time (too old for time to be relevant)
    return emailDate.format('MMM D, YYYY');
  };

  const formatUserDateNice = (date: Nullable<MomentInput>): string =>
    formatUserDate(date, `MMM D, YYYY [at] ${timeToken}`);

  const formatUserDateOnly = (date: Nullable<MomentInput>): string =>
    formatUserDate(date, 'MMM D, YYYY');

  const formatUserTimeOnly = (date: Nullable<MomentInput>): string =>
    formatUserDate(date, timeToken);

  const formatUserDateShort = (date: Nullable<MomentInput>): string =>
    formatUserDate(date, 'MMM D, YYYY');

  // Table format: date is always unambiguous, only time token changes
  const formatUserDateTable = (date: Nullable<MomentInput>): string =>
    formatUserDate(date, `MM/DD/YYYY ${timeToken}`);

  return {
    formatUserDate,
    formatUserDateNice,
    formatUserDateOnly,
    formatUserTimeOnly,
    formatUserDateShort,
    formatUserDateTable,
    formatEmailDate,
    convertToUTC,
    userTimezone: timezone,
    timeFormat,
  };
};
