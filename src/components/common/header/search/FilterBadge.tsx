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
import { FaXmark } from 'react-icons/fa6';

interface FilterBadgeProps {
  label: string;
  value: string;
  onRemove: () => void;
}

const FilterBadge: React.FC<FilterBadgeProps> = ({ label, value, onRemove }) => (
  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--accent-4)] text-[var(--accent-11)] rounded text-xs font-medium border border-[var(--accent-6)] hover:bg-[var(--accent-5)] transition-colors flex-shrink-0">
    <span className="text-[var(--accent-11)] opacity-80 text-[10px]">{label}:</span>
    <span className="text-[var(--accent-12)] text-[10px] max-w-[80px] truncate">{value}</span>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="ml-0.5 p-0.5 hover:bg-[var(--accent-6)] rounded transition-colors"
      title="Remove filter"
    >
      <FaXmark size={8} className="text-[var(--accent-11)]" />
    </button>
  </div>
);

export default FilterBadge;
