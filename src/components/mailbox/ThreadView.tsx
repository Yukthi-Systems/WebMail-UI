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

// src/components/email/ThreadView.tsx
import { Button } from '@radix-ui/themes';
import { FaEnvelope, FaTimes } from 'react-icons/fa';
import { BiRefresh } from 'react-icons/bi';
import ThreadEmailCard from './ThreadEmailCard';
import ThreadLoadingState from './ThreadLoadingState';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../state/settings';
import { useMemo } from 'react';
import type { EmailLike } from '../../utils/emailThreading';

interface ThreadViewProps {
  listofThreadEmails: EmailLike[];
  messageId: string;
  folderPath?: string;
  date: string;
  onContentLoaded?: (content: string) => void;
  splitView?: boolean;
  onBack?: () => void;
  formatUserDateNice: (date: string) => string;
  onReply?: (email: EmailLike) => void;
  onForward?: (email: EmailLike) => void;
  onForwardAsAttachment?: (email: EmailLike, rawContent: string) => void;
  onEditAsNew?: (email: EmailLike) => void;
  onReplyAll?: (email: EmailLike) => void;
  handleSingleEmailDelete?: (emailId: string) => void;
  isLoadingInitial: boolean;
  FilteredListLength?: (emailId: string) => void;
  handleSingleEmailMarkAsFlagged?: (emailId: string, action: boolean) => void;
  handleSingleEmailMarkAsRead?: (emailId: string, action: boolean) => void;
  reFetchMails?: () => void;
  isRefetching?: boolean;
  onSaveAsContact?: () => void;
}

