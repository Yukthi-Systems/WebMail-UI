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

// src/api/grammar.ts
import { csrfTokenAtom } from '../state/auth';
import { webmailStore } from '../store';
import { API_URL } from './config';
import { fetchWithAuth } from './fetchWrapper';

export interface GrammarMatch {
  message: string;
  replacements: string[];
  /** Start of the issue in the text that was sent (UTF-16 code units). */
  offset: number;
  error_length: number;
  context: string;
  sentence: string;
  category: string; // e.g. "TYPOS", "GRAMMAR"
  rule_id: string;
  rule_issue_type: string; // e.g. "misspelling", "grammar"
  offset_in_context: number;
}

export interface GrammarCheckResponse {
  original: string;
  // Not reliable (misses many cases) — apply `matches` instead
  corrected: string;
  matches: GrammarMatch[];
  match_count: number;
}


export const checkSpellGrammar = async (
  text: string,
  signal?: AbortSignal
): Promise<GrammarCheckResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/email/check-spell-grammar`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify({ text }),
    signal,
  });
  return res.json();
};
