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

import React, { useState, useEffect, useRef } from 'react';
import { FaMagnifyingGlass, FaFilter, FaXmark, FaSpinner } from 'react-icons/fa6';
import { useAtom, useAtomValue } from 'jotai';
import { useParams } from '@tanstack/react-router';
import { searchStateAtom } from '../../../../state/search';
import { useSearchEmails } from '../../../../hooks/useSearch';
import { userSettingsAtom } from '../../../../state/settings';
import type { SearchRequest } from '../../../../api/search';
import FilterBadgeComponent from './FilterBadge';
import AdvancedFilters from './AdvancedFilters';
import type { FilterState, SearchDropdownProps } from './types';
import { convertToBytes, getActiveFilterBadges, hasActiveFilters, mapComparator } from './utils';
import { useDebounce } from 'use-debounce';
import { csrfTokenAtom, isVersionTwoUserAtom } from '../../../../state/auth';
import { API_URL } from '../../../../api/config';

const MAX_VISIBLE_BADGES = 2;

// Contact search suggestion — a different, narrower shape than utils/contact.ts's
// Contact (that one's for the bulk contact CRUD endpoints; this is /contacts/search).
interface ContactSuggestion {
  contact_id: string | number;
  name?: string;
  email: string;
}

const SearchDropdown: React.FC<SearchDropdownProps> = ({ className = '' }) => {
  const { folder: currentFolder } = useParams({ strict: false });
  const [searchState, setSearchState] = useAtom(searchStateAtom);
  const userSettings = useAtomValue(userSettingsAtom);
  const PER_PAGE = userSettings?.email?.mails_per_page || 50;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  // ── always-current searchState for use inside useEffect closures ──
  const searchStateRef = useRef(searchState);
  useEffect(() => {
    searchStateRef.current = searchState;
  }, [searchState]);

  const initialFilters: FilterState = {
    from: '',
    to: '',
    sizeOperator: 'greater',
    sizeValue: '',
    sizeUnit: 'MB',
    dateRangeSince: '',
    dateRangeOn: '',
    searchIn: currentFolder || 'INBOX',
  };

  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchRequestPayload, setSearchRequestPayload] = useState<SearchRequest | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const isSent = currentFolder?.toLowerCase() === 'sent';
  const isDrafts = currentFolder?.toLowerCase() === 'drafts';
  const isSentOrDrafts = isSent || isDrafts;
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  // Suggestions state
  const emailValue = isSentOrDrafts ? filters.to || '' : filters.from || '';
  const [debouncedEmailValue] = useDebounce(emailValue, 300);
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const csrfToken = useAtomValue(csrfTokenAtom);
  const isVersionTwoUser = useAtomValue(isVersionTwoUserAtom);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Fetch email suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedEmailValue && debouncedEmailValue.length > 2) {
        try {
          const response1 = await fetch(
            `${API_URL}/contacts/search?partial_email=${debouncedEmailValue}`,
            {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
              },
            }
          );
          const data1 = await response1.json();
          const contacts1 = data1?.contacts || [];

          let contacts2 = [];
          if (isVersionTwoUser && contacts1.length < 15) {
            const response2 = await fetch(
              `${API_URL}/contacts/search/v2?partial_email=${debouncedEmailValue}`,
              {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
              }
            );
            const data2 = await response2.json();
            contacts2 = data2?.contacts || [];
          }

          const seenEmails = new Set<string>();
          const mergedContacts: ContactSuggestion[] = [];

          contacts1.forEach((c: ContactSuggestion) => {
            if (c.email) {
              const emailLower = c.email.toLowerCase();
              if (!seenEmails.has(emailLower)) {
                seenEmails.add(emailLower);
                mergedContacts.push(c);
              }
            }
          });

          contacts2.forEach((c: ContactSuggestion) => {
            if (c.email) {
              const emailLower = c.email.toLowerCase();
              if (!seenEmails.has(emailLower)) {
                seenEmails.add(emailLower);
                mergedContacts.push(c);
              }
            }
          });

          setSuggestions(mergedContacts);
          setActiveIndex(-1);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setActiveIndex(-1);
      }
    };
    fetchSuggestions();
  }, [debouncedEmailValue, csrfToken, isVersionTwoUser]);

  const handleSelectSuggestion = (email: string) => {
    const newFilters = {
      ...filters,
      ...(isSentOrDrafts ? { to: email } : { from: email }),
    };
    setFilters(newFilters);
    setSuggestions([]);
    setActiveIndex(-1);
    setIsEmailFocused(false);
    emailInputRef.current?.focus();

    // Instantly trigger search!
    setSearchRequestPayload(buildRequest(query, newFilters));
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (suggestions.length > 0 && activeIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[activeIndex];
        if (selected) {
          handleSelectSuggestion(selected.email);
        }
      } else {
        handleManualSearch();
      }
    } else if (e.key === 'Escape') {
      setIsEmailFocused(false);
      setActiveIndex(-1);
    }
  };

  // Helper to build request
  const buildRequest = (q: string, f: FilterState): SearchRequest => ({
    folder: f.searchIn || currentFolder || 'INBOX',
    from_: f.from || undefined,
    to: f.to || undefined,
    subject: q.trim() || undefined,
    size: f.sizeValue
      ? {
          comparator: mapComparator(f.sizeOperator),
          size: convertToBytes(f.sizeValue, f.sizeUnit) || 0,
        }
      : undefined,
    date_since: f.dateRangeSince || undefined,
    date_on: f.dateRangeOn || undefined,
    limit: PER_PAGE,
    page: 1,
  });

  const { data: searchData, isFetching } = useSearchEmails(
    searchRequestPayload!,
    !!searchRequestPayload
  );

  // Sync results to global state
  useEffect(() => {
    if (searchData?.data && !isFetching) {
      setSearchState({
        isActive: true,
        query: query.trim(),
        filters: { ...filters },
        results: {
          emails: Array.isArray(searchData.data.data) ? searchData.data.data : [],
          total_count: searchData.data.total_count,
          total_pages: Math.ceil(searchData.data.total_count / PER_PAGE),
        },
      });
      setShowFilters(false);
    }
  }, [searchData, isFetching, setSearchState]);

  useEffect(() => {
    if (!searchState.isActive) {
      setQuery('');
      setFilters({ ...initialFilters, searchIn: currentFolder || 'INBOX' });
      setSearchRequestPayload(null);
      setResetKey((prev) => prev + 1);
    }
  }, [searchState.isActive, currentFolder]);

  const handleManualSearch = async () => {
    if (!query.trim() && !hasActiveFilters(filters, currentFolder)) {
      handleClearAll();
      return;
    }
    setSearchRequestPayload(buildRequest(query, filters));
  };

  const handleClearAll = () => {
    setQuery('');
    setFilters({ ...initialFilters, searchIn: currentFolder || 'INBOX' });
    setSearchRequestPayload(null);
    setSearchState({ isActive: false, query: '', filters: {}, results: null });
    setResetKey((prev) => prev + 1);
  };

  const handleResetFiltersOnly = () => {
    setFilters({ ...initialFilters, searchIn: currentFolder || 'INBOX' });
    setResetKey((prev) => prev + 1);
  };

  // ── passed to getActiveFilterBadges so it can build each badge's onRemove.
  //    Same shape as setFilters (accepts value OR updater) so composite-key badges
  //    (size, dateRange, …) clear the correct underlying fields.
  //    Also re-triggers the search when a badge is removed while a search is live.
  const handleBadgeFilterChange = (
    newFiltersOrUpdater: FilterState | ((prev: FilterState) => FilterState)
  ) => {
    const newFilters =
      typeof newFiltersOrUpdater === 'function'
        ? newFiltersOrUpdater(filters)
        : newFiltersOrUpdater;

    setFilters(newFilters);

    if (searchState.isActive) {
      if (!query.trim() && !hasActiveFilters(newFilters, currentFolder)) {
        handleClearAll();
      } else {
        setSearchRequestPayload(buildRequest(query, newFilters));
      }
    }
  };

  // ── revert local query + filters back to whatever was last actually applied ──
  const revertToApplied = () => {
    if (searchState.isActive) {
      setQuery(searchState.query || '');
      setFilters(
        (searchState.filters as FilterState) || {
          ...initialFilters,
          searchIn: currentFolder || 'INBOX',
        }
      );
    } else {
      // Keep query intact when closing advanced search panel
    }
  };

  const handleToggleFilters = () => {
    if (showFilters) {
      revertToApplied(); // closing → drop anything unapplied
    }
    setShowFilters(!showFilters);
  };

  // Handle Outside Clicks
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowFilters(false);

        // always revert — uses the ref so we see the latest searchState
        const current = searchStateRef.current;
        if (current.isActive) {
          setQuery(current.query || '');
          setFilters(
            (current.filters as FilterState) || {
              ...initialFilters,
              searchIn: currentFolder || 'INBOX',
            }
          );
        } else {
          // Keep query intact when closing advanced search panel
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentFolder]); // only currentFolder — searchState read via ref, not closure

  // Clean state when folder changes
  useEffect(() => {
    handleClearAll();
  }, [currentFolder]);

  // ── badge slicing ──
  const activeBadges = getActiveFilterBadges(
    filters,
    currentFolder,
    handleBadgeFilterChange
  ).filter((badge) => badge.key !== 'from' && badge.key !== 'to');
  const visibleBadges = activeBadges.slice(0, MAX_VISIBLE_BADGES);
  const hiddenCount = activeBadges.length - MAX_VISIBLE_BADGES;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`relative flex items-center gap-1.5 w-full min-h-[42px] px-4 py-1.5 pl-10 pr-10 bg-[var(--color-surface)] border border-[var(--gray-7)] rounded-lg text-sm text-[var(--gray-12)] cursor-text transition-all ${isOpen ? 'ring-2 ring-[var(--accent-8)]' : ''}`}
        onClick={(e) => {
          // Only focus if the target is not inside a badge / button / removable area / input field
          if (
            e.target instanceof Element &&
            !e.target.closest('button') &&
            !e.target.closest('[data-badge-remove]') &&
            e.target.tagName !== 'INPUT'
          ) {
            setIsOpen(true);

            // Contextually focus From/To or Subject based on click coordinates relative to the divider
            if (dividerRef.current) {
              const dividerLeft = dividerRef.current.getBoundingClientRect().left;
              if (e.clientX > dividerLeft) {
                emailInputRef.current?.focus();
                return;
              }
            }
            inputRef.current?.focus();
          }
        }}
      >
        {/* ── left icon ── */}
        {isFetching ? (
          <FaSpinner className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-9)] animate-spin" />
        ) : (
          <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-10)]" />
        )}

        {/* ── visible badges ── */}
        {visibleBadges.map((badge) => (
          <FilterBadgeComponent
            key={badge.key}
            label={badge.label}
            value={badge.value}
            onRemove={badge.onRemove}
          />
        ))}

        {/* ── overflow pill ── */}
        {hiddenCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--gray-3)] text-[var(--gray-11)] whitespace-nowrap shrink-0">
            +{hiddenCount}
          </span>
        )}

        {/* ── split inputs ── */}
        <div className="relative flex-1 min-w-0 flex items-center mr-0 gap-2">
          {/* Subject input */}
          <div className="flex-[2] min-w-0 flex items-center relative pr-6">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              onFocus={() => setIsOpen(true)}
              placeholder={activeBadges.length === 0 ? `Search subject...` : ''}
              className="w-full bg-transparent border-none outline-none text-sm text-[var(--gray-12)] placeholder-[var(--gray-8)] "
            />
            {query && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery('');
                  setSearchRequestPayload(buildRequest('', filters));
                }}
                className="absolute right-1 text-[var(--gray-10)] hover:text-[var(--gray-12)] p-0.5"
              >
                <FaXmark size={12} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div
            ref={dividerRef}
            className="h-5 w-[1px] bg-[var(--gray-6)] self-center flex-shrink-0"
          />

          {/* From/To Input wrapper */}
          <div className="relative flex-1 min-w-[120px] flex items-center pr-8">
            <input
              ref={emailInputRef}
              type="text"
              value={isSentOrDrafts ? filters.to || '' : filters.from || ''}
              onChange={(e) => {
                const val = e.target.value;
                setFilters((prev) => ({
                  ...prev,
                  ...(isSentOrDrafts ? { to: val } : { from: val }),
                }));
              }}
              onKeyDown={handleEmailInputKeyDown}
              onFocus={() => {
                setIsOpen(true);
                setIsEmailFocused(true);
              }}
              onBlur={() => {
                setTimeout(() => setIsEmailFocused(false), 200);
              }}
              placeholder={isSentOrDrafts ? 'To...' : 'From...'}
              className="w-full bg-transparent border-none outline-none text-sm text-[var(--gray-12)] placeholder-[var(--gray-8)] pr-4"
            />

            {/* Small From/To clear button */}
            {(isSentOrDrafts ? filters.to : filters.from) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newFilters = {
                    ...filters,
                    ...(isSentOrDrafts ? { to: '' } : { from: '' }),
                  };
                  setFilters(newFilters);
                  if (!query.trim() && !hasActiveFilters(newFilters, currentFolder)) {
                    handleClearAll();
                  } else {
                    setSearchRequestPayload(buildRequest(query, newFilters));
                  }
                }}
                className="absolute right-1.5 text-[var(--gray-10)] hover:text-[var(--gray-12)] p-0.5"
              >
                <FaXmark size={12} />
              </button>
            )}

            {/* Suggestions dropdown */}
            {isEmailFocused && suggestions.length > 0 && (
              <div className="absolute top-[calc(100%+12px)] right-0 w-80 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl z-[10000] max-h-60 overflow-y-auto py-1">
                {suggestions.map((suggestion, idx) => {
                  const isKeyboardFocused = activeIndex === idx;
                  return (
                    <div
                      key={suggestion.contact_id}
                      onClick={() => handleSelectSuggestion(suggestion.email)}
                      className={`flex flex-col px-3 py-1.5 cursor-pointer transition-colors ${
                        isKeyboardFocused
                          ? 'bg-[var(--accent-4)] text-[var(--accent-11)]'
                          : 'hover:bg-[var(--gray-3)]'
                      }`}
                    >
                      {suggestion.name && (
                        <span className="text-xs font-medium text-[var(--gray-12)] truncate">
                          {suggestion.name}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--gray-10)] truncate">
                        {suggestion.email}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── filter toggle ── */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
            handleToggleFilters();
          }}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${showFilters ? 'text-[var(--accent-11)] bg-[var(--accent-3)]' : 'text-[var(--gray-10)] hover:bg-[var(--gray-4)]'}`}
        >
          <FaFilter size={12} />
        </button>
      </div>

      {/* ── filter panel ── */}
      {isOpen && showFilters && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl z-[9999]"
          onClick={(e) => e.stopPropagation()}
        >
          <AdvancedFilters
            key={resetKey}
            filters={filters}
            setFilters={setFilters}
            onSearch={handleManualSearch}
            onReset={handleResetFiltersOnly}
            onClose={() => {
              revertToApplied();
              setShowFilters(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
