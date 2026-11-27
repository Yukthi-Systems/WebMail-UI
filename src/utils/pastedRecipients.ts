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

export interface PastedRecipient {
  name: string;
  address: string;
}

export interface PastedRecipients {
  /** Valid addresses in the order pasted, each once. */
  recipients: PastedRecipient[];
  /**
   * Things that look like an address but aren't valid (e.g. "ravi@company"), to
   * fix by hand.
   */
  invalid: string[];
}

const EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// An address anywhere in text: separated by spaces, commas, semicolons, new lines...
const BARE = /(?:mailto:)?([A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+)/gi;
// "Name <address>" as mail apps copy it (Outlook, Gmail, headers)
const ANGLE = /<\s*(?:mailto:)?([^<>\s]+@[^<>\s]+)\s*>/gi;

export const isValidAddress = (address: string) => EMAIL.test(address);

/**
 * Trailing dots/brackets from sentences and lists: "ravi@x.com." ->
 * "ravi@x.com"
 */
const trimAddress = (address: string) => address.replace(/^[.'"(]+|[.'")\]:]+$/g, '');

/**
 * The display name typed before "<address>": the part after the previous
 * separator, without quotes or a "To:" label. Quoted names keep their commas
 * ("Kumar, Ravi" [ravi@x.com](mailto:ravi@x.com)).
 */
const nameBefore = (text: string): string => {
  const quoted = text.match(/"([^"]*)"\s*$/);
  const raw = quoted ? quoted[1] : (text.split(/[,;\n\t|]/).pop() ?? '');
  return raw
    .replace(/^\s*(to|cc|bcc|from)\s*:/i, '')
    .replace(/^[\s'"]+|[\s'"]+$/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Finds the addresses in pasted text, however they are separated: commas,
 * semicolons, spaces, new lines (an Excel column), "Name <address>" lists from
 * mail apps, or a sentence with addresses in it. Duplicates count once.
 */
export const parsePastedRecipients = (text: string): PastedRecipients => {
  const found: Array<{ index: number; name: string; address: string }> = [];
  const taken: Array<[number, number]> = [];
  let lastEnd = 0;

  for (const match of text.matchAll(ANGLE)) {
    const start = match.index ?? 0;
    found.push({ index: start, name: nameBefore(text.slice(lastEnd, start)), address: match[1] });
    lastEnd = start + match[0].length;
    taken.push([start, lastEnd]);
  }

  for (const match of text.matchAll(BARE)) {
    const start = match.index ?? 0;
    if (taken.some(([from, to]) => start >= from && start < to)) continue;
    found.push({ index: start, name: '', address: match[1] });
  }

  found.sort((a, b) => a.index - b.index);

  const recipients: PastedRecipient[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const item of found) {
    const address = trimAddress(item.address);
    if (!isValidAddress(address)) {
      if (!invalid.includes(address)) invalid.push(address);
      continue;
    }
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const name = item.name.toLowerCase() === key ? '' : item.name;
    recipients.push({ name, address });
  }

  return { recipients, invalid };
};
