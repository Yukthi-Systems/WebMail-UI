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

// src/state/search.ts
import { atom } from 'jotai';
import type { SimplifiedEmail } from '../utils/email';

export interface SearchState {
  isActive: boolean;
  query: string;
  filters: {
    from?: string;
    to?: string;
    hasWords?: string; // Comma-separated values for body search
    hasWordsExclude?: string; // Words to exclude from body search
    sizeOperator?: 'greater' | 'less';
    sizeValue?: string;
    sizeUnit?: 'KB' | 'MB' | 'GB';
    dateRangeSince?: string; // Date input for "since when"
    dateRangeOn?: string; // Date input for "on date"
    searchIn?: string;
    hasAttachment?: boolean | null; // true = has, false = doesn't have, null = both
  };
  // Formatted results that EmailList expects
  results: {
    emails: SimplifiedEmail[];
    total_count: number;
    total_pages: number;
  } | null;
}

export const searchStateAtom = atom<SearchState>({
  isActive: false,
  query: '',
  filters: {},
  results: null,
});
