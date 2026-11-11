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

import { useState, useSyncExternalStore } from 'react';
import { FiRefreshCw, FiX } from 'react-icons/fi';
import { isUpdateAvailable, subscribeToUpdate } from '../../utils/appUpdate';

/**
 * Shown when a new version of WebMail was deployed while the app was open.
 * Stays until the user reloads or dismisses it (a reload is not forced, so an
 * email being written is not lost).
 */
export const UpdateBanner = () => {
  const available = useSyncExternalStore(subscribeToUpdate, isUpdateAvailable);
  const [dismissed, setDismissed] = useState(false);

  if (!available || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100vw-32px)] max-w-md flex items-center gap-3 rounded-xl border border-[var(--gray-6)] bg-[var(--gray-1)] px-4 py-3 shadow-lg"
    >
      <FiRefreshCw className="shrink-0 text-[var(--accent-9)]" size={18} />
      <span className="flex-1 text-sm text-[var(--gray-12)]">
        A new version of WebMail is available.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-lg bg-[var(--accent-9)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-10)]"
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-[var(--gray-11)] hover:bg-[var(--gray-3)]"
      >
        <FiX size={16} />
      </button>
    </div>
  );
};
