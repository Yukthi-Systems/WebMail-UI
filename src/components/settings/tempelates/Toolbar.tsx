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

import React from 'react';
import { FaEye, FaEyeSlash, FaSearch } from 'react-icons/fa';
import type { FilterType } from '.';

interface TemplateToolbarProps {
  searchTerm: string;
  filterType: FilterType;
  onSearchChange: (value: string) => void;
  onFilterChange: (type: FilterType) => void;
}

const TemplateToolbar: React.FC<TemplateToolbarProps> = ({
  searchTerm,
  filterType,
  onSearchChange,
  onFilterChange,
}) => {
  return (
    <div className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gray-9)]" />
          <input
            type="text"
            placeholder="Search templates by name..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onFilterChange('private')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'private'
                ? 'bg-[var(--accent-9)] text-white shadow-sm'
                : 'bg-[var(--gray-1)] text-[var(--gray-11)] hover:bg-[var(--gray-3)] border border-[var(--gray-5)]'
            }`}
          >
            <FaEyeSlash className="w-3 h-3" />
            Personal
          </button>
          <button
            onClick={() => onFilterChange('public')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
              filterType === 'public'
                ? 'bg-[var(--accent-9)] text-white shadow-sm'
                : 'bg-[var(--gray-1)] text-[var(--gray-11)] hover:bg-[var(--gray-3)] border border-[var(--gray-5)]'
            }`}
          >
            <FaEye className="w-3 h-3" />
            Shared
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateToolbar;
