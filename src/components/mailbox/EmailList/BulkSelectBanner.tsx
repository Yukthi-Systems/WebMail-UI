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

interface BulkSelectBannerProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}

/** Above the list: offers to select everything, or to clear that selection */
const BulkSelectBanner = ({ message, actionLabel, onAction, disabled }: BulkSelectBannerProps) => (
  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-sm text-center bg-[var(--accent-3)] text-[var(--gray-12)] border-b border-[var(--gray-5)]">
    <span>{message}</span>
    <button
      type="button"
      onClick={onAction}
      disabled={disabled}
      className="font-medium text-[var(--accent-11)] hover:underline disabled:opacity-60"
    >
      {actionLabel}
    </button>
  </div>
);

export default BulkSelectBanner;
