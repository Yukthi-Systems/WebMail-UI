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

import { useEffect, useCallback, useRef } from 'react';

// 1. Actions: Functions that happen when a key is pressed
export interface KeyboardActions {
  onNavigate?: (index: number) => void;
  onOpenEmail?: (index: number) => void;
  onSelectEmail?: (index: number) => void;
  onDelete?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onMarkAsFlag?: () => void;
  onMarkAsRead?: () => void;
  onMarkAsUnread?: () => void;
  onMarkAsUnFlag?: () => void;
  onCompose?: () => void;
  onRefresh?: () => void;
  onSearch?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onFocusFolders?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onCloseViewer?: () => void;
}

// 2. State: Data needed to make decisions (e.g., "Am I at the end of the list?")
export interface KeyboardState {
  emailCount?: number;
  currentIndex?: number;
  isComposerOpen?: boolean;
  isEmailViewerOpen?: boolean;
}

// Combine them, but mark everything as Partial (Optional)
type KeyboardNavigationOptions = KeyboardActions & KeyboardState;

export const useKeyboardNavigation = (options: KeyboardNavigationOptions) => {
  const {
    // State Defaults (safe fallbacks)
    emailCount = 0,
    currentIndex = 0,
    isComposerOpen = false,
    isEmailViewerOpen = false,

    // Actions
    onNavigate,
    onOpenEmail,
    onSelectEmail,
    onDelete,
    onReply,
    onReplyAll,
    onForward,
    onMarkAsFlag,
    onMarkAsRead,
    onMarkAsUnread,
    onMarkAsUnFlag,
    onCompose,
    onRefresh,
    onSearch,
    onSelectAll,
    onDeselectAll,
    onFocusFolders,
    onNextPage,
    onPrevPage,
    onCloseViewer,
  } = options;

  const lastActionTimeRef = useRef<number>(0);
  const debounceDelay = 100;
  const allSelectedRef = useRef<boolean>(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // --- 1. Global Guards ---
      if (isComposerOpen) return;

      const target = event.target as HTMLElement;
      const isInputField =
        ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;

      const isFolderFocused = target.closest('[data-folder-item]');

      // Allow Escape to work in inputs (to close things), otherwise block inputs
      if (isInputField && event.key !== 'Escape') return;

      const now = Date.now();
      if (now - lastActionTimeRef.current < debounceDelay) return;
      lastActionTimeRef.current = now;

      // --- 2. Modifier Guard ---
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      // --- 3. Key Map ---
      switch (event.key.toLowerCase()) {
        // Navigation (j / k / arrows)
        case 'j':
        case 'arrowdown':
          if (onNavigate && !isFolderFocused && (!hasModifier || event.key === 'ArrowDown')) {
            event.preventDefault();
            if (currentIndex < emailCount - 1) {
              onNavigate(currentIndex + 1);
            } else if (onNextPage) {
              onNextPage();
            }
          }
          break;

        case 'k':
        case 'arrowup':
          if (onNavigate && !isFolderFocused && (!hasModifier || event.key === 'ArrowUp')) {
            event.preventDefault();
            if (currentIndex > 0) {
              onNavigate(currentIndex - 1);
            } else if (onPrevPage) {
              onPrevPage();
            }
          }
          break;

        case 'o':
        case 'enter':
          if (onOpenEmail && !isInputField && !isFolderFocused && !hasModifier) {
            event.preventDefault();
            onOpenEmail(currentIndex);
          }
          break;

        case 'escape':
          if (onCloseViewer && isEmailViewerOpen) {
            event.preventDefault();
            onCloseViewer();
          }
          break;

        // Selection
        case 'x':
          if (onSelectEmail && !isInputField && !isFolderFocused && !hasModifier) {
            event.preventDefault();
            onSelectEmail(currentIndex);
          }
          break;

        case '*':
          if (!isInputField && event.shiftKey && !isFolderFocused) {
            event.preventDefault();
            if (allSelectedRef.current) {
              if (onDeselectAll) onDeselectAll();
              allSelectedRef.current = false;
            } else {
              if (onSelectAll) onSelectAll();
              allSelectedRef.current = true;
            }
          }
          break;

        // --- Actions ---

        // Compose (c)
        case 'c':
          if (onCompose && !isInputField && !isFolderFocused && !hasModifier) {
            event.preventDefault();
            onCompose();
          }
          break;

        // Reply / Refresh (r)
        case 'r':
          if (!isInputField && !isFolderFocused) {
            if ((event.ctrlKey || event.metaKey) && onRefresh) {
              event.preventDefault();
              onRefresh();
            } else if (isEmailViewerOpen && !hasModifier && onReply) {
              event.preventDefault();
              onReply();
            }
          }
          break;

        case 'a':
          if (
            onReplyAll &&
            !isInputField &&
            !isFolderFocused &&
            isEmailViewerOpen &&
            !hasModifier
          ) {
            event.preventDefault();
            onReplyAll();
          }
          break;

        case 'f':
          if (onForward && !isInputField && !isFolderFocused && isEmailViewerOpen && !hasModifier) {
            event.preventDefault();
            onForward();
          }
          break;

        case '#':
        case 'delete':
        case 'backspace':
          if (onDelete && !isInputField && !isFolderFocused && !hasModifier) {
            event.preventDefault();
            onDelete();
          }
          break;

        case 'e':
          if (onMarkAsFlag && !isInputField && !isFolderFocused) {
            event.preventDefault();
            onMarkAsFlag();
          }
          break;

        case 's':
          if (onMarkAsUnFlag && !isInputField && !isFolderFocused) {
            event.preventDefault();
            onMarkAsUnFlag();
          }
          break;

        // Mark Read/Unread
        case 'i':
          if (onMarkAsRead && !isInputField && !isFolderFocused && event.shiftKey) {
            event.preventDefault();
            onMarkAsRead();
          }
          break;

        case 'u':
          if (onMarkAsUnread && !isInputField && !isFolderFocused && event.shiftKey) {
            event.preventDefault();
            onMarkAsUnread();
          }
          break;

        // Search (/)
        case '/':
          if (onSearch && !isInputField && !isFolderFocused && !hasModifier) {
            event.preventDefault();
            onSearch();
          }
          break;

        // Go to folders (g)
        case 'g':
          if (onFocusFolders && !isInputField && event.shiftKey && !isFolderFocused) {
            event.preventDefault();
            onFocusFolders();
          }
          break;

        // Paging
        case 'pagedown':
        case 'n':
          if (onNextPage && !isInputField && !isFolderFocused) {
            event.preventDefault();
            onNextPage();
          }
          break;

        case 'pageup':
        case 'p':
          if (onPrevPage && !isInputField && !isFolderFocused) {
            event.preventDefault();
            onPrevPage();
          }
          break;

        case 'arrowleft':
          if (!isInputField && !isFolderFocused) {
            if (isEmailViewerOpen && onCloseViewer) {
              event.preventDefault();
              onCloseViewer();
            } else if (onFocusFolders) {
              event.preventDefault();
              onFocusFolders();
            }
          }
          break;

        case 'arrowright':
          if (onOpenEmail && !isInputField && !isEmailViewerOpen && !isFolderFocused) {
            event.preventDefault();
            onOpenEmail(currentIndex);
          }
          break;
      }
    },
    [
      // Dependencies
      emailCount,
      currentIndex,
      isComposerOpen,
      isEmailViewerOpen,
      onNavigate,
      onOpenEmail,
      onSelectEmail,
      onDelete,
      onReply,
      onReplyAll,
      onForward,
      onMarkAsFlag,
      onMarkAsRead,
      onMarkAsUnread,
      onMarkAsUnFlag,
      onCompose,
      onRefresh,
      onSearch,
      onSelectAll,
      onDeselectAll,
      onFocusFolders,
      onNextPage,
      onPrevPage,
      onCloseViewer,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
