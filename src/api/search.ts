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

// src/api/search.ts
import { csrfTokenAtom } from '../state/auth';
import { webmailStore } from '../store';
import { API_URL, authCheck } from './config';
import { fetchWithAuth } from './fetchWrapper';
import { sanitizeFolderPath } from './mailbox';
import type { SimplifiedEmail } from '../utils/email';

// export interface SearchRequest {
//   folder?: string;
//   from?: string;
//   to?: string;
//   subject?: string;
//   has_words?: string[];
//   does_not_have_words?: string[];
//   size?: {
//     comparator: 'greater' | 'less';
//     size: number;
//   };
//   date_on?: string;
//   date_since?: string;
//   has_attachments?: boolean;
//   limit?: number;
//   page?: number;
// }

export type SearchRequest = {
  folder: string;
  from_?: string;
  to?: string;
  subject?: string;
  has_words?: string[];
  does_not_have_words?: string[];
  has_attachments?: boolean | null; // Make it OPTIONAL with ?
  size?: { comparator: '>' | '<' | '='; size: number };
  date_on?: string;
  date_since?: string;
  limit: number;
  page: number;
};

export interface SearchResult {
  id: string;
  From: string;
  To: string;
  Subject: string;
  Date: string;
  bodyPreview?: string;
  FLAGS: string[];
  attachmentCount?: number;
  Cc?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// The real response shape (confirmed by every current consumer's `.data.data` /
// `.data.total_count` access) — SearchResponse above doesn't match what the
// endpoint actually returns and appears to be stale/aspirational.
export interface SearchApiResponse {
  data: {
    data: SimplifiedEmail[];
    total_count: number;
  };
}

export const searchEmails = async (searchData: SearchRequest): Promise<SearchApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const res = await fetchWithAuth(`${API_URL}/email/search/all`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify({
      ...searchData,
      folder: sanitizeFolderPath(searchData.folder),
      full_headers: true,
    }),
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to search emails');
  }

  return await res.json();
};
