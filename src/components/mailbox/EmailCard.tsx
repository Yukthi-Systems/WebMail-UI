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

import { useState, useRef, useEffect } from 'react';
import { FaPaperclip, FaTrash, FaFlag, FaEnvelope } from 'react-icons/fa';
import { MdDriveFileMoveOutline, MdMarkEmailRead, MdMarkEmailUnread } from 'react-icons/md';
import { decodeWords } from 'postal-mime';
import type { SimplifiedEmail } from './dummydata';
import BIMIAvatar from '../common/BimiAvatar';
import { Checkbox, ContextMenu } from '@radix-ui/themes';
import { parseEmail } from '../../utils/emailPerser';
import { useUserTimezone } from '../../hooks/useTimezone';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../state/settings';
import EmailHoverCard from './EmailHoverCard';
import { useEmailPrefetch } from '../../hooks/useEmailRaw';
import { getMessageId, splitAddressList } from '../../utils/emailUtils';
import { useQueryClient } from '@tanstack/react-query';
import { useEmailParser } from '../../hooks/useEmailParser';
import { isFolderThreadEnabled, shouldApplyThreading } from '../../utils/emailListUtils';

interface EmailCardProps {
  email: SimplifiedEmail;
  onEmailClick?: (email: SimplifiedEmail) => void;
  isSelected?: boolean;
  onSelectionChange?: (
    emailId: string,
    isSelected: boolean,
    index?: number,
    shiftKey?: boolean
  ) => void;
  index: number;
  total: number;
  isSelectionMode?: boolean;
  onEnterSelectionMode?: () => void;
  onMarkAsRead?: (emailId: string, isRead: boolean) => void;
  onDelete?: (emailId: string) => void;
  folder?: string;
  isActive?: boolean;
  onDragStart?: (emailIds: number[]) => void;
  onDragEnd?: () => void;
  checkedEmails?: number[];
  isKeyboardFocused?: boolean;
  id?: string;
  showSelection?: boolean;
  myEmail?: string;
  onMoveToFolder?: (emailId: string) => void;
  onToggleFlag?: (emailId: string, currentFlagged: boolean) => void;
  viewingEmail?: string;
}

// Outside the component, at module level
let activeTooltipCleanup: (() => void) | null = null;

