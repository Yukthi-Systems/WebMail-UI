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

// src/state/emailListView.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Values accepted by GET /email/fetch and POST /email/search/all (sorting and
// filtering run on the IMAP server across the whole folder, before pagination).
export type EmailSortBy = 'date' | 'arrival' | 'from' | 'subject' | 'size';
export type EmailSortOrder = 'desc' | 'asc';
export type EmailFilterBy = 'all' | 'unread' | 'read' | 'flagged' | 'unflagged';

export interface EmailSortState {
  sortBy: EmailSortBy;
  sortOrder: EmailSortOrder;
}

export const DEFAULT_EMAIL_SORT: EmailSortState = { sortBy: 'date', sortOrder: 'desc' };

// Sort preference survives reloads; the filter is transient and is reset to
// 'all' on folder change by the email list.
export const emailSortAtom = atomWithStorage<EmailSortState>(
  'webmail-email-sort',
  DEFAULT_EMAIL_SORT
);
export const emailFilterAtom = atom<EmailFilterBy>('all');
