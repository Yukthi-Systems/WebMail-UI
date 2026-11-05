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

import { useQuery } from '@tanstack/react-query';
import { searchEmails, searchThreads, type SearchRequest } from '../api/search';

/**
 * Search. With `conversations` (conversation view) the results are the
 * conversations containing a match, one row each (POST /email/search/threads).
 */
export const useSearchEmails = (
  searchData: SearchRequest,
  enabled: boolean = true,
  {
    conversations = false,
    filterBy = 'all',
    sentFolder,
  }: { conversations?: boolean; filterBy?: string; sentFolder?: string } = {}
) => {
  return useQuery({
    queryKey: conversations
      ? ['search-emails', 'threads', searchData, filterBy]
      : ['search-emails', searchData],
    queryFn: () =>
      conversations
        ? searchThreads(searchData, { filterBy, sentFolder })
        : searchEmails(searchData),
    enabled:
      enabled &&
      (!!searchData.from_ ||
        !!searchData.to ||
        !!searchData.subject ||
        !!searchData.has_words?.length ||
        !!searchData.does_not_have_words?.length ||
        !!searchData.folder),
    staleTime: 30 * 1000,
    retry: false,

    retryOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};
