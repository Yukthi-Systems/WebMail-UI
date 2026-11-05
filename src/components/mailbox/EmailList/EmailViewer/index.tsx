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

// src/components/email/EmailViewer.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  emailViewErrorMessage,
  isEmailGoneError,
  useEmailView,
  useParsedEmailView,
  type ViewAttachment,
} from '../../../../hooks/useEmailView';
import { flagAtom } from '../../../../state/flags';
import { useAtom, useAtomValue } from 'jotai';
import { useUserTimezone } from '../../../../hooks/useTimezone';
import { folderDetailsAtom } from '../../../../state/folders';
import { useSpecialFolderPaths } from '../../../../hooks/useFolders';
import { getSentFolderPath } from '../../../../utils/folderUtils';
import { useMarkSeenOnOpen } from '../../../../hooks/useMarkSeenOnOpen';
import { isConversationView } from '../../../../utils/emailListUtils';
import { userSettingsAtom } from '../../../../state/settings';
import { useParams } from '@tanstack/react-router';
import { ThreadView } from './ThreadView';
import { SingleEmailView } from './SingleEmailView';
import { getMessageId, getReadReceiptRequest } from '../../../../utils/emailUtils';
import { AlertDialog, Button, Flex, Separator, Text } from '@radix-ui/themes';
import { FaEnvelope } from 'react-icons/fa';
import { decodeWords } from 'postal-mime';
import { useDeleteMail, useMoveMail } from '../../../../hooks/useEmails';
import { useToast } from '../../../../hooks/useToast';
import {
  isSameEmail,
  useThreadConversation,
  useThreadMutations,
} from '../../../../hooks/useThreadConversation';
import { useSendMail } from '../../../../hooks/useComposer';
import { generateMessageId, type ComposerRequest } from '../../../../api/composer';
import { emailAddress } from '../../../../state/emailAddress';
import { userDetailsAtom } from '../../../../state/userDetails';
import type { EmailLike } from '../../../../utils/threads';
import { useQueryClient } from '@tanstack/react-query';

interface EmailViewerProps {
  /** UID of the email in folderPath (named messageId for historical reasons) */
  messageId: string;
  folderPath: string | undefined;
  subject: string;
  senderEmail: string;
  date: string;
  onContentLoaded?: (content: string) => void;
  splitView?: boolean;
  onBack?: () => void;
  onDraftSend?: (email: EmailLike) => void;
  email?: EmailLike;
  flagged?: string[];
  onAttachmentsLoaded?: (attachments: ViewAttachment[]) => void;
  onReply?: (email: EmailLike) => void;
  onEditAsNew?: (email: EmailLike) => void;
  onSaveAsContact?: () => void;
  onForward?: (email: EmailLike) => void;
  onForwardAsAttachment?: (email: EmailLike, rawContent: string) => void;
  onReplyAll?: (email: EmailLike) => void;
  handleSingleEmailDelete?: (emailId: string) => void;
  handleSingleEmailMarkAsFlagged?: (emailId: string, action: boolean) => void;
  handleSingleEmailMarkAsRead?: (emailId: string, action: boolean) => void;
}

