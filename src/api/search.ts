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
import { normalizeEmails, threadToRow, type ApiThread } from '../utils/threads';
import type { EmailSortBy, EmailSortOrder } from '../state/emailListView';

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
  // Without sort_by, result pages come back in sequence-number order
  sort_by?: EmailSortBy;
  sort_order?: EmailSortOrder;
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
    /** Conversation search: emails in the matched conversations */
    total_messages?: number;
  };
}

const searchHeaders = () => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  return {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
};

const searchBody = (searchData: SearchRequest) =>
  JSON.stringify({
    sort_by: 'date',
    sort_order: 'desc',
    ...searchData,
    folder: sanitizeFolderPath(searchData.folder),
    full_headers: true,
  });

export const searchEmails = async (searchData: SearchRequest): Promise<SearchApiResponse> => {
  const res = await fetchWithAuth(`${API_URL}/email/search/all`, {
    method: 'POST',
    credentials: 'include',
    headers: searchHeaders(),
    body: searchBody(searchData),
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to search emails');
  }

  const body = (await res.json()) as SearchApiResponse;
  // id := UID (results are emails of searchData.folder)
  const found = normalizeEmails(
    (body?.data?.data ?? []) as unknown as Record<string, unknown>[],
    searchData.folder
  );
  return { ...body, data: { ...body.data, data: found as unknown as SimplifiedEmail[] } };
};

/**
 * Search in conversation view: the conversations with at least one matching
 * email (thread.matchedEmailIds), paginated by conversation. Same response
 * shape as searchEmails, one row per conversation.
 */
export const searchThreads = async (
  searchData: SearchRequest,
  { filterBy = 'all', sentFolder }: { filterBy?: string; sentFolder?: string } = {}
): Promise<SearchApiResponse> => {
  const params = new URLSearchParams({ filter_by: filterBy });
  if (sentFolder) params.append('sent_folder', sentFolder.replace(/^"(.*)"$/, '$1'));

  const res = await fetchWithAuth(`${API_URL}/email/search/threads?${params}`, {
    method: 'POST',
    credentials: 'include',
    headers: searchHeaders(),
    body: searchBody(searchData),
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to search conversations');
  }

  const body = await res.json();
  const threads = (body?.data?.threads ?? []) as ApiThread[];
  return {
    data: {
      data: threads.map(
        (thread) => threadToRow(thread, searchData.folder) as unknown as SimplifiedEmail
      ),
      total_count: body?.data?.total_count ?? 0,
      total_messages: body?.data?.total_messages ?? 0,
    },
  };
};
