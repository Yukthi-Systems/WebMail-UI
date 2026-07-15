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

import {
  FaInbox,
  FaTrash,
  FaPaperPlane,
  FaFlag,
  FaArchive,
  FaFolder,
  FaExclamationTriangle, // Import this for error icon
  FaRedo, // Import for retry button
} from 'react-icons/fa';

interface EmailEmptyStateProps {
  folder?: string;
  error?: Error | null; // Add error prop
  onRetry?: () => void; // Add retry callback
}

const EmailEmptyState = ({ folder = 'INBOX', error, onRetry }: EmailEmptyStateProps) => {
  const getEmptyStateContent = () => {
    // 1. Priority Check: If there is an error, return error content immediately
    if (error) {
      return {
        icon: <FaExclamationTriangle className="text-5xl text-[var(--red-9)]" />,
        title: 'Unable to load emails',
        description: error.message || "We couldn't fetch your emails at this time.",
        tip: 'Please check your internet connection and try again.',
        isError: true,
      };
    }

    const folderLower = folder.toLowerCase();

    if (folderLower === 'inbox') {
      return {
        icon: <FaInbox className="text-5xl text-[var(--gray-9)]" />,
        title: 'Your inbox is empty',
        description: 'All caught up! No new messages to display.',
        tip: 'New emails will appear here when they arrive.',
      };
    }

    if (folderLower === 'sent') {
      return {
        icon: <FaPaperPlane className="text-5xl text-[var(--blue-9)]" />,
        title: 'No sent emails',
        description: "You haven't sent any emails yet.",
        tip: 'Compose and send your first email to see it here.',
      };
    }

    if (folderLower === 'trash' || folderLower === 'deleted') {
      return {
        icon: <FaTrash className="text-5xl text-[var(--red-9)]" />,
        title: 'Trash is empty',
        description: 'No deleted emails in trash.',
        tip: 'Deleted emails will be stored here for 30 days.',
      };
    }

    if (folderLower === 'drafts') {
      return {
        icon: <FaFolder className="text-5xl text-[var(--orange-9)]" />,
        title: 'No draft emails',
        description: "You don't have any saved drafts.",
        tip: 'Start composing an email and save it as draft.',
      };
    }

    if (folderLower === 'spam' || folderLower === 'junk') {
      return {
        icon: <FaFlag className="text-5xl text-[var(--amber-9)]" />,
        title: 'No spam emails',
        description: 'Your spam folder is clean.',
        tip: 'Suspected spam emails will appear here.',
      };
    }

    if (folderLower === 'archive' || folderLower === 'archived') {
      return {
        icon: <FaArchive className="text-5xl text-[var(--purple-9)]" />,
        title: 'No archived emails',
        description: "You haven't archived any emails yet.",
        tip: 'Archive important emails to keep your inbox organized.',
      };
    }

    // Default for custom folders
    return {
      icon: <FaFolder className="text-5xl text-[var(--gray-9)]" />,
      title: 'Folder is empty',
      description: `No emails in ${folder}.`,
      tip: 'Move or filter emails to this folder to organize them.',
    };
  };

  const content = getEmptyStateContent();

  return (
    <div className="flex items-center justify-center h-full min-h-[400px] p-8 bg-[var(--gray-1)]">
      <div className="text-center max-w-md space-y-6">
        {/* Icon Container */}
        <div className="flex justify-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center ${
              // Change background color slightly for error state
              (content as any).isError ? 'bg-[var(--red-3)]' : 'bg-[var(--gray-3)]'
            }`}
          >
            {content.icon}
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-[var(--gray-12)]">{content.title}</h2>
          <p className="text-base text-[var(--gray-11)] leading-relaxed">{content.description}</p>
        </div>

        {/* Retry Button (Only for errors) */}
        {(content as any).isError && onRetry && (
          <div className="pt-2">
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-md font-medium transition-colors"
            >
              <FaRedo className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}

        {/* Tip (Only show if NOT an error, or if you want to keep it) */}
        {!(content as any).isError && (
          <div className="pt-4">
            <div className="inline-flex items-start gap-2 px-4 py-3 bg-[var(--accent-3)] border border-[var(--accent-6)] rounded-lg">
              <svg
                className="w-5 h-5 text-[var(--accent-11)] flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-[var(--accent-11)] text-left">{content.tip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailEmptyState;
