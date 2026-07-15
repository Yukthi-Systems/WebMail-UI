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

// src/hooks/useEmailListState.ts
import { useState, useEffect, useCallback } from 'react';
import type { Email } from '../api/mailbox';
import { useAtom, useAtomValue } from 'jotai';
import { selectedEmailAtom } from '../state/emailAddress';
import { flagAtom } from '../state/flags';
import { userSettingsAtom } from '../state/settings';
import { userDetailsAtom } from '../state/userDetails';
import { MOBILE_WIDTH } from '../constants/constant';

interface UseEmailListStateProps {
  folder?: string;
  layout?: string;
}

export const useEmailListState = ({ folder, layout }: UseEmailListStateProps) => {
  const [checkedEmails, setCheckedEmails] = useState<number[]>([]);
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [, setViewingEmailFlag] = useAtom(flagAtom);
  const [selectedEmail, setSelectedEmail] = useAtom(selectedEmailAtom);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [splitView, setSplitView] = useState(() => {
    if (window.innerWidth < MOBILE_WIDTH) return false;
    return layout !== 'compact';
  });
  const [viewMode, setViewMode] = useState<'left' | 'down'>(() => {
    return layout === 'vertical-split' ? 'down' : 'left';
  });

  const userSettings = useAtomValue(userSettingsAtom);
  const userDetails = useAtomValue(userDetailsAtom);

  // Reset checked emails when folder changes
  useEffect(() => {
    setCheckedEmails([]);
    setLastSelectedIndex(null);
  }, [folder]);

  // Handle selection change with shift key support
  const handleSelectionChange = useCallback(
    (
      emailId: string,
      isSelected: boolean,
      index?: number,
      shiftKey?: boolean,
      emailArray?: Email[] // Make emailArray optional
    ) => {
      const idNum = Number(emailId);

      setCheckedEmails((prev) => {
        let newSelection: number[];

        if (shiftKey && lastSelectedIndex !== null && index !== undefined && emailArray) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);

          // Get all email IDs in the range
          const rangeIds = emailArray.slice(start, end + 1).map((email: Email) => Number(email.id));
          newSelection = [...new Set([...prev, ...rangeIds])];
        } else {
          if (isSelected) {
            newSelection = prev.includes(idNum) ? prev : [...prev, idNum];
          } else {
            newSelection = prev.filter((id) => id !== idNum);
          }
        }

        if (newSelection.length === 0) {
          setIsSelectionMode(false);
          setLastSelectedIndex(null);
        } else if (index !== undefined) {
          setLastSelectedIndex(index);
        }

        return newSelection;
      });
    },
    [lastSelectedIndex]
  );

  const handleSelectAll = useCallback((emailArray: Email[]) => {
    setCheckedEmails(emailArray.map((email) => Number(email.id)));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setCheckedEmails([]);
    setIsSelectionMode(false);
    setLastSelectedIndex(null);
  }, []);

  const handleEnterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const handleEmailClick = useCallback(
    (email: Email, markAsReadCallback: (email: Email, emailIds: number[]) => void) => {
      setIsSelectionMode(false);
      setIsKeyboardNavigating(false);
      setViewingEmail(email);

      // Call the mark as read callback (which will check if email is unread first)
      markAsReadCallback(email, [Number(email.id)]);

      if (window.innerWidth >= MOBILE_WIDTH && layout !== 'compact') {
        setSplitView(true);
      }
    },
    [layout]
  );

  const handleBackToList = useCallback(() => {
    setViewingEmail(null);
    setSplitView(false);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < MOBILE_WIDTH) {
        setSplitView(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update layout based on settings
  useEffect(() => {
    if (layout === 'compact') {
      setSplitView(false);
    } else if (layout === 'vertical-split') {
      setViewMode('down');
      if (window.innerWidth >= MOBILE_WIDTH) setSplitView(true);
    } else {
      setViewMode('left');
      if (window.innerWidth >= MOBILE_WIDTH) setSplitView(true);
    }
  }, [layout]);

  return {
    checkedEmails,
    viewingEmail,
    selectedEmail,
    isSelectionMode,
    currentEmailIndex,
    isKeyboardNavigating,
    splitView,
    viewMode,
    userSettings,
    userDetails,

    // Setters
    setCheckedEmails,
    setViewingEmail,
    setViewingEmailFlag,
    setSelectedEmail,
    setIsKeyboardNavigating,
    setCurrentEmailIndex,
    setSplitView,
    setViewMode,

    handleSelectionChange,
    handleSelectAll,
    handleDeselectAll,
    handleEnterSelectionMode,
    handleEmailClick,
    handleBackToList,
  };
};
