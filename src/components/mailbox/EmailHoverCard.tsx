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

// src/components/email/EmailHoverCard.tsx
import { useState } from 'react';
import { FaPaperclip, FaChevronDown, FaChevronUp, FaCode } from 'react-icons/fa';
import BIMIAvatar from '../common/BimiAvatar';
import { useUserTimezone } from '../../hooks/useTimezone';

interface Recipient {
  name: string;
  email: string;
  isMe: boolean;
}

interface EmailHoverCardProps {
  senderName: string;
  senderEmail: string;
  dateString: string;
  toRecipients: Recipient[];
  ccRecipients?: Recipient[];
  bccRecipients?: Recipient[];
  attachmentCount?: number;
  attachmentNames?: string;
  isUnread: boolean;
  isFlagged: boolean;
  position?: 'top' | 'bottom';
  emailHeaders?: any;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const EmailHoverCard = ({
  senderName,
  senderEmail,
  dateString,
  toRecipients,
  ccRecipients = [],
  bccRecipients = [],
  attachmentCount = 0,
  attachmentNames = '',
  isUnread,
  isFlagged,
  position = 'bottom',
  emailHeaders = {},
  onMouseEnter,
  onMouseLeave,
}: EmailHoverCardProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showHeaders, setShowHeaders] = useState(false);

  const { formatUserDateNice } = useUserTimezone();
  const fullDate = formatUserDateNice(dateString);