export const ThreadView = ({
  listofThreadEmails,
  messageId,
  folderPath = '',
  date,
  onContentLoaded,
  splitView,
  onBack,
  formatUserDateNice,
  onReply = () => {},
  onForward = () => {},
  onForwardAsAttachment,
  onReplyAll = () => {},
  onEditAsNew = () => {},
  handleSingleEmailDelete = () => {},
  FilteredListLength = () => {},
  isLoadingInitial,
  handleSingleEmailMarkAsFlagged = () => {},
  handleSingleEmailMarkAsRead = () => {},
  reFetchMails = () => {},
  isRefetching = false,
  onSaveAsContact,
}: ThreadViewProps) => {
  const userSettings = useAtomValue(userSettingsAtom);
  const sortOrder = userSettings?.email?.thread_sort_order || 'desc';

  // Must run unconditionally (rules-of-hooks) — moved above the isLoadingInitial
  // early return below, which previously made this hook call conditional.
  const sortedEmails = useMemo(() => {
    return [...listofThreadEmails].sort((a, b) => {
      const timeA = new Date(a.Date as string).getTime() || 0;
      const timeB = new Date(b.Date as string).getTime() || 0;

      if (sortOrder === 'desc') {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });
  }, [listofThreadEmails, sortOrder]);

  if (isLoadingInitial) {
    return (
      <div className="h-full flex flex-col">
        <ThreadHeader
          listofThreadEmails={listofThreadEmails}
          date={date}
          formatUserDateNice={formatUserDateNice}
          splitView={splitView}
          onBack={onBack}
          showCount={false}
          isRefetching={false}
          onRefresh={reFetchMails}
        />
        <ThreadLoadingState />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ThreadHeader
        listofThreadEmails={listofThreadEmails}
        date={date}
        formatUserDateNice={formatUserDateNice}
        splitView={splitView}
        onBack={onBack}
        showCount={true}
        isRefetching={isRefetching}
        onRefresh={reFetchMails}
      />
      {/* Mobile: remove side padding, Desktop: keep padding */}
      <div className="flex-1 overflow-y-auto px-0 md:px-4 py-2 md:py-3">
        {listofThreadEmails.length === 0 ? (
          <NoMessagesFound />
        ) : (
          <div className="w-full mx-auto">
            {sortedEmails.map((threadEmail, index: number) => (
              <div key={`${threadEmail.id}-${threadEmail.folderPath}`}>
                <ThreadEmailCard
                  threadEmail={threadEmail}
                  folderPath={threadEmail.folderPath || folderPath || ''}
                  isCurrentEmail={threadEmail.id === messageId}
                  onContentLoaded={onContentLoaded}
                  foundedIn={
                    threadEmail.folderPath !== folderPath ? threadEmail.folderPath || '' : ''
                  }
                  onReply={onReply}
                  onForward={onForward}
                  onForwardAsAttachment={onForwardAsAttachment}
                  onEditAsNew={onEditAsNew}
                  onReplyAll={onReplyAll}
                  handleSingleEmailDelete={handleSingleEmailDelete}
                  onBack={onBack}
                  FilteredListLength={FilteredListLength}
                  handleSingleEmailMarkAsFlagged={handleSingleEmailMarkAsFlagged}
                  handleSingleEmailMarkAsRead={handleSingleEmailMarkAsRead}
                  reFetchMails={reFetchMails}
                  onSaveAsContact={onSaveAsContact}
                />
                {/* Divider between emails - not after last one */}
                {index < listofThreadEmails.length - 1 && (
                  <div className="my-2 md:my-3 border-t-2 md:border-t-0 border-dashed border-[var(--gray-6)] mx-4 md:mx-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ThreadHeader = ({
  listofThreadEmails,
  date,
  formatUserDateNice,
  splitView,
  onBack,
  showCount,
  isRefetching,
  onRefresh,
}: {
  listofThreadEmails: EmailLike[];
  date: string;
  formatUserDateNice: (date: string) => string;
  splitView?: boolean;
  onBack?: () => void;
  showCount: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
}) => (
  <div className="px-2 md:px-6 py-2 md:py-1.5 border-b border-[var(--gray-6)] bg-[var(--gray-2)]">
    {/* Mobile: Stack vertically, Desktop: Horizontal */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 md:gap-0">
      {/* Title Row */}
      <div className="flex items-center justify-between md:justify-start gap-1.5 md:gap-2">
        <h2 className="text-base md:text-lg font-semibold text-[var(--gray-12)] flex-1 md:flex-none">
          <span className="hidden md:inline">Conversation Thread</span>
          <span className="md:hidden">Thread</span>
          {showCount && (
            <span className="ml-1 md:ml-2 text-sm md:text-base">({listofThreadEmails.length})</span>
          )}
        </h2>

        {/* Refresh indicator - mobile inline with title */}
        {isRefetching && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--gray-11)]">
            <BiRefresh className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Refreshing...</span>
          </div>
        )}
      </div>

      {/* Actions Row - Mobile: Full width below, Desktop: Right side */}
      <div className="flex items-center justify-between md:justify-end gap-1.5 md:gap-3">
        <div className="text-xs md:text-sm text-[var(--gray-11)] flex items-center gap-1">
          <span className="hidden sm:inline">Latest:</span>
          <span>{formatUserDateNice(date)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          <Button
            variant="ghost"
            size="1"
            onClick={onRefresh}
            disabled={isRefetching}
            title="Refresh thread"
            className="transition-opacity hover:opacity-80"
          >
            <BiRefresh className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>

          {splitView && <CloseButton onClick={onBack} />}
        </div>
      </div>
    </div>
  </div>
);

const CloseButton = ({ onClick }: { onClick?: () => void }) => (
  <Button
    title="Close email"
    aria-label="Close email"
    variant="outline"
    size="1"
    onClick={onClick}
    className="gap-1.5"
  >
    <FaTimes className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--accent-11)] group-hover:text-[var(--accent-12)]" />
  </Button>
);

const NoMessagesFound = () => (
  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
    <FaEnvelope className="w-10 h-10 md:w-12 md:h-12 text-[var(--gray-9)] mb-3" />
    <h3 className="text-base md:text-lg font-semibold text-[var(--gray-12)] mb-1.5">
      No messages found
    </h3>
    <p className="text-sm text-[var(--gray-11)] max-w-md">
      Could not find any messages in this conversation thread.
    </p>
  </div>
);
