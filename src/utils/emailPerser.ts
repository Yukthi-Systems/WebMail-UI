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

import { decodeWords } from 'postal-mime';

/**
 * Parse email address with proper decoding. Handles all formats: "Name
 * <email>", "<email>", "email", encoded names, escaped quotes, etc. PRESERVES
 * original casing exactly as provided.
 */
export function parseEmail(emailString: string): { name: string; email: string } {
  if (!emailString?.trim()) {
    return { name: 'Unknown', email: '' };
  }

  // Remove line breaks, tabs, and normalize whitespace
  let cleaned = emailString.replace(/[\r\n\t]+/g, ' ').trim();

  cleaned = cleaned.replace(/\\"/g, '"').replace(/\\\\/g, '');

  // Case 1: Just angle brackets with email: "<email@domain.com>"
  const angleOnlyMatch = cleaned.match(/^<([^>]+)>$/);
  if (angleOnlyMatch) {
    const email = angleOnlyMatch[1].trim();
    return {
      name: extractNameFromEmail(email),
      email: email,
    };
  }

  // Case 2: Name with angle brackets — try the FULL string first so quoted names
  // containing commas (e.g. "Patel, Chirag" <email>) are not broken by splitting.
  const nameAngleMatch = cleaned.match(/^(.+?)\s*<([^>]+)>$/);
  if (nameAngleMatch) {
    let rawName = nameAngleMatch[1].trim();
    const email = nameAngleMatch[2].trim();

    // Remove surrounding quotes (both single and double)
    rawName = rawName.replace(/^["']+|["']+$/g, '');

    // Decode any encoded words (handles =?UTF-8?B?...?= format)
    let decodedName = decodeWords(rawName);

    // Clean up the decoded name - preserve exact casing
    decodedName = decodedName
      .replace(/^["']+|["']+$/g, '') // remove only quotes
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim(); // trim spaces safely

    // If name is empty or just whitespace after cleaning, use email
    if (!decodedName || decodedName.length === 0) {
      return {
        name: extractNameFromEmail(email),
        email: email,
      };
    }

    return {
      name: decodedName,
      email: email,
    };
  }

  // Case 3: Just email address without brackets
  const emailOnlyMatch = cleaned.match(/^([^\s<>]+@[^\s<>]+)$/);
  if (emailOnlyMatch) {
    const email = emailOnlyMatch[1].trim();
    return {
      name: extractNameFromEmail(email),
      email: email,
    };
  }

  // Case 4: Encoded subject/name without proper email format
  const decoded = decodeWords(cleaned);

  // Try to extract email from decoded string
  const decodedEmailMatch = decoded.match(/<([^>]+@[^>]+)>/);
  if (decodedEmailMatch) {
    const email = decodedEmailMatch[1].trim();
    let name = decoded
      .replace(/<[^>]+>/, '')
      .trim()
      .replace(/^["'\\]+|["'\\]+$/g, '');

    if (!name || name.length === 0) {
      name = extractNameFromEmail(email);
    }

    return {
      name: name,
      email: email,
    };
  }

  // Case 5: Multi-address string passed to a single-address parser — take the first entry.
  // Done last so quoted names with commas are matched by Case 2 first.
  const firstEntry = cleaned.split(',')[0].trim();
  if (firstEntry !== cleaned && firstEntry) {
    return parseEmail(firstEntry);
  }

  // Fallback - return as-is but cleaned
  const fallbackName = decoded.replace(/^["'\\]+|["'\\]+$/g, '').trim();

  return {
    name: fallbackName || 'Unknown',
    email: cleaned,
  };
}

/**
 * Extract a readable name from an email address. Preserves original casing
 * exactly as provided.
 */
function extractNameFromEmail(email: string): string {
  if (!email) return 'Unknown';

  const localPart = email.split('@')[0];

  if (!localPart) return 'Unknown';

  // Replace separators with spaces, preserve original case
  // E.g., "shan2" stays "shan2", "JohnDoe" stays "JohnDoe"
  const formatted = localPart.replace(/[._-]/g, ' ').trim();

  return formatted || localPart;
}
