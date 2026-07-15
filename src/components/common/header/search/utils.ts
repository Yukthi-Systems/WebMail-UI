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

// components/email/search/utils.ts
import type { FilterState, FilterBadge } from './types';

/** Convert size value to bytes based on unit. */
export const convertToBytes = (value: string, unit: 'KB' | 'MB' | 'GB'): number => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 0;

  switch (unit) {
    case 'KB':
      return numValue * 1024;
    case 'MB':
      return numValue * 1024 * 1024;
    case 'GB':
      return numValue * 1024 * 1024 * 1024;
    default:
      return numValue;
  }
};

/** Map frontend size operator to API comparator. */
export const mapComparator = (operator: 'greater' | 'less'): '>' | '<' => {
  return operator === 'greater' ? '>' : '<';
};

/**
 * Check if any filters are currently active (excluding searchIn if it matches
 * currentFolder)
 */
export const hasActiveFilters = (filters: FilterState, currentFolder?: string): boolean => {
  const { from, to, sizeValue, dateRangeSince, dateRangeOn, searchIn } = filters;

  // Check if searchIn is different from current folder
  const hasSearchInFilter = searchIn && searchIn !== (currentFolder || 'INBOX');

  return !!(from || to || sizeValue || dateRangeSince || dateRangeOn || hasSearchInFilter);
};

const formatDateBadge = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

/** Generate filter badges for active filters. */
export const getActiveFilterBadges = (
  filters: FilterState,
  currentFolder: string | undefined,
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
): FilterBadge[] => {
  const badges: FilterBadge[] = [];

  // From filter
  if (filters.from) {
    badges.push({
      key: 'from',
      label: 'From',
      value: filters.from,
      onRemove: () => setFilters((prev) => ({ ...prev, from: '' })),
    });
  }

  // To filter
  if (filters.to) {
    badges.push({
      key: 'to',
      label: 'To',
      value: filters.to,
      onRemove: () => setFilters((prev) => ({ ...prev, to: '' })),
    });
  }

  // Size filter
  if (filters.sizeValue) {
    badges.push({
      key: 'size',
      label: 'Size',
      value: `${filters.sizeOperator === 'greater' ? '>' : '<'} ${filters.sizeValue} ${filters.sizeUnit}`,
      onRemove: () => setFilters((prev) => ({ ...prev, sizeValue: '' })),
    });
  }

  // Date since filter
  if (filters.dateRangeSince) {
    badges.push({
      key: 'dateSince',
      label: 'Since',
      value: formatDateBadge(filters.dateRangeSince),
      onRemove: () => setFilters((prev) => ({ ...prev, dateRangeSince: '' })),
    });
  }

  // Date on filter
  if (filters.dateRangeOn) {
    badges.push({
      key: 'dateOn',
      label: 'On',
      value: formatDateBadge(filters.dateRangeOn),
      onRemove: () => setFilters((prev) => ({ ...prev, dateRangeOn: '' })),
    });
  }

  // Search in folder (only show if different from current folder)
  if (filters.searchIn && filters.searchIn !== (currentFolder || 'INBOX')) {
    badges.push({
      key: 'searchIn',
      label: 'In',
      value: filters.searchIn,
      onRemove: () => setFilters((prev) => ({ ...prev, searchIn: currentFolder || 'INBOX' })),
    });
  }

  return badges;
};

/** Format date for display. */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

/** Format size for display. */
export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};
