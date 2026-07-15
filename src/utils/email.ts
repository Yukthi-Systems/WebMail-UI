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
 * Extracts the display name from an email address field.
 *
 * Parses email fields in the format "Display Name
 * [email@domain.com](mailto:email@domain.com)" and returns just the display
 * name portion. If no display name is present, returns the email address
 * itself. Handles various edge cases including quoted names, missing names, and
 * malformed email addresses.
 *
 * @example
 *   ```typescript
 *   extractFullName("John Doe <john@example.com>") // Returns "John Doe"
 *   extractFullName("\"Jane Smith\" <jane@example.com>") // Returns "Jane Smith"
 *   extractFullName("noreply@example.com") // Returns "noreply@example.com"
 *   extractFullName("<user@domain.com>") // Returns "user@domain.com"
 *   extractFullName("") // Returns "Unknown Sender"
 *   ```;
 *
 * @param fromField - The "From" field from an email header (e.g., "John Doe
 *   [john@example.com](mailto:john@example.com)")
 *
 * @returns The extracted display name, email address if no name is present, or
 *   "Unknown Sender" if field is empty.
 */
export const extractFullName = (fromField: string): string => {
  if (!fromField) return 'Unknown Sender';

  // Match "Name <email@domain.com>" format
  const nameMatch = fromField.match(/^(.+?)\s*<(.+)>$/);
  if (nameMatch) {
    const name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
    const email = nameMatch[2].trim();
    return name || email;
  }

  // Check if it's just an email address in angle brackets "<email@domain.com>"
  const emailOnlyMatch = fromField.match(/^<(.+)>$/);
  if (emailOnlyMatch) {
    return emailOnlyMatch[1].trim();
  }

  // If it looks like a plain email address, return it as-is
  if (fromField.includes('@')) {
    return fromField.trim();
  }

  // Fallback for any other format
  return fromField.trim() || 'Unknown Sender';
};

export const getEmailCountText = (count: number) => {
  return `${count} email${count !== 1 ? 's' : ''}`;
};
