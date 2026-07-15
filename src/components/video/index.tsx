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

import React, { useEffect } from 'react';
import { FiVideo, FiExternalLink, FiArrowLeft } from 'react-icons/fi';

const Video = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Attempt to open in a new tab
      // Note: This may be blocked by browser popup blockers since it's not user-initiated
      const newWindow = window.open('https://meet.mail25.info', '_blank');

      // Optional: Check if blocked and inform user
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.warn('Popup blocked. User must click manually.');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[400px] rounded-lg">
      <div className="text-center space-y-4 p-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-3)] flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-9)] border-t-transparent animate-spin opacity-50"></div>
            <FiVideo size={32} className="text-[var(--accent-11)] relative z-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-[var(--gray-12)]">Opening Video Portal...</h3>
          <p className="text-sm text-[var(--gray-11)] max-w-md">
            We are opening the video meeting in a new tab.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-[var(--accent-11)]">
          <FiExternalLink size={14} />
          <a
            href="https://meet.mail25.info"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Click here if the new tab doesn't open automatically
          </a>
        </div>

        {/* Go Back Button */}
        <div className="pt-2">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-md transition-colors"
          >
            <FiArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Video;
