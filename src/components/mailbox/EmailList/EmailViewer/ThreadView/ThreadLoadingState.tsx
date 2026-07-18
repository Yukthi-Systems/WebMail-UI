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

// src/components/email/ThreadLoadingState.tsx
import { FaEnvelope } from 'react-icons/fa';

const ThreadLoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-[var(--gray-6)] border-t-[var(--accent-9)] rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <FaEnvelope className="w-6 h-6 text-[var(--accent-9)]" />
        </div>
      </div>
      <div className="mt-6 text-center">
        <h3 className="text-lg font-semibold text-[var(--gray-12)] mb-2">
          Loading conversation thread
        </h3>
        <p className="text-sm text-[var(--gray-11)] max-w-md">
          Fetching all messages in this conversation from different folders...
        </p>
      </div>
    </div>
  );
};

export default ThreadLoadingState;
