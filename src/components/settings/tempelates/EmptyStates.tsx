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
import { FaPlus, FaSearch } from 'react-icons/fa';

interface EmptyStateProps {
  hasFilters: boolean;
  onCreateTemplate: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters, onCreateTemplate }) => {
  return (
    <div className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-xl p-12 text-center">
      <div className="w-16 h-16 bg-[var(--gray-4)] rounded-full flex items-center justify-center mx-auto mb-4">
        <FaSearch className="w-6 h-6 text-[var(--gray-9)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--gray-12)] mb-2">
        {hasFilters ? 'No templates found' : 'No templates yet'}
      </h3>
      <p className="text-sm text-[var(--gray-11)] mb-4">
        {hasFilters
          ? 'Try adjusting your search or filters'
          : 'Create your first email template to get started'}
      </p>
      {!hasFilters && (
        <button
          onClick={onCreateTemplate}
          className="px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white text-sm font-semibold rounded-lg transition-all inline-flex items-center gap-2"
        >
          <FaPlus className="w-3 h-3" />
          Create Template
        </button>
      )}
    </div>
  );
};

export default EmptyState;