const EmailCard = ({
  email,
  onEmailClick,
  isSelected = false,
  onSelectionChange,
  index,
  total,
  isSelectionMode = false,
  onEnterSelectionMode,
  onMarkAsRead,
  onDelete,
  folder = 'INBOX',
  isActive = false,
  onDragStart,
  onDragEnd,
  checkedEmails = [],
  id,
  isKeyboardFocused,
  showSelection = true,
  myEmail = '',
  onMoveToFolder,
  onToggleFlag,
  viewingEmail,
}: EmailCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'bottom' | 'top'>('bottom');
  const tooltipTriggerRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<any>(null);
  const touchStartTimeRef = useRef<number>(0);
  const dragImageRef = useRef<HTMLDivElement | null>(null);
  const touchStartYRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchMovedRef = useRef<boolean>(false);
  const [isWaitingForTooltip, setIsWaitingForTooltip] = useState(false);
  const userSettings = useAtomValue(userSettingsAtom);
  const showRecipientInfo = userSettings?.email?.show_recipient ?? true;
  const showHoverActions = viewingEmail
    ? (userSettings?.email.show_quick_hover_actions ?? true)
    : true;

  // Separate timers for show vs hide — avoids conflicts
  const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { formatEmailDate, formatUserDateNice } = useUserTimezone();
  const { prefetchEmailContent } = useEmailPrefetch();
  const queryClient = useQueryClient();

  const [prefetchedRawEmail, setPrefetchedRawEmail] = useState<string | undefined>(undefined);
  const messageId = getMessageId(email) || '';

  const { parsedEmail: hoverParsedEmail } = useEmailParser({
    rawEmail: prefetchedRawEmail,
    key: `hover-${email.id}`,
  });

  const senderEmailString = folder === 'Sent' ? email.To : email.From;
  const { name: senderName, email: senderEmail } = parseEmail(senderEmailString);

  // Parse recipients for display
  const parseRecipients = (recipientString: string) => {
    if (!recipientString) return [];
    const unfolded = recipientString.replace(/\r?\n[\t ]+/g, ' ');
    return splitAddressList(unfolded).map((r) => {
      const parsed = parseEmail(r);
      const recipientEmail = parsed.email.toLowerCase();
      const userEmail = myEmail.toLowerCase();
      if (recipientEmail === userEmail) {
        return { name: 'me', email: recipientEmail, isMe: true };
      }
      return { name: parsed.name || parsed.email, email: parsed.email, isMe: false };
    });
  };

  const toRecipients = parseRecipients(email.To);
  const ccRecipients = email.Cc ? parseRecipients(email.Cc) : [];
  const bccRecipients: any[] = [];

  // Status Checks
  const emailSeen = email?.FLAGS?.includes('\\Seen') || false;
  const isFlagged = email?.FLAGS?.includes('\\Flagged') || false;
  const hasAttachments = (email.attachmentCount ?? 0) > 0;
  const formattedDate = formatEmailDate(email.Date);
  const fullDate = formatUserDateNice(email.Date);

  // Thread indicators — only shown when threading is active in settings
  const threadedView = userSettings?.email?.mail_thead_view || 'all threads';
  const folderThreadView = userSettings?.folders;
  const isFolderThread = isFolderThreadEnabled(folderThreadView, folder, folder);
  const threadingActive = shouldApplyThreading(threadedView, isFolderThread, folder);

  const isThread = !!(email as any)['Thread-View'];
  const threadCount = ((email as any)['Thread-Emails-Count'] as number) || 1;
  const threadUnreadCount = ((email as any)['Thread-Unread-Count'] as number) || 0;
  const threadHasUnread = isThread && threadUnreadCount > 0;
  const showThreadPill = threadingActive && isThread && threadCount > 1;

  // Calculate tooltip position when it becomes visible
  useEffect(() => {
    if (showEmailTooltip && tooltipTriggerRef.current) {
      const rect = tooltipTriggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setTooltipPosition(spaceBelow < 200 ? 'top' : 'bottom');
    }
  }, [showEmailTooltip]);

  // Optional: poll for cache data after tooltip is shown (handles first-hover cache miss)
  useEffect(() => {
    if (!showEmailTooltip || prefetchedRawEmail) return;

    const pollInterval = setInterval(() => {
      const data = queryClient.getQueryData<string>([
        'email',
        'raw',
        messageId || email.id.toString(),
        folder,
      ]);
      if (data) {
        setPrefetchedRawEmail(data);
        clearInterval(pollInterval);
      }
    }, 300);

    return () => clearInterval(pollInterval);
  }, [showEmailTooltip, prefetchedRawEmail]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      [prefetchTimerRef, showTooltipTimerRef, hideTooltipTimerRef].forEach((ref) => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    // Cancel any pending hide so tooltip stays when moving within card
    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsWaitingForTooltip(false);
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    if (showTooltipTimerRef.current) {
      clearTimeout(showTooltipTimerRef.current);
      showTooltipTimerRef.current = null;
    }
    hideTooltipTimerRef.current = setTimeout(() => {
      setShowEmailTooltip(false);
      setPrefetchedRawEmail(undefined);
      hideTooltipTimerRef.current = null;
    }, 150);
  };

  // Sender area — THIS is where tooltip triggering lives now
  const handleSenderAreaMouseEnter = () => {
    // Clear any other card's tooltip immediately
    if (activeTooltipCleanup) {
      activeTooltipCleanup();
      activeTooltipCleanup = null;
    }

    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }

    setIsWaitingForTooltip(true);

    prefetchTimerRef.current = setTimeout(() => {
      if (email?.id && folder) prefetchEmailContent(email.id.toString(), folder, messageId);
    }, 2150);

    showTooltipTimerRef.current = setTimeout(() => {
      setIsWaitingForTooltip(false);
      const cachedData = queryClient.getQueryData<string>([
        'email',
        'raw',
        messageId || email.id.toString(),
        folder,
      ]);
      if (cachedData) setPrefetchedRawEmail(cachedData);
      setShowEmailTooltip(true);

      // Register this card's cleanup as the active one
      activeTooltipCleanup = () => {
        setShowEmailTooltip(false);
        setIsWaitingForTooltip(false);
        setPrefetchedRawEmail(undefined);
      };
    }, 3000);
  };

  const handleSenderAreaMouseLeave = () => {
    setIsWaitingForTooltip(false);
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    if (showTooltipTimerRef.current) {
      clearTimeout(showTooltipTimerRef.current);
      showTooltipTimerRef.current = null;
    }
    hideTooltipTimerRef.current = setTimeout(() => {
      setShowEmailTooltip(false);
      setPrefetchedRawEmail(undefined);
      activeTooltipCleanup = null; // ← clear singleton
      hideTooltipTimerRef.current = null;
    }, 150);
  };

  // Called by EmailHoverCard's own onMouseEnter/onMouseLeave props
  const handleTooltipCardMouseEnter = () => {
    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
    setShowEmailTooltip(true);
  };

  const handleTooltipCardMouseLeave = () => {
    hideTooltipTimerRef.current = setTimeout(() => {
      setShowEmailTooltip(false);
      setPrefetchedRawEmail(undefined);
      activeTooltipCleanup = null; // ← clear singleton
      hideTooltipTimerRef.current = null;
    }, 150);
  };

  const handleFlagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFlag?.(email.id, isFlagged);
  };

  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveToFolder?.(email.id);
  };

  const getRecipientDisplay = () => {
    const allRecipients = [...toRecipients, ...ccRecipients];

    if (folder === 'Sent') {
      if (allRecipients.length === 0) return null;
      const recipientsWithoutMe = allRecipients.filter((r) => !r.isMe);
      if (recipientsWithoutMe.length === 0) return { text: 'me', hasCc: false, fullText: 'To: me' };
      if (recipientsWithoutMe.length === 1) {
        return {
          text: recipientsWithoutMe[0].name,
          hasCc: false,
          fullText: `To: ${recipientsWithoutMe[0].name}`,
        };
      }
      if (recipientsWithoutMe.length === 2) {
        return {
          text: `${recipientsWithoutMe[0].name}, ${recipientsWithoutMe[1].name}`,
          hasCc: ccRecipients.length > 0,
          fullText: `To: ${recipientsWithoutMe[0].name}, ${recipientsWithoutMe[1].name}`,
        };
      }
      return {
        text: `${recipientsWithoutMe[0].name}, ${recipientsWithoutMe[1].name}... +${recipientsWithoutMe.length - 2}`,
        hasCc: ccRecipients.length > 0,
        fullText: `To: ${recipientsWithoutMe
          .slice(0, 2)
          .map((r) => r.name)
          .join(', ')}... +${recipientsWithoutMe.length - 2}`,
      };
    }

    const hasMeInTo = toRecipients.some((r) => r.isMe);
    const recipientsWithoutMe = toRecipients.filter((r) => !r.isMe);
    const isOnlyMe = hasMeInTo && recipientsWithoutMe.length === 0 && ccRecipients.length === 0;
    if (isOnlyMe) return null;

    if (toRecipients.length > 1 || ccRecipients.length > 0) {
      const parts = [];
      if (toRecipients.length > 0) {
        if (hasMeInTo && recipientsWithoutMe.length > 0) {
          parts.push(
            `To: me, ${recipientsWithoutMe[0].name}${recipientsWithoutMe.length > 1 ? ` +${recipientsWithoutMe.length - 1}` : ''}`
          );
        } else if (!hasMeInTo) {
          parts.push(
            `To: ${recipientsWithoutMe[0].name}${recipientsWithoutMe.length > 1 ? ` +${recipientsWithoutMe.length - 1}` : ''}`
          );
        }
      }
      if (ccRecipients.length > 0) {
        const hasMeInCc = ccRecipients.some((r) => r.isMe);
        const ccWithoutMe = ccRecipients.filter((r) => !r.isMe);
        if (hasMeInCc && ccWithoutMe.length === 0) {
          parts.push('Cc: me');
        } else if (hasMeInCc && ccWithoutMe.length > 0) {
          parts.push(
            `Cc: me, ${ccWithoutMe[0].name}${ccWithoutMe.length > 1 ? ` +${ccWithoutMe.length - 1}` : ''}`
          );
        } else {
          parts.push(
            `Cc: ${ccWithoutMe[0].name}${ccWithoutMe.length > 1 ? ` +${ccWithoutMe.length - 1}` : ''}`
          );
        }
      }
      return {
        text: parts.join(' • '),
        hasCc: ccRecipients.length > 0,
        fullText: parts.join(' • '),
      };
    }

    return null;
  };

  const recipientDisplay = getRecipientDisplay();

  const getAttachmentNames = () => {
    if (!email.attachments || email.attachments.length === 0) return '';
    const names = email.attachments
      .slice(0, 3)
      .map((att) => att.filename)
      .join(', ');
    if (email.attachments.length > 3) return `${names} + ${email.attachments.length - 3} more`;
    return names;
  };

  const getHoverAttachmentNames = () => {
    if (hoverParsedEmail?.attachments?.length) {
      return hoverParsedEmail.attachments
        .map((a: any) => a.filename || a.name || 'Unnamed')
        .join(', ');
    }
    return getAttachmentNames();
  };

  const handleMarkAsReadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.(email.id, !emailSeen);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(email.id);
  };

  const getDisplayName = (name: string): string => {
    if (!name || name.trim().length === 0) return 'Unknown';
    return name;
  };

  const getBackgroundClass = () => {
    if (isActive) return 'bg-[var(--accent-3)]';
    if (isSelected) return 'bg-[var(--accent-2)]';
    if (isFlagged) return 'bg-[var(--red-3)] dark:bg-[var(--red-3)]';
    if (!emailSeen) return 'bg-white dark:bg-[var(--gray-1)]';
    return 'bg-[var(--gray-1)] hover:bg-[var(--gray-2)]';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest('input[type="checkbox"]') ||
        e.target.closest('button') ||
        e.target.closest('a'))
    )
      return;
    onEmailClick?.(email);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();

    // Cancel any in-flight prefetch / tooltip — user is dragging, not previewing
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
    if (showTooltipTimerRef.current) {
      clearTimeout(showTooltipTimerRef.current);
      showTooltipTimerRef.current = null;
    }
    setIsWaitingForTooltip(false);
    setShowEmailTooltip(false);

    const emailsToDrag = checkedEmails.includes(Number(email.id))
      ? checkedEmails
      : [Number(email.id)];
    onDragStart?.(emailsToDrag);
    setIsDragging(true);

    const dragPreview = document.createElement('div');
    dragPreview.style.cssText = `
      position: absolute; top: -1000px; left: -1000px; width: 320px;
      padding: 12px; background: var(--color-panel); border: 1px solid var(--gray-6);
      border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); pointer-events: none; z-index: 9999;
    `;
    const count = emailsToDrag.length;
    const isMultiple = count > 1;
    dragPreview.innerHTML = `
      <div style="display:flex;align-items:start;gap:12px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:600;color:var(--accent-11);">
          ${isMultiple ? count : senderName.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--gray-12);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${isMultiple ? `${count} emails selected` : senderName}
          </div>
          <div style="font-size:12px;color:var(--gray-11);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${isMultiple ? 'Drag to move' : decodeWords(email.Subject) || '(No Subject)'}
          </div>
        </div>
      </div>
      ${
        isMultiple
          ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--gray-5);display:flex;gap:4px;">
        ${Array(Math.min(count, 3))
          .fill(0)
          .map(
            (_, i) =>
              `<div style="height:4px;flex:1;background:var(--accent-9);border-radius:2px;opacity:${1 - i * 0.2};"></div>`
          )
          .join('')}
      </div>`
          : ''
      }
    `;
    document.body.appendChild(dragPreview);
    dragImageRef.current = dragPreview;
    e.dataTransfer.setDragImage(dragPreview, 160, 40);
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => {
      if (dragImageRef.current) {
        document.body.removeChild(dragImageRef.current);
        dragImageRef.current = null;
      }
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectionMode) return;
    const touch = e.touches[0];
    touchStartTimeRef.current = Date.now();
    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;
    touchMovedRef.current = false;
    setIsPressed(true);
    longPressTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) {
        onEnterSelectionMode?.();
        onSelectionChange?.(email.id, true);
        navigator.vibrate?.(50);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (
      Math.abs(touch.clientY - touchStartYRef.current) > 10 ||
      Math.abs(touch.clientX - touchStartXRef.current) > 10
    ) {
      touchMovedRef.current = true;
      setIsPressed(false);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPressed(false);
    const touchDuration = Date.now() - touchStartTimeRef.current;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (touchDuration < 500 && !touchMovedRef.current && !isSelectionMode)
      handleCardClick(e as any);
    touchMovedRef.current = false;
  };

  const handleTouchCancel = () => {
    setIsPressed(false);
    touchMovedRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          id={id}
          className={`email-card ${isActive ? 'border-l-4 border-[var(--accent-9)]' : 'border-l-4 border-transparent'} relative group`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          draggable={!isSelectionMode}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            className={`
          cursor-pointer transition-all duration-200 relative border-l-0 border-r-0
          px-2 md:px-2 py-2 md:py-1
          ${isPressed ? 'scale-95 md:scale-100' : 'scale-100'}
          ${isDragging ? 'opacity-40' : 'opacity-100'}
          ${getBackgroundClass()}
          ${isActive ? '' : 'border-l-0'}
          ${isKeyboardFocused ? 'ring-2 ring-[var(--accent-9)] ring-inset' : isSelected ? 'ring-2 ring-[var(--accent-7)] md:ring-0' : ''}
          ${isHovered ? 'md:shadow-md md:z-10 md:scale-[1.001]' : 'shadow-none z-0'}
          ${index === 0 ? 'border-t-0' : 'border-t border-[var(--gray-5)]'}
          ${index === total - 1 ? 'border-b border-[var(--gray-5)]' : 'border-b-0'}
        `}
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            {/* Desktop Hover Actions Overlay */}
            <div
              className={`
            hidden md:flex absolute top-1/2 pr-6 right-2 transform -translate-y-1/2
            items-center gap-1 transition-all duration-200 z-20
            ${
              isHovered && !isSelectionMode && showHoverActions && !isDragging
                ? `opacity-100 ${isFlagged ? '-translate-x-24' : '-translate-x-20'}`
                : 'opacity-0 translate-x-2 pointer-events-none'
            }
          `}
            >
              <button
                onClick={handleMarkAsReadClick}
                className="p-1.5 bg-[var(--gray-1)] hover:bg-[var(--accent-3)] border border-[var(--gray-5)] rounded-md shadow-sm transition-all duration-150 hover:scale-105"
                title={emailSeen ? 'Mark as Unread' : 'Mark as Read'}
              >
                {emailSeen ? (
                  <MdMarkEmailUnread className="w-3.5 h-3.5 text-[var(--gray-11)]" />
                ) : (
                  <MdMarkEmailRead className="w-3.5 h-3.5 text-[var(--gray-11)]" />
                )}
              </button>

              <button
                onClick={handleDeleteClick}
                className="p-1.5 bg-[var(--gray-1)] hover:bg-[var(--red-3)] border border-[var(--gray-5)] rounded-md shadow-sm transition-all duration-150 hover:scale-105 group/delete"
                title={folder === 'Trash' ? 'Delete Permanently' : 'Move to Trash'}
              >
                <FaTrash className="w-3 h-3 text-[var(--gray-11)] group-hover/delete:text-[var(--red-11)]" />
              </button>

              <button
                onClick={handleFlagClick}
                className="p-1.5 bg-[var(--gray-1)] hover:bg-[var(--orange-3)] border border-[var(--gray-5)] rounded-md transition-all hover:scale-105"
                title={isFlagged ? 'Unflag' : 'Flag'}
              >
                <FaFlag
                  className={`w-3 h-3 ${isFlagged ? 'text-[var(--red-9)]' : 'text-[var(--gray-11)]'}`}
                />
              </button>

              <button
                onClick={handleMoveClick}
                className="p-1.5 bg-[var(--gray-1)] hover:bg-[var(--accent-3)] border border-[var(--gray-5)] rounded-md transition-all hover:scale-105"
                title="Move to folder"
              >
                <MdDriveFileMoveOutline className="w-3.5 h-3.5 text-[var(--gray-11)]" />
              </button>
            </div>

            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 relative">
                  <BIMIAvatar
                    name={senderName}
                    email={senderEmail}
                    size={32}
                    className="cursor-pointer hover:ring-2 hover:ring-[var(--accent-8)] transition-all"
                  />
                  {isSelected && (
                    <div className="absolute -top-[15px] -left-[7px] w-4 h-4 bg-[var(--accent-9)] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p
                      className={`text-[14px] truncate ${emailSeen ? 'text-[var(--gray-11)] font-medium' : 'text-[var(--gray-12)] font-bold'}`}
                    >
                      {folder === 'Sent' && recipientDisplay
                        ? `To: ${recipientDisplay.text}`
                        : getDisplayName(senderName)}
                    </p>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {isFlagged && <FaFlag className="text-[10px] text-[var(--red-9)]" />}
                      {showThreadPill && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {threadHasUnread && (
                            <span
                              className="inline-flex items-center justify-center w-[14px] h-[14px] text-[8px] rounded-full bg-[var(--accent-9)] text-white font-bold leading-none"
                              title={`${threadUnreadCount} unread`}
                            >
                              {threadUnreadCount}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        onClick={handleMarkAsReadClick}
                        className="p-1 hover:bg-[var(--accent-3)] rounded transition-colors"
                        title={emailSeen ? 'Mark as Unread' : 'Mark as Read'}
                      >
                        {emailSeen ? (
                          <MdMarkEmailUnread className="w-3 h-3 text-[var(--gray-10)]" />
                        ) : (
                          <MdMarkEmailRead className="w-3 h-3 text-[var(--gray-10)]" />
                        )}
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="p-1 hover:bg-[var(--red-3)] rounded transition-colors group/mobile-delete"
                        title={folder === 'Trash' ? 'Delete Permanently' : 'Move to Trash'}
                      >
                        <FaTrash className="w-3 h-3 text-[var(--gray-10)] group-hover/mobile-delete:text-[var(--red-11)]" />
                      </button>
                      {hasAttachments && (
                        <FaPaperclip className="text-[10px] text-[var(--gray-9)]" />
                      )}
                      <p
                        title={fullDate}
                        className={`text-[11px] text-[var(--gray-10)] ${emailSeen ? 'font-normal' : 'font-medium'}`}
                      >
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  <p
                    className={`text-[13px] leading-[1.3] mb-1 ${emailSeen ? 'text-[var(--gray-11)] font-medium' : 'text-[var(--gray-12)] font-bold'}`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {decodeWords(email.Subject) || email.Subject || '(No Subject)'}
                  </p>

                  {email.bodyPreview && (
                    <p
                      className="text-[12px] leading-[1.3] text-[var(--gray-10)] opacity-75"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {email.bodyPreview}
                    </p>
                  )}

                  {hasAttachments && (
                    <p className="text-[11px] text-[var(--accent-11)] mt-2 opacity-80">
                      📎 {email.attachmentCount} file{(email?.attachmentCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {!isSelectionMode && index === 0 && (
                <div className="absolute -top-1 right-2 opacity-40 pointer-events-none">
                  <p className="text-[9px] text-[var(--gray-10)]">Hold to select</p>
                </div>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div className="flex items-center px-2 gap-2 min-h-[26px]">
                {showSelection && (
                  <div className="flex items-center flex-shrink-0">
                    <div
                      className="relative flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          e.target === e.currentTarget ||
                          !e.currentTarget.contains(e.target as Node)
                        ) {
                          onSelectionChange?.(email.id, !isSelected, index, e.shiftKey);
                        }
                      }}
                      style={{ padding: '8px', margin: '-8px', minHeight: '100%' }}
                    >
                      <div className="transform transition-transform duration-150 hover:scale-125 flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            onSelectionChange?.(email.id, checked as boolean, index, false);
                          }}
                          onClick={(e) => {
                            if ((e as any).shiftKey && onSelectionChange) {
                              e.stopPropagation();
                              onSelectionChange(email.id, !isSelected, index, true);
                            }
                          }}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sender area — triggers hover card */}
                <div
                  ref={tooltipTriggerRef}
                  className={`flex items-center gap-2 w-[25%] 2xl:w-[20%] flex-shrink-0 ${showSelection ? 'ml-4' : ''} relative `}
                  onMouseEnter={handleSenderAreaMouseEnter}
                  onMouseLeave={handleSenderAreaMouseLeave}
                >
                  <BIMIAvatar
                    name={senderName}
                    email={senderEmail}
                    size={22}
                    className="cursor-pointer "
                    isLoading={isWaitingForTooltip}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    {folder === 'Sent' ? (
                      <>
                        {recipientDisplay && (
                          <p
                            className={`text-[13px] truncate ${emailSeen ? 'text-[var(--gray-11)] font-medium' : 'text-[var(--gray-12)] font-bold'}`}
                          >
                            To: {recipientDisplay.text}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className={`text-[13px] truncate ${emailSeen ? 'text-[var(--gray-11)] font-medium' : 'text-[var(--gray-12)] font-bold'}`}
                      >
                        {getDisplayName(senderName)}
                      </p>
                    )}
                  </div>

                  {/* Hover Card */}
                  {showEmailTooltip && showRecipientInfo && (
                    <EmailHoverCard
                      senderName={senderName}
                      senderEmail={senderEmail}
                      dateString={email.Date}
                      toRecipients={toRecipients}
                      ccRecipients={ccRecipients}
                      bccRecipients={bccRecipients}
                      attachmentCount={
                        hoverParsedEmail?.attachments?.length ?? email.attachmentCount ?? 0
                      }
                      attachmentNames={getHoverAttachmentNames()}
                      isUnread={!emailSeen}
                      isFlagged={isFlagged}
                      position={tooltipPosition}
                      emailHeaders={email}
                      onMouseEnter={handleTooltipCardMouseEnter}
                      onMouseLeave={handleTooltipCardMouseLeave}
                    />
                  )}
                </div>

                {/* Subject & Preview */}
                <div className="flex-1 min-w-0 ml-2">
                  <div className="flex flex-col gap-0">
                    <p
                      className={`text-[13px] leading-[1.2] truncate ${emailSeen ? 'text-[var(--gray-11)] font-medium' : 'text-[var(--gray-12)] font-bold'}`}
                    >
                      {decodeWords(email.Subject) || email.Subject || '(No Subject)'}
                    </p>
                    {email.bodyPreview && (
                      <p className="text-[10px] leading-[1.1] text-[var(--gray-10)] opacity-70 mt-[1px] truncate">
                        {email.bodyPreview}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side - Date and Metadata */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isFlagged && (
                    <FaFlag className="text-[10px] text-[var(--red-9)]" title="Flagged" />
                  )}

                  {showThreadPill && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {threadHasUnread && (
                        <span
                          className="inline-flex items-center justify-center w-[16px] h-[16px] text-[9px] rounded-full bg-[var(--accent-9)] text-white font-bold leading-none"
                          title={`${threadUnreadCount} unread`}
                        >
                          {threadUnreadCount}
                        </span>
                      )}
                    </div>
                  )}

                  {hasAttachments && (
                    <div>
                      {isHovered && !isSelectionMode ? (
                        <span
                          className="inline-flex items-center gap-[2px] px-2 py-0.5 text-[9px] bg-[var(--blue-3)] text-[var(--blue-11)] rounded-full"
                          title={getAttachmentNames()}
                        >
                          <FaPaperclip className="text-[8px]" />
                          {email.attachmentCount}
                        </span>
                      ) : (
                        <FaPaperclip className="text-[8px] text-[var(--gray-9)]" />
                      )}
                    </div>
                  )}

                  <p
                    title={fullDate}
                    className={`text-[11px] min-w-[45px] text-right text-[var(--gray-10)] ${emailSeen ? 'font-normal' : 'font-medium'}`}
                  >
                    {formattedDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Content>
        <ContextMenu.Item onSelect={() => onMarkAsRead?.(email.id.toString(), !emailSeen)}>
          {emailSeen ? <MdMarkEmailUnread size={15} /> : <MdMarkEmailRead size={15} />}
          {emailSeen ? 'Mark as Unread' : 'Mark as Read'}
        </ContextMenu.Item>

        <ContextMenu.Item onSelect={() => onToggleFlag?.(email.id.toString(), isFlagged)}>
          <FaFlag size={12} />
          {isFlagged ? 'Unflag' : 'Flag'}
        </ContextMenu.Item>

        <ContextMenu.Separator />

        <ContextMenu.Item onSelect={() => onMoveToFolder?.(email.id.toString())}>
          <MdDriveFileMoveOutline size={15} />
          Move to folder...
        </ContextMenu.Item>

        <ContextMenu.Item color="red" onSelect={() => onDelete?.(email.id.toString())}>
          <FaTrash size={12} />
          {folder === 'Trash' ? 'Delete Permanently' : 'Move to Trash'}
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
};

export default EmailCard;
