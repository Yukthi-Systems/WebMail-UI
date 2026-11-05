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

import type { ReactNode, TouchEventHandler, MouseEventHandler } from 'react';
import { FaPaperPlane, FaDeleteLeft, FaFloppyDisk, FaPaperclip } from 'react-icons/fa6';
import { formatFileSize, MAX_INDIVIDUAL_FILE_SIZE } from './attachmentUtils';

/** Covers the composer while files are dragged over it */
export const ComposerDropOverlay = () => (
  <div className="absolute inset-0 z-[9999] bg-[var(--gray-2)]/90 backdrop-blur-sm border-[3px] border-dashed border-[var(--accent-9)] rounded-xl flex items-center justify-center pointer-events-none">
    <div className="bg-[var(--color-panel-solid)] px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
      <div className="p-4 bg-[var(--accent-3)] text-[var(--accent-11)] rounded-full">
        <FaPaperclip size={36} />
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-[var(--gray-12)]">Drop files here to attach</p>
        <p className="text-sm text-[var(--gray-10)] mt-1">
          Maximum {formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} per file
        </p>
      </div>
    </div>
  </div>
);

interface ComposerFooterProps {
  /** Opens the file picker; no Attach button without it */
  onAttach?: () => void;
  /** Template, priority, read receipt */
  options?: ReactNode;
  /** Lets the options strip scroll sideways by touch without pressing what's under the finger */
  optionsStripProps?: {
    onTouchStart: TouchEventHandler;
    onTouchMove: TouchEventHandler;
    onClickCapture: MouseEventHandler;
  };
  onCancel: () => void;
  cancelDisabled?: boolean;
  draft?: {
    onClick: () => void;
    disabled?: boolean;
    /** Looks unavailable but stays clickable, to explain why (text typed but not added yet) */
    dimmed?: boolean;
    isSaving?: boolean;
    title?: string;
    quotaExceeded?: boolean;
  };
  send?: { onClick: () => void; disabled?: boolean; isSending?: boolean };
}

const quietButton =
  'flex items-center gap-2 px-3 min-h-9 rounded text-sm whitespace-nowrap touch-manipulation transition-colors text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)]';

/** One bar for everything that isn't writing: what to add on the left, what to do on the right */
export const ComposerFooter = ({
  onAttach,
  options,
  optionsStripProps,
  onCancel,
  cancelDisabled,
  draft,
  send,
}: ComposerFooterProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full min-w-0">
    <div
      className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar overscroll-x-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
      {...optionsStripProps}
    >
      {onAttach && (
        <button type="button" onClick={onAttach} className={`${quietButton} shrink-0`} title="Attach files">
          <FaPaperclip />
          <span>Attach</span>
        </button>
      )}
      {options}
    </div>

    <div className="flex items-center justify-end gap-1 shrink-0">
      <button
        type="button"
        onClick={onCancel}
        className={quietButton}
        disabled={cancelDisabled}
        aria-label="Cancel compose"
      >
        <FaDeleteLeft />
        <span>Cancel</span>
      </button>

      {draft && (
        <button
          type="button"
          onClick={draft.onClick}
          className={`${quietButton} ${draft.dimmed || draft.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={draft.title}
          disabled={draft.disabled}
          aria-label="Save draft"
        >
          <FaFloppyDisk className={draft.isSaving ? 'animate-pulse' : undefined} />
          <span>
            {draft.isSaving ? 'Saving...' : `Save Draft${draft.quotaExceeded ? ' (Disabled)' : ''}`}
          </span>
        </button>
      )}

      {send && (
        <button
          type="button"
          onClick={send.onClick}
          className="flex items-center gap-2 ml-1 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium px-4 min-h-9 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap touch-manipulation shadow-sm"
          disabled={send.disabled || send.isSending}
          aria-label="Send email"
        >
          <FaPaperPlane className={send.isSending ? 'animate-pulse' : undefined} />
          <span>{send.isSending ? 'Sending...' : 'Send'}</span>
        </button>
      )}
    </div>
  </div>
);