  // Compact "Me" Badge - inline style
  const MeBadge = () => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--accent-3)] text-[var(--accent-11)] rounded-full text-xs font-medium">
      <span className="text-[10px]">👤</span>
      me
    </span>
  );

  // Regular Recipient Chip
  const RecipientChip = ({ recipient }: { recipient: Recipient }) => (
    <div className="flex items-center gap-1.5 bg-[var(--gray-3)] px-2 py-1 rounded text-xs">
      {/* <div
        className="w-5 h-5 rounded-full bg-[var(--accent-9)] text-white text-[10px] 
        flex items-center justify-center flex-shrink-0 font-medium"
      >
        {recipient.name.charAt(0).toUpperCase()}
      </div> */}
      <BIMIAvatar
        name={recipient.name}
        email={recipient.email}
        size={24}
        className="ring-2 ring-[var(--accent-9)]/20 flex-shrink-0"
      />
      <div className="flex flex-col min-w-0">
        <span className="text-[var(--gray-12)] font-medium truncate">{recipient.name}</span>
        <span className="text-xs text-[var(--gray-10)] truncate">{recipient.email}</span>
      </div>
    </div>
  );

  // Optimized Recipient List with compact "me" handling
  const RecipientList = ({
    recipients,
    label,
    sectionKey,
  }: {
    recipients: Recipient[];
    label: string;
    sectionKey: string;
  }) => {
    if (recipients.length === 0) return null;

    // Special case: Only "me"
    if (recipients.length === 1 && recipients[0].isMe) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--gray-11)] font-medium min-w-[24px]">{label}:</span>
          <MeBadge />
        </div>
      );
    }

    const isExpanded = expandedSection === sectionKey;
    const displayRecipients = isExpanded ? recipients : recipients.slice(0, 3);
    const hasMore = recipients.length > 3;

    return (
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wide">
          {label} ({recipients.length})
        </div>
        <div className="space-y-1">
          {displayRecipients.map((recipient, idx) => (
            <div key={idx}>
              {recipient.isMe ? (
                <div className="px-2 py-1">
                  <MeBadge />
                </div>
              ) : (
                <RecipientChip recipient={recipient} />
              )}
            </div>
          ))}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
            className="text-xs text-[var(--accent-11)] hover:text-[var(--accent-12)] 
              font-medium flex items-center gap-1 px-2 py-1 hover:bg-[var(--accent-3)] 
              rounded transition-colors"
          >
            {isExpanded ? (
              <>
                <FaChevronUp className="w-2.5 h-2.5" />
                Show less
              </>
            ) : (
              <>
                <FaChevronDown className="w-2.5 h-2.5" />
                Show {recipients.length - 3} more
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // Format headers for display
  const importantHeaders = [
    'From',
    'To',
    'Cc',
    'Bcc',
    'Subject',
    'Date',
    'Message-ID',
    'Message-Id',
    'In-Reply-To',
    'References',
    'Return-Path',
    'MIME-Version',
    'Content-Type',
  ];

  const getHeadersToDisplay = () => {
    const headers: { key: string; value: string }[] = [];

    importantHeaders.forEach((key) => {
      if (emailHeaders[key]) {
        headers.push({ key, value: emailHeaders[key] });
      }
    });

    Object.entries(emailHeaders).forEach(([key, value]) => {
      if (!importantHeaders.includes(key) && typeof value === 'string') {
        headers.push({ key, value });
      }
    });

    return headers;
  };

  return (
    <div
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 
        bg-[var(--gray-1)] border border-[var(--gray-6)] rounded-lg shadow-xl 
        w-[360px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}
      style={{
        boxShadow:
          '0 10px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Refined Header */}
      <div className="bg-gradient-to-br from-[var(--accent-2)] via-[var(--accent-3)] to-[var(--accent-3)] px-3 py-2.5 border-b border-[var(--gray-5)]">
        <div className="flex items-center gap-2.5">
          <BIMIAvatar
            name={senderName}
            email={senderEmail}
            size={32}
            className="ring-2 ring-[var(--accent-9)]/20 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[var(--gray-12)] truncate leading-tight">
              {senderName || 'Unknown'}
            </div>
            <div className="text-xs text-[var(--gray-11)] truncate leading-tight mt-0.5">
              {senderEmail}
            </div>
          </div>
          {/* Refined Status Badges */}
          <div className="flex gap-1.5 flex-shrink-0">
            {isUnread && (
              <div
                className="w-2 h-2 rounded-full bg-[var(--accent-9)] ring-2 ring-[var(--accent-9)]/20 shadow-sm"
                title="Unread"
              />
            )}
            {isFlagged && (
              <div
                className="w-5 h-5 rounded-full bg-[var(--red-9)]/15 flex items-center justify-center border border-[var(--red-9)]/20"
                title="Flagged"
              >
                <span className="text-xs">🚩</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optimized Content */}
      <div className="max-h-[340px] overflow-y-auto scrollbar-thin">
        <div className="p-3 space-y-2.5">
          {/* Compact Date */}
          <div className="flex items-center justify-between text-xs  rounded">
            <span className="text-[var(--gray-11)] font-medium">Date</span>
            <span className="text-[var(--gray-12)] font-medium">{fullDate}</span>
          </div>

          {/* Optimized Recipients */}
          <RecipientList recipients={toRecipients} label="To" sectionKey="to" />
          {ccRecipients.length > 0 && (
            <RecipientList recipients={ccRecipients} label="Cc" sectionKey="cc" />
          )}
          {bccRecipients.length > 0 && (
            <RecipientList recipients={bccRecipients} label="Bcc" sectionKey="bcc" />
          )}

          {/* Refined Attachments */}
          {attachmentCount > 0 && (
            <div className="pt-1.5 border-t border-[var(--gray-5)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-[var(--blue-9)] flex items-center justify-center flex-shrink-0">
                  <FaPaperclip className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-[var(--blue-12)]">
                  {attachmentCount} {attachmentCount === 1 ? 'Attachment' : 'Attachments'}
                </span>
              </div>

              {attachmentNames && (
                <div className="flex flex-wrap gap-1.5">
                  {attachmentNames.split(',').map((name, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2 py-1 bg-[var(--blue-2)] border border-[var(--blue-6)]/40 
                       rounded-md text-[11px] text-[var(--blue-11)] font-medium max-w-full"
                    >
                      <FaPaperclip className="w-2 h-2 text-[var(--blue-9)] flex-shrink-0" />
                      <span className="truncate max-w-[280px]">{name.trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email Headers Section */}
        {Object.keys(emailHeaders).length > 0 && (
          <div className="border-t border-[var(--gray-5)]">
            <button
              onClick={() => setShowHeaders(!showHeaders)}
              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[var(--gray-2)] 
                transition-all text-xs font-medium text-[var(--gray-11)] group"
            >
              <div className="flex items-center gap-2">
                <FaCode className="w-3 h-3 text-[var(--gray-10)] group-hover:text-[var(--accent-11)] transition-colors" />
                <span>Email Headers</span>
              </div>
              {showHeaders ? (
                <FaChevronUp className="w-3 h-3 transition-transform" />
              ) : (
                <FaChevronDown className="w-3 h-3 transition-transform" />
              )}
            </button>

            {showHeaders && (
              <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-[var(--gray-2)] rounded-md p-2.5 max-h-[180px] overflow-y-auto scrollbar-thin border border-[var(--gray-5)]">
                  <div className="space-y-1.5">
                    {getHeadersToDisplay().map(({ key, value }, idx) => (
                      <div key={idx} className="text-[10px] font-mono">
                        <div className="flex gap-1.5">
                          <span className="text-[var(--accent-11)] font-semibold shrink-0">
                            {key}:
                          </span>
                          <span className="text-[var(--gray-12)] break-all">{value}</span>
                        </div>
                        {idx < getHeadersToDisplay().length - 1 && (
                          <div className="h-px bg-[var(--gray-5)] my-1.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Refined Arrow Pointer */}
      <div
        className={`absolute ${position === 'top' ? 'top-full -mt-1.5' : 'bottom-full -mb-1.5'} left-6 
          w-3 h-3 bg-[var(--gray-1)] border-[var(--gray-6)] transform rotate-45 
          ${position === 'top' ? 'border-r border-b' : 'border-l border-t'}`}
        style={{ zIndex: -1 }}
      />
    </div>
  );
};

export default EmailHoverCard;
