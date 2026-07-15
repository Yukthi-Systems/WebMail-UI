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

// components/email/search/types.ts
export interface FilterState {
  from: string;
  to: string;
  sizeOperator: 'greater' | 'less';
  sizeValue: string;
  sizeUnit: 'KB' | 'MB' | 'GB';
  dateRangeSince: string;
  dateRangeOn: string;
  searchIn: string;
}

export interface SearchDropdownProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string, filters: FilterState) => void;
  onEmailSelect?: (email: any) => void;
}

export interface FilterBadge {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}
