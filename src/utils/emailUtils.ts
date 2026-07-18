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

// src/utils/emailUtils.ts

import { parseEmail } from './emailPerser';

// Splits a comma-separated address list while respecting quoted strings.
// A naive split(',') breaks names like "Patel, Chirag" <email> at the inner comma.
export function splitAddressList(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && str[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) {
        inQuotes = !inQuotes;
      }
      current += ch;
    } else if (ch === ',' && !inQuotes) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
}

export const parseMultipleEmails = (emailString: string) => {
  if (!emailString) return [];

  // Unfold RFC 2822 header folding (\r\n + whitespace → single space)
  const unfolded = emailString.replace(/\r?\n[\t ]+/g, ' ');

  return splitAddressList(unfolded).map((entry) => {
    const parsed = parseEmail(entry);
    return {
      name: parsed.name,
      email: parsed.email,
      original: entry,
    };
  });
};
// Accepts whatever shape the caller has on hand (raw headers, an Email
// object, null) — same tolerance the previous `any`-typed version had.
export function normalizeFieldNames(obj: unknown): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  const source = (obj || {}) as Record<string, unknown>;

  Object.keys(source).forEach((key) => {
    normalized[key.toLowerCase()] = source[key];
  });

  return normalized;
}

export const normalizeId = (id = '') => id.replace(/[<>]/g, '').trim();

export const getMessageId = (email: unknown) => {
  const e = (email || {}) as Record<string, unknown>;
  return normalizeId(
    (e['Message-Id'] || e['Message-ID'] || e['message-id'] || e['message-ID'] || '') as string
  );
};

export const extractIds = (value = ''): string[] => {
  const matches = value.match(/<([^>]+)>/g);
  return matches ? matches.map((v) => normalizeId(v)) : [];
};

export const extractHeaders = (rawEmailText: string): Record<string, string> => {
  const headerEnd = rawEmailText.indexOf('\n\n');
  if (headerEnd === -1) return {};

  const headerText = rawEmailText.substring(0, headerEnd);
  const headerLines = headerText.split('\n');
  const headerMap: Record<string, string> = {};

  headerLines.forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (key in headerMap) {
        headerMap[key] += ' ' + value;
      } else {
        headerMap[key] = value;
      }
    }
  });

  return headerMap;
};

export const parseHeaders = (parsedHeaders: unknown): Record<string, string> => {
  const result: Record<string, string> = {};

  if (Array.isArray(parsedHeaders)) {
    (parsedHeaders as Array<{ key?: string; name?: string; value?: unknown }>).forEach((header) => {
      const key = header.key ?? header.name;
      const value = header.value;
      if (key && value !== undefined) {
        result[key] = value as string;
      }
    });
  } else if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
    Object.entries(parsedHeaders).forEach(([key, value]) => {
      result[key] = String(value);
    });
  }

  return result;
};

export const getInitialName = (name = ' ') => {
  if (name) {
    let cleanedName = name.trim();
    cleanedName = cleanedName.replace(/\\"/g, '');
    cleanedName = cleanedName.replace(/"/g, '');
    cleanedName = cleanedName.replace(/\\/g, '');
    return cleanedName.trim() || ' ';
  }
  return ' ';
};