const EmailViewer = ({
  messageId,
  folderPath,
  subject,
  senderEmail,
  date,
  onContentLoaded,
  splitView = false,
  onBack,
  onDraftSend,
  email,
  onAttachmentsLoaded,
  onReply,
  onForward,
  onForwardAsAttachment,
  onEditAsNew,
  onReplyAll,
  handleSingleEmailMarkAsFlagged,
  handleSingleEmailMarkAsRead,
  onSaveAsContact,
}: EmailViewerProps) => {
  const uid = messageId;
  const viewFolder = folderPath ?? '';

  // Body + attachment list only; attachments are downloaded on demand
  const {
    data: emailViewData,
    isLoading,
    error: viewError,
  } = useEmailView(uid, viewFolder, true);
  const parsedEmail = useParsedEmailView(emailViewData, uid, viewFolder);
  const headers = useMemo(() => parsedEmail?.headers ?? {}, [parsedEmail?.headers]);
  const queryClient = useQueryClient();
  const [folderDetails] = useAtom(folderDetailsAtom);
  const [isHeaderPopoverOpen, setIsHeaderPopoverOpen] = useState(false);
  const { folder } = useParams({ strict: false });
  const [viewingEmailFlag] = useAtom(flagAtom);

  const userSettings = useAtomValue(userSettingsAtom);
  // Resolved Sent/Drafts/Trash/Spam (e.g. "INBOX/Trash" on servers nesting folders under INBOX)
  const specialFolders = useSpecialFolderPaths();
  const [undoTime, setUndoTime] = useState<number>(5000);
  const { formatUserDateNice } = useUserTimezone();
  const { mutate: deleteMutate } = useDeleteMail();
  const { mutate: moveMutate } = useMoveMail();
  const toast = useToast();

  // Email deleted/moved in another client: the list is stale, refresh it
  useEffect(() => {
    if (isEmailGoneError(viewError)) {
      queryClient.invalidateQueries({ queryKey: ['folder', folderPath || 'INBOX'] });
    }
  }, [viewError, folderPath, queryClient]);

  // Feed print / view-in-window with the current body and attachments
  useEffect(() => {
    if (!parsedEmail) return;
    onContentLoaded?.(parsedEmail.html || parsedEmail.text || '');
    onAttachmentsLoaded?.(parsedEmail.attachments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedEmail]);

  useEffect(() => {
    if (userSettings?.email) {
      const time = Number(userSettings?.email?.undo_send || 5) * 1000;
      setUndoTime(time);
    }
  }, [userSettings]);

  // ------------------------------------------------------------------
  // READ RECEIPT PROMPT
  // Ask the reader whether to notify the sender when the message they're
  // viewing carries a Disposition-Notification-To / Return-Receipt-To
  // header. The choice is remembered per message so re-opening it doesn't
  // ask again.
  // ------------------------------------------------------------------
  const currentUser = useAtomValue(emailAddress);
  const userDetails = useAtomValue(userDetailsAtom);
  const { mutate: sendReceiptMutate, isPending: isSendingReceipt } = useSendMail();
  const [showReadReceiptPrompt, setShowReadReceiptPrompt] = useState(false);
  const readReceiptRequest = useMemo(() => getReadReceiptRequest(headers), [headers]);
  // Remembered per message (Message-ID); emails without one by folder + UID
  const readReceiptStorageKey = `webmail-read-receipt-${getMessageId(email) || `${viewFolder}:${uid}`}`;

  useEffect(() => {
    if (isLoading || !readReceiptRequest) return;

    // Never prompt on an email the current user sent themselves.
    if (
      currentUser?.address &&
      readReceiptRequest.email.toLowerCase() === currentUser.address.toLowerCase()
    ) {
      return;
    }

    if (localStorage.getItem(readReceiptStorageKey)) return;

    setShowReadReceiptPrompt(true);
  }, [isLoading, readReceiptRequest, currentUser?.address, readReceiptStorageKey]);

  const handleDeclineReadReceipt = () => {
    localStorage.setItem(readReceiptStorageKey, 'declined');
    setShowReadReceiptPrompt(false);
  };

  const handleSendReadReceipt = () => {
    if (!readReceiptRequest) return;

    const decodedSubject = decodeWords(subject) || '(No Subject)';
    const bodyText = `This is a read receipt for the email "${decodedSubject}" sent on ${date}.\n\nThis receipt only acknowledges that the message was displayed on the recipient's device. It does not guarantee that the content was read or understood.`;

    const payload: ComposerRequest = {
      from_id: { email: currentUser?.address || '', name: currentUser?.name || '' },
      to: [{ email: readReceiptRequest.email, name: readReceiptRequest.name }],
      cc: [],
      bcc: [],
      subject: `Read: ${decodedSubject}`,
      body_text: bodyText,
      body_html: `<p>${bodyText.replace(/\n\n/g, '</p><p>')}</p>`,
      attachments: [],
      in_line_attachments: [],
      folder_path: getSentFolderPath(folderDetails),
      headers: {},
      priority: 'normal',
      read_receipt: false,
      is_draft: false,
      message_id: generateMessageId(userDetails?.domain || ''),
      draft_saved: false,
    };

    sendReceiptMutate(payload, {
      onSuccess: () => {
        localStorage.setItem(readReceiptStorageKey, 'sent');
        toast.success({ description: 'Read receipt sent.' });
      },
      onError: (err) => {
        toast.error({ description: err?.message || 'Failed to send read receipt.' });
      },
    });

    setShowReadReceiptPrompt(false);
  };

  const readReceiptDialog = (
    <AlertDialog.Root open={showReadReceiptPrompt} onOpenChange={setShowReadReceiptPrompt}>
      <AlertDialog.Content style={{ maxWidth: 450, borderRadius: 12 }}>
        <Flex direction="column" gap="4">
          <AlertDialog.Title>Read Receipt Requested</AlertDialog.Title>
          <Text size="2" color="gray">
            The sender has requested a read receipt for this message. Would you like to notify
            them that you've read it?
          </Text>
          <Flex gap="3" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray" onClick={handleDeclineReadReceipt}>
                Don't Send
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button onClick={handleSendReadReceipt} disabled={isSendingReceipt}>
                Send Read Receipt
              </Button>
            </AlertDialog.Action>
          </Flex>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );

  const flagged = '\\Flagged';

  const isFlagged = useMemo(() => {
    if (viewingEmailFlag && Array.isArray(viewingEmailFlag)) {
      return viewingEmailFlag.includes(flagged);
    }
    return false;
  }, [viewingEmailFlag]);

  // ------------------------------------------------------------------
  // CONVERSATION (from the API: GET /email/thread/{uid})
  // ------------------------------------------------------------------

  const conversationView = isConversationView(
    userSettings,
    specialFolders.settingsKey(folderPath || folder)
  );
  // A list row known to be a single email needs no lookup
  const isKnownSingle = email?.thread ? email.thread.messageCount <= 1 : false;
  const shouldFetchThread = conversationView && !isKnownSingle;

  // Your replies are added from the Sent folder (resolved by its IMAP flags)
  const sentFolderName = useMemo(() => getSentFolderPath(folderDetails), [folderDetails]);

  const {
    data: threadData,
    isLoading: isThreadLoading,
    isFetching: isThreadFetching,
    isSuccess: isThreadSuccess,
    isError: isThreadError,
    error: threadError,
  } = useThreadConversation(uid, viewFolder, {
    sentFolder: sentFolderName,
    enabled: shouldFetchThread,
  });
  const listofThreadEmails = useMemo(() => threadData?.emails ?? [], [threadData]);

  // Thread mutation helpers for optimistic updates
  const { optimisticallyRemove, optimisticallyRestore, invalidateThread } = useThreadMutations(
    viewFolder,
    uid
  );

  // Threaded view only once the conversation is loaded and has several emails.
  // Until then the opened email is shown on its own, without waiting.
  const isThreadedViewActive = shouldFetchThread && listofThreadEmails.length > 1;
  const isThreadSettled = !shouldFetchThread || isThreadSuccess || isThreadError;

  // Shown on its own: this view marks it as read (in a conversation, its card does)
  useMarkSeenOnOpen({
    uid,
    folder: viewFolder,
    isUnread: !email?.FLAGS?.includes('\\Seen'),
    isLoaded: !!emailViewData,
    isLoading,
    active: isThreadSettled && !isThreadedViewActive,
  });

  // The email itself is gone (404) is shown by the single view; other failures here
  useEffect(() => {
    if (threadError && !isEmailGoneError(threadError)) {
      console.error('[Thread] Failed to load thread:', threadError);
      toast.error({
        description: 'The conversation could not be loaded. Showing this email only.',
      });
    }
  }, [threadError, toast]);

  // ------------------------------------------------------------------
  // DELETE & MOVE OPERATIONS WITH OPTIMISTIC UPDATES
  // (UIDs are per folder: an email is identified by folderPath + id)
  // ------------------------------------------------------------------

  function FilteredListLength(movedEmail: EmailLike) {
    const remaining = listofThreadEmails.filter((e) => !isSameEmail(e, movedEmail));

    if (remaining.length === 0) {
      onBack?.();
    } else {
      // Optimistically update UI
      optimisticallyRemove(movedEmail);
    }
  }

  function deletedThreadMessage(emailToDelete: EmailLike) {
    const emailIdNum = Number(emailToDelete.id);
    const actualFolderPath = emailToDelete.folderPath || folderPath || folder || 'INBOX';
    const remainingAfter = () =>
      listofThreadEmails.filter((e) => !isSameEmail(e, emailToDelete)).length;

    if (specialFolders.isFolder(actualFolderPath, 'trash')) {
      // Permanent delete - optimistically remove immediately
      optimisticallyRemove(emailToDelete);

      deleteMutate(
        {
          path: actualFolderPath,
          body: [emailIdNum],
        },
        {
          onSuccess: (res) => {
            const message = (res as unknown as { message?: string })?.message;
            toast.success({ description: message || 'Email permanently deleted.' });

            // Invalidate to ensure consistency
            invalidateThread();

            // Check if we should close the view
            if (remainingAfter() === 0) onBack?.();
          },
          onError: (error) => {
            // Restore on error
            optimisticallyRestore(emailToDelete);

            toast.error({ description: error?.message || 'Failed to delete email.' });
          },
        }
      );
    } else {
      // Move to Trash - with undo support. The move is delayed by undoTime, so
      // Undo normally just cancels it (the email never left its folder).
      let undoTimeoutId: NodeJS.Timeout | null = null;
      let hasMoved = false;

      // Optimistically remove from UI
      optimisticallyRemove(emailToDelete);

      toast.success({
        description: 'Email moved to trash',
        undo: {
          label: 'Undo',
          onClick: () => {
            // Too late: the email is already in Trash under a new UID there, so it
            // can't be moved back by this one (that would move a different email)
            if (hasMoved) {
              toast.error({ description: 'The email was already moved to Trash.' });
              invalidateThread();
              return;
            }

            // Cancel the delayed move and restore the UI
            if (undoTimeoutId) clearTimeout(undoTimeoutId);
            optimisticallyRestore(emailToDelete);
            toast.success({ description: 'Undo successful' });
          },
          duration: undoTime,
        },
      });

      // Delay the actual move to allow undo
      undoTimeoutId = setTimeout(() => {
        hasMoved = true;
        moveMutate(
          {
            path: actualFolderPath,
            sourceFolder: actualFolderPath,
            destFolder: specialFolders.trash,
            body: [emailIdNum],
          },
          {
            onSuccess: () => {
              // Confirm the optimistic update
              invalidateThread();

              if (remainingAfter() === 0) onBack?.();
            },
            onError: (error) => {
              // Restore on error
              optimisticallyRestore(emailToDelete);

              toast.error({ description: error?.message || 'Failed to move email.' });
            },
          }
        );
      }, undoTime);
    }
  }

  // ------------------------------------------------------------------
  // RENDER HELPERS
  // ------------------------------------------------------------------

  const renderHeaderInfo = () => {
    if (Object.keys(headers).length === 0) return null;

    const importantHeaders = [
      'From',
      'To',
      'Cc',
      'Bcc',
      'Subject',
      'Date',
      'Message-ID',
      'Reply-To',
    ];
    const presentImportantHeaders = importantHeaders.filter((key) => headers[key]);
    const otherHeaders = Object.keys(headers).filter((key) => !importantHeaders.includes(key));
    const allHeaders = [...presentImportantHeaders, ...otherHeaders];

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[var(--gray-6)]">
          <FaEnvelope size={14} className="text-[var(--accent-9)]" />
          <span className="text-sm font-medium text-[var(--gray-12)]">Email Headers</span>
        </div>

        {allHeaders.map((key, index) => {
          const isImportant = importantHeaders.includes(key);
          const displayValue = isImportant ? decodeWords(headers[key]) : headers[key];

          return (
            <div key={key}>
              <div className="grid grid-cols-[120px_1fr] gap-3 text-sm py-1">
                <span className="font-medium text-[var(--gray-11)] truncate" title={key}>
                  {key}:
                </span>
                <span
                  className={`text-[var(--gray-12)] break-all ${!isImportant ? 'font-mono text-xs' : ''}`}
                >
                  {displayValue}
                </span>
              </div>
              {index < allHeaders.length - 1 && <Separator size="4" className="w-full my-1" />}
            </div>
          );
        })}
      </div>
    );
  };

  // ------------------------------------------------------------------
  // RENDER LOGIC
  // ------------------------------------------------------------------

  if (isThreadedViewActive) {
    return (
      <>
        <ThreadView
          listofThreadEmails={listofThreadEmails}
          messageId={messageId}
          folderPath={folderPath}
          matchedEmailIds={email?.thread?.matchedEmailIds}
          date={date}
          onContentLoaded={onContentLoaded}
          splitView={splitView}
          onBack={onBack}
          formatUserDateNice={formatUserDateNice}
          onReply={onReply}
          onForward={onForward}
          onForwardAsAttachment={onForwardAsAttachment}
          onReplyAll={onReplyAll}
          onEditAsNew={onEditAsNew}
          onSaveAsContact={onSaveAsContact}
          handleSingleEmailDelete={deletedThreadMessage}
          isLoadingInitial={isThreadLoading}
          FilteredListLength={FilteredListLength}
          handleSingleEmailMarkAsFlagged={handleSingleEmailMarkAsFlagged}
          handleSingleEmailMarkAsRead={handleSingleEmailMarkAsRead}
          reFetchMails={() => invalidateThread()}
          // Pass fetching state for loading indicators during background updates
          isRefetching={isThreadFetching && !isThreadLoading}
        />
        {readReceiptDialog}
      </>
    );
  }

  return (
    <>
    <SingleEmailView
      isLoading={isLoading}
      error={viewError ? emailViewErrorMessage(viewError) : null}
      parsedEmail={parsedEmail}
      headers={headers}
      subject={subject}
      senderEmail={senderEmail}
      date={date}
      isFlagged={isFlagged}
      isHeaderPopoverOpen={isHeaderPopoverOpen}
      folder={folder}
      splitView={splitView}
      onBack={onBack}
      onDraftSend={onDraftSend}
      messageId={messageId}
      folderPath={folderPath}
      formatUserDateNice={formatUserDateNice}
      setIsHeaderPopoverOpen={setIsHeaderPopoverOpen}
      renderHeaderInfo={renderHeaderInfo}
    />
    {readReceiptDialog}
    </>
  );
};

export default EmailViewer;
