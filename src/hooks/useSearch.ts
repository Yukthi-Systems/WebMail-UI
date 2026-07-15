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
import { searchEmails, type SearchRequest } from '../api/search';

export const useSearchEmails = (searchData: SearchRequest, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['search-emails', searchData],
    queryFn: () => searchEmails(searchData),
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
