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

import React, { useState } from 'react';
import { FaHardDrive } from 'react-icons/fa6';

interface FolderQuota {
  total_kb: number;
  total_mb: number;
  used_kb: number;
  used_mb: number;
  used_percent: number;
}

interface StorageQuotaProps {
  quota?: FolderQuota | null; // Made optional to handle no-data states
  isCollapsed: boolean;
}

const StorageQuota: React.FC<StorageQuotaProps> = ({ quota, isCollapsed }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Helper to safely format numbers or return '?'
  const safeFormat = (value?: number, detailed = false) => {
    if (value === undefined || value === null || isNaN(value)) return '?';
    return `${(value / 1024).toFixed(detailed ? 2 : 1)} GB`;
  };

  const safePercent = quota?.used_percent ?? 0;
  const displayPercent =
    quota?.used_percent !== undefined ? `${quota.used_percent.toFixed(0)}%` : '?%';

  const getProgressColor = () => {
    if (!quota) return 'bg-[var(--gray-6)]'; // Neutral color for unknown state
    if (quota.used_percent >= 90) return 'bg-[var(--red-9)]';
    if (quota.used_percent >= 75) return 'bg-[var(--orange-9)]';
    if (quota.used_percent >= 50) return 'bg-[var(--yellow-9)]';
    return 'bg-[var(--blue-9)]';
  };

  const getIconColor = () => {
    if (!quota) return 'text-[var(--gray-9)]';
    if (quota.used_percent >= 90) return 'text-[var(--red-11)]';
    if (quota.used_percent >= 75) return 'text-[var(--orange-11)]';
    if (quota.used_percent >= 50) return 'text-[var(--yellow-11)]';
    return 'text-[var(--blue-11)]';
  };

  if (isCollapsed) return null;

  return (
    <div className="px-3 pb-2">
      <div
        className="flex items-center gap-2 relative cursor-pointer hover:bg-[var(--gray-2)] rounded px-1 py-0.5 -mx-1 transition-colors duration-150"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <FaHardDrive size={12} className={getIconColor()} />

        <div className="flex-1 h-1 bg-[var(--gray-4)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${Math.min(safePercent, 100)}%` }}
          />
        </div>

        <span className="text-xs text-[var(--gray-11)] whitespace-nowrap">
          {displayPercent} of {safeFormat(quota?.total_mb)} used
        </span>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 bg-[var(--gray-1)] border border-[var(--gray-6)] rounded-lg shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <FaHardDrive size={14} className="text-[var(--gray-11)]" />
              <span className="text-sm font-medium text-[var(--gray-12)]">Storage Details</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--gray-11)]">Used:</span>
                <span className="text-[var(--gray-12)] font-medium">
                  {safeFormat(quota?.used_mb, true)} ({quota?.used_kb?.toLocaleString() ?? '?'} KB)
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-[var(--gray-11)]">Total:</span>
                <span className="text-[var(--gray-12)] font-medium">
                  {safeFormat(quota?.total_mb, true)} ({quota?.total_kb?.toLocaleString() ?? '?'}{' '}
                  KB)
                </span>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-[var(--gray-11)]">Available:</span>
                <span className="text-[var(--gray-12)] font-medium">
                  {quota ? safeFormat(quota.total_mb - quota.used_mb, true) : '?'}
                </span>
              </div>

              <div className="w-full h-2 bg-[var(--gray-4)] rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${Math.min(safePercent, 100)}%` }}
                />
              </div>

              <div className="text-xs text-[var(--gray-11)] text-center">
                {quota?.used_percent !== undefined ? `${quota.used_percent.toFixed(2)}%` : '?'} used
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageQuota;
