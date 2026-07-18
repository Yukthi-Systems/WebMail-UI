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

// src/components/email/EmailActions.tsx
import { Tooltip } from '@radix-ui/themes';
import {
  FaDownload,
  FaExternalLinkAlt,
  FaPrint,
  FaRegFlag,
  FaReply,
  FaReplyAll,
  FaShare,
  FaTrash,
} from 'react-icons/fa';
import { LuFlagOff } from 'react-icons/lu';
import {
  MdAttachEmail,
  MdContentCopy,
  MdDriveFileMoveOutline,
  MdMarkEmailRead,
  MdMarkEmailUnread,
  MdPersonAdd,
  MdSaveAs,
} from 'react-icons/md';
import DropdownWrapper from '../common/DropdownWrapper';
import { FaEllipsisVertical, FaRotateRight } from 'react-icons/fa6';
import type { EmailLike } from '../../utils/emailThreading';

interface EmailActionsProps {
  email: EmailLike;
  onReply: (email: EmailLike) => void;
  onEditAsNew: (email: EmailLike) => void;
  onSaveAsTemplate: (email: EmailLike) => void;
  onReplyAll: (email: EmailLike) => void;
  onForward: (email: EmailLike) => void;
  onForwardAsAttachment?: () => void;
  onDelete: (emailId: string) => void;
  onMove?: () => void;
  onCopy?: () => void;
  showDelete?: boolean;
  handleSingleEmailMarkAsFlagged?: (emailId: string, action: boolean) => void;
  handleSingleEmailMarkAsRead?: (emailId: string, action: boolean) => void;
  reFetchMails?: () => void;

  onPrint?: (email: EmailLike) => void;
  onDownload?: (email: EmailLike) => void;
  onViewInWindow?: (email: EmailLike) => void;
  onViewInRaw?: (email: EmailLike) => void;
  onSaveAsContact?: () => void;
}

export const EmailActions = ({
  email,
  onReply,
  onReplyAll,
  onForward,
  onForwardAsAttachment,
  onEditAsNew,
  onSaveAsTemplate,
  onDelete,
  onMove,
  onCopy,
  showDelete = true,
  handleSingleEmailMarkAsFlagged,
  handleSingleEmailMarkAsRead,
  onPrint,
  onDownload,
  onViewInWindow,
  onViewInRaw,
  onSaveAsContact,
}: EmailActionsProps) => {
  const isFlagged = !!email?.FLAGS?.includes('\\Flagged');
  const isRead = !!email?.FLAGS?.includes('\\Seen');

  const moreItems = [
    {
      key: 'print',
      label: 'Print',
      icon: FaPrint,
      onSelect: () => onPrint?.(email),
    },
    {
      key: 'download',
      label: 'Download (.eml)',
      icon: FaDownload,
      onSelect: () => onDownload?.(email),
    },
    {
      key: 'window',
      label: 'View in Window',
      icon: FaExternalLinkAlt,
      onSelect: () => onViewInWindow?.(email),
    },
    {
      key: 'raw',
      label: 'Raw Email',
      icon: FaExternalLinkAlt,
      onSelect: () => onViewInRaw?.(email),
    },
    {
      key: 'edit-as-new',
      label: 'Edit as New',
      icon: FaRotateRight,
      onSelect: () => onEditAsNew(email), // Ensure email is passed back here
    },
    {
      key: 'save-template',
      label: 'Save as Template',
      icon: MdSaveAs,
      onSelect: () => onSaveAsTemplate(email),
    },
    {
      key: 'save-contact',
      label: 'Save as Contact',
      icon: MdPersonAdd,
      onSelect: onSaveAsContact,
    },
  ];

  const allItems = [
    // Reply group
    { key: 'reply', label: 'Reply', icon: FaReply, onSelect: () => onReply(email) },
    { key: 'reply-all', label: 'Reply All', icon: FaReplyAll, onSelect: () => onReplyAll(email) },
    { key: 'forward', label: 'Forward', icon: FaShare, onSelect: () => onForward(email) },
    {
      key: 'forward-as-attachment',
      label: 'Forward as Attachment',
      icon: MdAttachEmail,
      onSelect: () => onForwardAsAttachment?.(),
    },
    // Organize group
    { key: 'sep-organize', label: '', separator: true },
    { key: 'move', label: 'Move', icon: MdDriveFileMoveOutline, onSelect: () => onMove?.() },
    { key: 'copy', label: 'Copy', icon: MdContentCopy, onSelect: () => onCopy?.() },
    // Status group
    { key: 'sep-status', label: '', separator: true },
    {
      key: 'mark-read',
      label: isRead ? 'Mark as Unread' : 'Mark as Read',
      icon: isRead ? MdMarkEmailUnread : MdMarkEmailRead,
      onSelect: () => handleSingleEmailMarkAsRead?.(String(email?.id ?? ''), !isRead),
    },
    {
      key: 'flag',
      label: isFlagged ? 'Remove Flag' : 'Add Flag',
      icon: isFlagged ? LuFlagOff : FaRegFlag,
      onSelect: () => handleSingleEmailMarkAsFlagged?.(String(email?.id ?? ''), isFlagged),
    },
    // View / export group
    { key: 'sep-more', label: '', separator: true },
    ...moreItems,
    // Delete
    ...(showDelete
      ? [
          { key: 'sep-delete', label: '', separator: true },
          {
            key: 'delete',
            label: 'Delete',
            icon: FaTrash,
            color: 'red',
            onSelect: () => onDelete(String(email.id)),
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center gap-0.5">
      {/* Reply — most common action, one click */}
      <Tooltip content="Reply">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReply(email);
          }}
          className="p-1.5 rounded-md text-[var(--gray-11)] hover:text-[var(--accent-11)] hover:bg-[var(--accent-3)] transition-all duration-150 active:scale-95"
          aria-label="Reply"
        >
          <FaReply size={13} />
        </button>
      </Tooltip>

      {/* All other actions in a compact dropdown */}
      <DropdownWrapper
        items={allItems}
        trigger={
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-[var(--gray-11)] hover:text-[var(--accent-11)] hover:bg-[var(--accent-3)] transition-all duration-150 active:scale-95"
            aria-label="More actions"
          >
            <FaEllipsisVertical size={13} />
          </button>
        }
      />
    </div>
  );
};
