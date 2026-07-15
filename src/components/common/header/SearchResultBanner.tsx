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

// src/components/common/header/SearchResultBanner.tsx
import { FaXmark, FaMagnifyingGlass } from 'react-icons/fa6';
import { useAtom } from 'jotai';
import { searchStateAtom } from '../../../state/search';
import { format } from 'date-fns';

interface SearchResultsBannerProps {
  resultCount: number;
}

const SearchResultsBanner: React.FC<SearchResultsBannerProps> = ({ resultCount }) => {
  const [searchState, setSearchState] = useAtom(searchStateAtom);

  const handleClearSearch = () => {
    setSearchState({
      isActive: false,
      query: '',
      filters: {},
      results: null,
    });
  };

  const getActiveFiltersText = () => {
    const parts: string[] = [];

    if (searchState.query) {
      parts.push(`subject: "${searchState.query}"`);
    }

    if (searchState.filters.from) {
      parts.push(`from: ${searchState.filters.from}`);
    }

    if (searchState.filters.to) {
      parts.push(`to: ${searchState.filters.to}`);
    }

    if (searchState.filters.sizeValue) {
      const operator = searchState.filters.sizeOperator === 'greater' ? '>' : '<';
      parts.push(
        `size: ${operator}${searchState.filters.sizeValue}${searchState.filters.sizeUnit || 'MB'}`
      );
    }

    if (searchState.filters.dateRangeSince) {
      try {
        const formattedDate = format(new Date(searchState.filters.dateRangeSince), 'MMM dd, yyyy');
        parts.push(`since: ${formattedDate}`);
      } catch {
        parts.push(`since: ${searchState.filters.dateRangeSince}`);
      }
    }

    if (searchState.filters.dateRangeOn) {
      try {
        const formattedDate = format(new Date(searchState.filters.dateRangeOn), 'MMM dd, yyyy');
        parts.push(`on: ${formattedDate}`);
      } catch {
        parts.push(`on: ${searchState.filters.dateRangeOn}`);
      }
    }

    if (searchState.filters.searchIn && searchState.filters.searchIn !== 'INBOX') {
      const folderName =
        searchState.filters.searchIn.split('.').pop() || searchState.filters.searchIn;
      parts.push(`in: ${folderName}`);
    }

    return parts.join(' · ');
  };

  return (
    <div className="bg-[var(--accent-3)] border-b border-[var(--accent-6)] px-4 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FaMagnifyingGlass className="text-[var(--accent-11)] flex-shrink-0" size={16} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--accent-12)] flex-shrink-0">
                {resultCount} {resultCount === 1 ? 'result' : 'results'}
              </span>
              {getActiveFiltersText() && (
                <>
                  <span className="text-[var(--accent-10)] flex-shrink-0">·</span>
                  <span className="text-sm text-[var(--accent-11)] truncate min-w-0">
                    {getActiveFiltersText()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleClearSearch}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--accent-11)] hover:text-[var(--accent-12)] hover:bg-[var(--accent-4)] rounded-md transition-colors flex-shrink-0"
        >
          <FaXmark size={14} />
          <span>Clear search</span>
        </button>
      </div>
    </div>
  );
};

export default SearchResultsBanner;
