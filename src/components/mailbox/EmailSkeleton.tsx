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

const EmailLoadingSkeleton = () => {
  return (
    <div className="w-full bg-[var(--gray-1)]">
      {[...Array(8)].map((_, index) => (
        <div
          key={index}
          className={`
              px-2 md:px-2 py-3 md:py-2 
              border-l-0 border-r-0 bg-[var(--gray-1)]
              ${index === 0 ? 'border-t-0 rounded-t-md' : 'border-t border-[var(--gray-5)]'}
              ${index === 7 ? 'border-b border-[var(--gray-5)] rounded-b-md' : 'border-b-0'}
            `}
        >
          {/* Mobile Layout Skeleton */}
          <div className="block md:hidden">
            <div className="flex items-start gap-3">
              {/* Avatar Skeleton */}
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-[var(--gray-4)] rounded-full animate-pulse" />
              </div>

              {/* Content Skeleton */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Sender and Date Row */}
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-32 bg-[var(--gray-4)] rounded animate-pulse" />
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 bg-[var(--gray-3)] rounded animate-pulse" />
                    <div className="h-3 w-3 bg-[var(--gray-3)] rounded animate-pulse" />
                    <div className="h-3 w-12 bg-[var(--gray-3)] rounded animate-pulse" />
                  </div>
                </div>

                {/* Subject Line Skeleton */}
                <div className="h-3 w-full bg-[var(--gray-4)] rounded animate-pulse" />

                {/* Preview Text Skeleton */}
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-[var(--gray-3)] rounded animate-pulse" />
                  <div className="h-2.5 w-4/5 bg-[var(--gray-3)] rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout Skeleton */}
          <div className="hidden md:block">
            <div className="flex items-center px-2 gap-2 min-h-[32px]">
              {/* Checkbox Skeleton */}
              <div className="flex-shrink-0">
                <div className="w-4 h-4 bg-[var(--gray-4)] rounded animate-pulse" />
              </div>

              {/* Sender with Avatar Skeleton */}
              <div className="flex items-center gap-2 w-[140px] flex-shrink-0 ml-4">
                <div className="w-7 h-7 bg-[var(--gray-4)] rounded-full animate-pulse" />
                <div className="h-3.5 flex-1 bg-[var(--gray-4)] rounded animate-pulse" />
              </div>

              {/* Subject & Preview Skeleton */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-3.5 w-3/4 bg-[var(--gray-4)] rounded animate-pulse" />
                <div className="h-2.5 w-full bg-[var(--gray-3)] rounded animate-pulse" />
              </div>

              {/* Date Skeleton */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="h-2.5 w-12 bg-[var(--gray-3)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}

      <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
    </div>
  );
};

export default EmailLoadingSkeleton;
