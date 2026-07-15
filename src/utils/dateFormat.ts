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
  const emailDate = new Date(dateString);
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
