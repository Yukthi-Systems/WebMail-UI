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

// src/utils/contactScraper.ts
import { parseEmail } from './emailPerser';
import type { Email } from '../api/mailbox';
import type { CreateContactData } from './contact';
import { normalizeFieldNames, splitAddressList } from './emailUtils';

export const scrapeContactsFromEmails = (
  emails: Email[],
  currentUserEmail?: string // Added parameter for filtering
): Partial<CreateContactData>[] => {
  const contactMap = new Map<string, string>();
  const userEmailLower = currentUserEmail?.toLowerCase();

  emails.forEach((email) => {
    // Collect from From, To, and Cc
    const normalizedEmail = normalizeFieldNames(email);
    const participants = [normalizedEmail.from, normalizedEmail.to, normalizedEmail.cc]
      .filter((s): s is string => Boolean(s))
      .map((s) => s.replace(/\r?\n[\t ]+/g, ' '))
      .join(', ');
    const addresses = splitAddressList(participants);

    addresses.forEach((addr) => {
      const { name, email: emailAddr } = parseEmail(addr);

      if (emailAddr) {
        const normalizedAddr = emailAddr.toLowerCase();

        // Technical Change: Only add if it's not the current user's email
        if (normalizedAddr !== userEmailLower && !contactMap.has(normalizedAddr)) {
          contactMap.set(normalizedAddr, name || emailAddr.split('@')[0]);
        }
      }
    });
  });

  return Array.from(contactMap.entries()).map(([email, name]) => ({
    name,
    email,
    phone: '',
    notes: 'Scraped from webmail',
  }));
};
