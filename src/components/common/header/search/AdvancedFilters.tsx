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

// components/email/search/AdvancedFilters.tsx
import React from 'react';
import CustomSelect from './CustomSelect';
import FolderSelect from './FolderSelect';
import type { FilterState } from './types';

interface AdvancedFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onSearch: () => void;
  onClose: () => void;
  onReset: () => void;
}

const handleEnter = (onSearch: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') onSearch();
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  setFilters,
  onSearch,
  onReset,
}) => {
  const sizeOperatorOptions = [
    { value: 'greater', label: 'greater than' },
    { value: 'less', label: 'less than' },
  ];

  const sizeUnitOptions = [
    { value: 'KB', label: 'KB' },
    { value: 'MB', label: 'MB' },
    { value: 'GB', label: 'GB' },
  ];

  return (
    <div className="p-3 space-y-3 bg-[var(--gray-1)] rounded-lg max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between sticky top-0 bg-[var(--gray-1)] z-10 pb-2">
        <h3 className="text-sm font-medium text-[var(--gray-12)]">Advanced Search</h3>
      </div>

      {/* From and To */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--gray-11)] mb-1">From</label>
          <input
            type="text"
            value={filters.from}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
            onKeyDown={handleEnter(onSearch)}
            className="w-full px-2 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--gray-6)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-8)] focus:border-[var(--accent-8)]"
            placeholder="Sender email"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--gray-11)] mb-1">To</label>
          <input
            type="text"
            value={filters.to}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
            onKeyDown={handleEnter(onSearch)}
            className="w-full px-2 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--gray-6)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-8)] focus:border-[var(--accent-8)]"
            placeholder="Recipient email"
          />
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="block text-xs text-[var(--gray-11)] mb-1">Size</label>
        <div className="flex gap-2">
          <CustomSelect
            value={filters.sizeOperator}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, sizeOperator: val as 'greater' | 'less' }))
            }
            options={sizeOperatorOptions}
            placeholder="Op"
            className="flex-1"
          />
          <input
            type="number"
            value={filters.sizeValue}
            onChange={(e) => setFilters((prev) => ({ ...prev, sizeValue: e.target.value }))}
            onKeyDown={handleEnter(onSearch)}
            className="w-16 px-2 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--gray-6)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-8)] focus:border-[var(--accent-8)]"
            placeholder="Size"
          />
          <CustomSelect
            value={filters.sizeUnit}
            onChange={(val) =>
              setFilters((prev) => ({ ...prev, sizeUnit: val as 'KB' | 'MB' | 'GB' }))
            }
            options={sizeUnitOptions}
            placeholder="Unit"
            className="w-16"
          />
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--gray-11)] mb-1">Since date</label>
          <input
            type="date"
            value={filters.dateRangeSince}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateRangeSince: e.target.value }))}
            onKeyDown={handleEnter(onSearch)}
            className="w-full px-2 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--gray-6)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-8)] focus:border-[var(--accent-8)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--gray-11)] mb-1">On date</label>
          <input
            type="date"
            value={filters.dateRangeOn}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateRangeOn: e.target.value }))}
            onKeyDown={handleEnter(onSearch)}
            className="w-full px-2 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--gray-6)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-8)] focus:border-[var(--accent-8)]"
          />
        </div>
      </div>

      {/* Search In Folder */}
      <div>
        <label className="block text-xs text-[var(--gray-11)] mb-1">Search in</label>
        <FolderSelect
          value={filters.searchIn}
          onChange={(val) => setFilters((prev) => ({ ...prev, searchIn: val }))}
          placeholder="Folder"
          className="w-full"
        />
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onReset();
          }}
          className="px-3 py-1 text-xs text-[var(--accent-11)] hover:bg-[var(--accent-3)] rounded"
        >
          Reset Filters
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="px-4 py-1.5 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white text-xs font-medium rounded transition-colors"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilters;
