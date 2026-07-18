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

// src/components/email/SingleEmailView.tsx
import { Popover, Button } from '@radix-ui/themes';
import { FaCalendarAlt, FaInfoCircle, FaTimes, FaFlag } from 'react-icons/fa';
import BIMIAvatar from '../../../common/BimiAvatar';
import EmailLoadingState from './EmailLoadingState';
import EmailParsingState from './EmailParsingState';
import EmailErrorState from './EmailErrorState';
import EmailNoDataState from './EmailNoDataState';
import EmailTabs, { type ParsedEmailForTabs } from './EmailTabs';
import { RecipientSection } from './RecipientSection';
import { parseEmail } from '../../../../utils/emailPerser';
import { decodeWords, type Email as ParsedPostalEmail, type Attachment } from 'postal-mime';
import { parseMultipleEmails, normalizeFieldNames } from '../../../../utils/emailUtils';
import type { EmailLike } from '../../../../utils/emailThreading';

interface SingleEmailViewProps {
  rawEmail: string | undefined;
  isLoading: boolean;
  isParsing: boolean;
  parseError: string | null;
  parsedEmail: ParsedPostalEmail | null;
  headers: Record<string, string>;
  subject: string;
  senderEmail: string;
  date: string;
  isFlagged: boolean;
  isHeaderPopoverOpen: boolean;
  folder?: string;
  splitView?: boolean;
  onBack?: () => void;
  onDraftSend?: (email: EmailLike) => void;
  onContentLoaded?: (content: string) => void;
  onAttachmentsLoaded?: (attachments: Attachment[]) => void;
  messageId: string;
  folderPath?: string;
  formatUserDateNice: (date: string) => string;
  setIsHeaderPopoverOpen: (open: boolean) => void;
  renderHeaderInfo: () => React.ReactNode;
}

export const SingleEmailView = ({
  rawEmail,
  isLoading,
  isParsing,
  parseError,
  parsedEmail,
  headers,
  subject,
  senderEmail,
  date,
  isFlagged,
  isHeaderPopoverOpen,
  folder,
  splitView,
  onBack,
  onDraftSend,
  messageId,
  folderPath,
  formatUserDateNice,
  setIsHeaderPopoverOpen,
  renderHeaderInfo,
}: SingleEmailViewProps) => {
  const normalizedHeaders = normalizeFieldNames(headers);

  const toRecipients = parseMultipleEmails((normalizedHeaders.to as string) || '');
  const ccRecipients = parseMultipleEmails((normalizedHeaders.cc as string) || '');
  const bccRecipients = parseMultipleEmails((normalizedHeaders.bcc as string) || '');
  const { name: senderName, email: senderEmailParsed } = parseEmail(senderEmail);

  const handleEditDraft = () => {
    if (onDraftSend && folder === 'Drafts') {
      onDraftSend({
        id: messageId,
        Subject: subject,
        From: senderEmail,
        Date: date,
      });
    }
  };

  const handleClose = () => onBack?.();

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-surface)] relative text-[var(--gray-12)]">
      {folder === 'Drafts' && (
        <div className="absolute top-3 right-16 z-10">
          <Button
            title="Edit draft"
            aria-label="Edit draft"
            variant="outline"
            size="2"
            onClick={handleEditDraft}
            style={{ gap: '0.5rem' }}
          >
            Edit
          </Button>
        </div>
      )}
      {splitView && (
        <div className="absolute top-3 right-3 z-10">
          <Button
            title="Close email"
            aria-label="Close email"
            variant="outline"
            size="2"
            onClick={handleClose}
            style={{ gap: '0.5rem' }}
          >
            <FaTimes className="w-4 h-4 text-[var(--accent-11)] group-hover:text-[var(--accent-12)]" />
          </Button>
        </div>
      )}

      <header className="px-4 py-1.5 pb-0.5">
        <div className="space-y-2.5 mt-2">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-[var(--gray-12)] leading-tight pr-12">
              {isFlagged && <FaFlag className="text-xl text-[var(--red-9)] inline" />}{' '}
              {decodeWords(subject) || '(No Subject)'}
            </h1>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BIMIAvatar email={senderEmailParsed} name={senderName} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      title={senderEmailParsed}
                      className="font-medium text-[var(--gray-12)] break-words"
                    >
                      {senderName} &lt;{senderEmailParsed}&gt;
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <RecipientSection recipients={toRecipients} label="To" />
                <RecipientSection recipients={ccRecipients} label="Cc" />
                <RecipientSection recipients={bccRecipients} label="Bcc" />
              </div>

              <div className="flex items-center gap-4 text-sm text-[var(--gray-11)]">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt size={12} />
                  <span>{formatUserDateNice(date)}</span>
                </div>

                <Popover.Root open={isHeaderPopoverOpen} onOpenChange={setIsHeaderPopoverOpen}>
                  <Popover.Trigger>
                    <Button
                      variant="ghost"
                      size="1"
                      className="flex items-center gap-1 hover:text-[var(--accent-11)] transition-colors p-1 h-auto"
                    >
                      <FaInfoCircle size={12} />
                      <span className="text-xs">Email Headers</span>
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content
                    className="w-[500px] max-w-[90vw] max-h-[400px] overflow-y-auto bg-[var(--color-surface)] border border-[var(--gray-6)] shadow-lg rounded-lg p-4"
                    side="bottom"
                    align="start"
                  >
                    {renderHeaderInfo()}
                  </Popover.Content>
                </Popover.Root>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="px-4 pb-4">
          {isLoading && <EmailLoadingState />}
          {isParsing && <EmailParsingState />}
          {parseError && <EmailErrorState error={parseError} rawContent={rawEmail || ''} />}
          {!isLoading && !isParsing && !parseError && !parsedEmail && <EmailNoDataState />}
          {!isLoading && !isParsing && !parseError && parsedEmail && (
            <EmailTabs
              key={`${messageId}-${folderPath}`}
              parsedEmail={parsedEmail as unknown as ParsedEmailForTabs}
              rawEmail={rawEmail || ''}
            />
          )}
        </div>
      </main>
    </div>
  );
};
