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

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

// Offsets in minutes for zone abbreviations seen in the wild. Unknown
// abbreviations (and RFC 2822 military zones) fall back to UTC.
const TZ_ABBR: Record<string, number> = {
  z: 0,
  ut: 0,
  utc: 0,
  gmt: 0,
  wet: 0,
  bst: 60,
  cet: 60,
  cest: 120,
  eet: 120,
  eest: 180,
  msk: 180,
  ist: 330,
  sgt: 480,
  hkt: 480,
  jst: 540,
  kst: 540,
  aest: 600,
  aedt: 660,
  nzst: 720,
  nzdt: 780,
  est: -300,
  edt: -240,
  cst: -360,
  cdt: -300,
  mst: -420,
  mdt: -360,
  pst: -480,
  pdt: -420,
};

const MONTH_RE = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const TIME_RE =
  '(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:[.,]\\d+)?\\s*(?:([ap])\\.?m\\.?)?\\s*' +
  '((?:gmt|utc)?\\s*[+-]\\d{1,2}(?::?\\d{2})?|[a-z]{1,5})?';

// "29 Aug 2024 10:08:40 +0000" (RFC 2822, day optional prefix ignored)
const RFC_RE = new RegExp(
  `(\\d{1,2})[\\s-]+${MONTH_RE}[\\s-]+(\\d{2,4})(?:[\\s,T]+${TIME_RE})?`,
  'i'
);
// "Aug 29, 2024 10:08:40 AM"
const US_RE = new RegExp(
  `${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})(?:[\\s,T]+(?:at\\s+)?${TIME_RE})?`,
  'i'
);
// "Thu Aug 29 10:08:40 2024" (asctime / JS Date.toString)
const ASCTIME_RE = new RegExp(
  `${MONTH_RE}\\s+(\\d{1,2})\\s+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?\\s+(?:([a-z]{1,5}|[+-]\\d{4})\\s+)?(\\d{4})`,
  'i'
);
// "2024-08-29T10:08:40.123Z", "2024/08/29 10:08", "2024-08-29"
const ISO_RE =
  /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3})\d*)?)?\s*(z|[+-]\d{2}(?::?\d{2})?)?)?/i;

const parseTzOffset = (tz?: string): number => {
  if (!tz) return 0;
  const cleaned = tz
    .trim()
    .toLowerCase()
    .replace(/^(gmt|utc)\s*/, '');
  if (!cleaned) return 0;
  const numeric = cleaned.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (numeric) {
    const minutes = Number(numeric[2]) * 60 + Number(numeric[3] || 0);
    return numeric[1] === '-' ? -minutes : minutes;
  }
  return TZ_ABBR[cleaned] ?? 0;
};

const normalizeYear = (year: string): number => {
  const y = Number(year);
  if (year.length === 2) return y < 50 ? 2000 + y : 1900 + y;
  if (year.length === 3) return 1900 + y; // RFC 2822 obsolete 3-digit years
  return y;
};

const buildDate = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
  meridiem?: string,
  tz?: string
): Date | null => {
  if (meridiem) {
    const isPm = meridiem.toLowerCase() === 'p';
    if (hour === 12) hour = isPm ? 12 : 0;
    else if (isPm) hour += 12;
  }
  if (month < 0 || month > 11 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 60) {
    return null;
  }
  const utc = Date.UTC(year, month, day, hour, minute, second, ms) - parseTzOffset(tz) * 60_000;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toValidDate = (value: string | number): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Parses a date from any format commonly found in email headers and APIs: RFC
 * 2822 (with or without weekday, comments, or trailing junk such as the
 * `<message-id>` Outlook sometimes appends), ISO 8601, US-style "Aug 29, 2024",
 * asctime, epoch seconds/milliseconds and Date objects.
 *
 * Dates without an explicit zone are treated as UTC.
 *
 * @returns A valid Date, or null when nothing date-like could be found.
 */
export const parseEmailDate = (input: unknown): Date | null => {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') return toValidDate(input < 1e11 ? input * 1000 : input);
  if (typeof input === 'object' && typeof (input as { toDate?: unknown }).toDate === 'function') {
    return parseEmailDate((input as { toDate: () => Date }).toDate());
  }

  const raw = String(input)
    .replace(/\r?\n[\t ]+/g, ' ')
    .trim();
  if (!raw) return null;

  if (/^\d{9,13}$/.test(raw)) return parseEmailDate(Number(raw));

  // Drop RFC 2822 comments "(UTC)" and angle-bracketed junk "<id@host>".
  const str = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let m = str.match(ISO_RE);
  if (m) {
    const date = buildDate(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0),
      Number((m[7] || '0').padEnd(3, '0')),
      undefined,
      m[8]
    );
    if (date) return date;
  }

  m = str.match(RFC_RE);
  if (m) {
    const date = buildDate(
      normalizeYear(m[3]),
      MONTHS[m[2].toLowerCase()],
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0),
      0,
      m[7],
      m[8]
    );
    if (date) return date;
  }

  m = str.match(US_RE);
  if (m) {
    const date = buildDate(
      Number(m[3]),
      MONTHS[m[1].toLowerCase()],
      Number(m[2]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0),
      0,
      m[7],
      m[8]
    );
    if (date) return date;
  }

  m = str.match(ASCTIME_RE);
  if (m) {
    const date = buildDate(
      Number(m[7]),
      MONTHS[m[1].toLowerCase()],
      Number(m[2]),
      Number(m[3]),
      Number(m[4]),
      Number(m[5] || 0),
      0,
      undefined,
      m[6]
    );
    if (date) return date;
  }

  return toValidDate(str) ?? toValidDate(raw);
};

/**
 * Formats an email date string into a user-friendly display format.
 *
 * The function formats dates differently based on how recent they are:
 *
 * - Today: Shows time in 12-hour format (e.g., "2:30 PM")
 * - Yesterday: Shows "Yesterday"
 * - This year: Shows month and day (e.g., "Dec 13")
 * - Previous years: Shows month, day, and year (e.g., "Dec 13, 2023")
 *
 * @example
 *   ```typescript
 *   // Today at 2:30 PM
 *   formatEmailDate("2024-12-13T14:30:00Z") // Returns "2:30 PM"
 *
 *   // Yesterday
 *   formatEmailDate("2024-12-12T10:00:00Z") // Returns "Yesterday"
 *
 *   // This year
 *   formatEmailDate("2024-11-15T10:00:00Z") // Returns "Nov 15"
 *
 *   // Previous year
 *   formatEmailDate("2023-11-15T10:00:00Z") // Returns "Nov 15, 2023"
 *   ```;
 *
 * @param dateString - ISO date string or any valid date string that can be
 *   parsed by Date constructor.
 *
 * @returns A formatted date string appropriate for email list display.
 */
export const formatEmailDate = (dateString: string): string => {
  const emailDate = parseEmailDate(dateString);
  if (!emailDate) return '';
  const now = new Date();

  const getDayStart = (date: Date): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const today = getDayStart(now);
  const emailDay = getDayStart(emailDate);
  const daysDiff = Math.floor((today.getTime() - emailDay.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    return emailDate.toLocaleTimeString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  const formatOptions =
    emailDate.getFullYear() === now.getFullYear()
      ? {
          day: 'numeric' as const,
          month: 'short' as const,
          hour: 'numeric' as const,
          minute: '2-digit' as const,
          hour12: true,
        }
      : {
          month: 'short' as const,
          day: 'numeric' as const,
          year: 'numeric' as const,
        };

  return emailDate.toLocaleDateString('en-US', formatOptions);
};
