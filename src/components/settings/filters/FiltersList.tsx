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
import { BsPlus, BsPencil, BsTrash, BsSlashCircle, BsExclamationTriangle } from 'react-icons/bs';
import type { SieveFilter } from '../../../api/sieve';
import * as Switch from '@radix-ui/react-switch';

interface FiltersListProps {
  filters: {
    name: string;
    enabled: boolean;
  }[];
  onCreateFilter: () => void;
  onEditFilter: (name: string) => void;
  onDeleteFilter: (name: string) => void;
  onToggleFilter: (name: string, enabled: boolean) => void;
  // New props for Disable All functionality
  onDisableAll: () => void;
  isLoading?: boolean;
  hasScript?: boolean;
  isGlobalProcessing?: boolean;
  isActiveSet?: boolean;
  onActivateSet?: () => void;
}

export const FiltersList: React.FC<FiltersListProps> = ({
  filters,
  onCreateFilter,
  onEditFilter,
  onDeleteFilter,
  onToggleFilter,
  onDisableAll,
  isLoading = false,
  hasScript = true,
  isGlobalProcessing = false,
  isActiveSet = true,
  onActivateSet,
}) => {
  if (!hasScript) {
    return (
      <div className="text-center py-12 px-4 bg-[var(--gray-3)] rounded-lg">
        <p className="text-[var(--gray-11)] mb-2">Please create or select a filter-set first</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatFilterName = (name: string): string => {
    if (!name) return '';
    return name.replace(/[\[\]"]/g, '');
  };

  const isVacationFilter = (name: string) => name.includes('[vacation]');

  const visibleFilters = filters.filter((f) => !isVacationFilter(f.name));
  const hasEnabledFilters = visibleFilters.some((f) => f.enabled);

  return (
    <div className="space-y-4 min-h-[60vh] ">
      {hasScript && !isActiveSet && (
        <div className="p-3 bg-[var(--amber-3)] border border-[var(--amber-7)] rounded-lg flex items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <BsExclamationTriangle
              className="text-[var(--amber-10)] mt-0.5 flex-shrink-0"
              size={16}
            />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-[var(--amber-12)] font-semibold leading-none">
                Inactive Filter Set
              </p>
              <p className="text-[11px] sm:text-xs text-[var(--amber-11)] mt-1 leading-normal">
                Filters in this set will not run until you activate this set.
              </p>
            </div>
          </div>
          {onActivateSet && (
            <button
              onClick={onActivateSet}
              className="px-2.5 py-1.5 text-xs font-semibold bg-[var(--amber-9)] hover:bg-[var(--amber-10)] text-white rounded-md transition-colors shrink-0 shadow-sm"
            >
              Activate Set
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--gray-12)]">Filters</h2>

        <div className="flex items-center gap-2">
          {/* Disable All Button - Only show if there are enabled filters */}
          {hasEnabledFilters && (
            <button
              onClick={onDisableAll}
              disabled={isGlobalProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Disable all active filters"
            >
              {isGlobalProcessing ? (
                <div className="w-4 h-4 border-2 border-[var(--gray-11)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <BsSlashCircle className="w-4 h-4" />
              )}
              {isGlobalProcessing ? 'Processing...' : 'Disable All'}
            </button>
          )}

          <button
            onClick={onCreateFilter}
            disabled={isGlobalProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-md transition-colors disabled:opacity-50"
          >
            <BsPlus className="w-4 h-4" />
            New Filter
          </button>
        </div>
      </div>

      {visibleFilters.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[var(--gray-3)] rounded-lg">
          <p className="text-[var(--gray-11)] mb-3">No filters found</p>
          <button
            onClick={onCreateFilter}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-md transition-colors"
          >
            <BsPlus className="w-4 h-4" />
            Create First Filter
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-[66vh] overflow-y-auto">
          {visibleFilters.map((filter) => (
            <div
              key={filter.name}
              className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg p-3 hover:border-[var(--gray-6)] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 ">
                    <h3 className="text-base font-medium text-[var(--gray-12)] truncate">
                      {formatFilterName(filter.name)}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Switch.Root
                    checked={filter.enabled}
                    disabled={isGlobalProcessing}
                    onCheckedChange={(checked) => onToggleFilter(filter.name, checked)}
                    className="
                      relative w-10 h-5 rounded-full
                      bg-[var(--gray-6)]
                      data-[state=checked]:bg-[var(--accent-9)]
                      transition-colors
                      focus:outline-none
                      disabled:opacity-50
                    "
                  >
                    <Switch.Thumb
                      className="
                        block w-4 h-4 bg-white rounded-full
                        shadow
                        translate-x-0.5
                        data-[state=checked]:translate-x-5
                        transition-transform
                      "
                    />
                  </Switch.Root>

                  <button
                    onClick={() => onEditFilter(filter.name)}
                    disabled={isGlobalProcessing}
                    className="p-2 text-[var(--accent-11)] hover:bg-[var(--accent-3)] rounded-md transition-colors disabled:opacity-30"
                    title="Edit filter"
                  >
                    <BsPencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteFilter(filter.name)}
                    disabled={isGlobalProcessing}
                    className="p-2 text-[var(--red-11)] hover:bg-[var(--red-3)] rounded-md transition-colors disabled:opacity-30"
                    title="Delete filter"
                  >
                    <BsTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
