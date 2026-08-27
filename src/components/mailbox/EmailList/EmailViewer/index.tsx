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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEmailRaw } from '../../../../hooks/useEmailRaw';
import { flagAtom } from '../../../../state/flags';
import { useAtom, useAtomValue } from 'jotai';
import { useUserTimezone } from '../../../../hooks/useTimezone';
import { folderDetailsAtom } from '../../../../state/folders';
import { useUpdateFolderUnreadCount } from '../../../../hooks/useFolders';
import { useEmailCacheUpdater } from '../../../../hooks/useEmailCacheUpdater';
import { userSettingsAtom } from '../../../../state/settings';
import { useParams } from '@tanstack/react-router';
import { ThreadView } from './ThreadView';
import { SingleEmailView } from './SingleEmailView';
import { useEmailParser } from '../../../../hooks/useEmailParser';
import { extractIds, getMessageId, getReadReceiptRequest } from '../../../../utils/emailUtils';
import { AlertDialog, Button, Flex, Separator, Text } from '@radix-ui/themes';
import { FaEnvelope } from 'react-icons/fa';
import { decodeWords } from 'postal-mime';
import { useDeleteMail, useMoveMail } from '../../../../hooks/useEmails';
import { useToast } from '../../../../hooks/useToast';
import { useThreadEmails, useThreadMutations } from '../../../../hooks/useThreadEmails';
import { useSendMail } from '../../../../hooks/useComposer';
import { generateMessageId, type ComposerRequest } from '../../../../api/composer';
import { emailAddress } from '../../../../state/emailAddress';
import { userDetailsAtom } from '../../../../state/userDetails';
import { SEND_DEFAULT } from '../../../../constants/constant';
import type { EmailLike } from '../../../../utils/emailThreading';
import type { Attachment } from 'postal-mime';

interface EmailViewerProps {
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
  onAttachmentsLoaded?: (attachments: Attachment[]) => void;
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
  // Build a stable cache/parser key that uniquely identifies this email.
  // Prefer the IMAP Message-ID (globally unique). For emails that lack one,
  // fall back to seq-id + Subject + Date so that a different email which
  // inherits the same sequence ID after deletions never maps to the same key.
  const stableEmailKey =
    getMessageId(email) || `${messageId}-${email?.Subject || ''}-${email?.Date || ''}`;

  const { data: rawEmail, isLoading } = useEmailRaw(
    messageId,
    folderPath ?? '',
    stableEmailKey,
    true
  );
  const [folderDetails] = useAtom(folderDetailsAtom);
  const [isHeaderPopoverOpen, setIsHeaderPopoverOpen] = useState(false);
  const { folder } = useParams({ strict: false });
  const [viewingEmailFlag] = useAtom(flagAtom);
  const updateFolderUnreadCount = useUpdateFolderUnreadCount(folderPath || 'INBOX');
  const { patchEmailFlags } = useEmailCacheUpdater(folderPath || 'INBOX');

  const userSettings = useAtomValue(userSettingsAtom);
  const [undoTime, setUndoTime] = useState<number>(5000);
  const { formatUserDateNice } = useUserTimezone();
  const { mutate: deleteMutate } = useDeleteMail();
  const { mutate: moveMutate } = useMoveMail();
  const toast = useToast();

  // When useEmailRaw fetches fresh (not from prefetch cache), invalidate the folder
  // to update the unread count. isLoading is true only on initial fetch (no cached data).
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && rawEmail && !email?.FLAGS?.includes('\\Seen')) {
      patchEmailFlags([Number(email?.id)], '\\Seen');
      updateFolderUnreadCount(-1);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, rawEmail, email, folderPath, patchEmailFlags, updateFolderUnreadCount]);

  useEffect(() => {
    if (userSettings?.email) {
      const time = Number(userSettings?.email?.undo_send || 5) * 1000;
      setUndoTime(time);
    }
  }, [userSettings]);

  const { parsedEmail, parseError, isParsing, headers } = useEmailParser({
    rawEmail,
    key: `${stableEmailKey}-${folderPath}`,
    onContentLoaded,
    onAttachmentsLoaded,
  });

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
  const readReceiptStorageKey = `webmail-read-receipt-${stableEmailKey}`;

  useEffect(() => {
    if (isLoading || isParsing || !readReceiptRequest) return;

    // Never prompt on an email the current user sent themselves.
    if (
      currentUser?.address &&
      readReceiptRequest.email.toLowerCase() === currentUser.address.toLowerCase()
    ) {
      return;
    }

    if (localStorage.getItem(readReceiptStorageKey)) return;

    setShowReadReceiptPrompt(true);
  }, [isLoading, isParsing, readReceiptRequest, currentUser?.address, readReceiptStorageKey]);

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
      folder_path: SEND_DEFAULT || 'Sent',
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

  const threadedView = userSettings?.email?.mail_thead_view || 'all threads';

  const flagged = '\\Flagged';

  const isFlagged = useMemo(() => {
    if (viewingEmailFlag && Array.isArray(viewingEmailFlag)) {
      return viewingEmailFlag.includes(flagged);
    }
    return false;
  }, [viewingEmailFlag]);

  // Threading is enabled for this folder if it's not explicitly set to "list" mode.
  // No folder-name restriction — threading works in Inbox, Sent, [Gmail]/Sent Mail,
  // custom folders, etc.
  const isFolderThread = useMemo(() => {
    const folderThreadView = userSettings?.folders || {};
    const folderKey = folder?.toLowerCase() || '';
    const value = folderThreadView?.[folderKey]?.list_thread_view ?? 'threads';
    return value === 'threads';
  }, [folder, userSettings]);

  // ------------------------------------------------------------------
  // FLAWLESS THREAD LOGIC
  // ------------------------------------------------------------------

  // 1. Calculate the required Message IDs (Stable memoization)
  const requiredMessageIds = useMemo(() => {
    if (!email) return [];

    const references = email['References'] ? extractIds(email['References'] as string) : [];
    const threadRefs = (email['Thread-Reference'] as string[]) || [];
    const currentId = getMessageId(email);

    // Combine all relevant IDs
    const ids = [...new Set([...threadRefs, ...references, currentId])];

    // Only return IDs if we actually need to fetch a thread
    const needsThreading = email['Thread-View'] === true || ids.length > 1;

    return needsThreading ? ids : [];
  }, [email]);

  // 2. Resolve Sent and Inbox folder names from IMAP flags — handles Gmail-style
  //    folders like [Gmail]/Sent Mail without any hardcoded name checks.
  const sentFolderName = useMemo(() => {
    if (!Array.isArray(folderDetails)) return 'Sent';
    const sentFolders = folderDetails.filter((f) => f.flags?.includes('Sent'));
    const exactSent = sentFolders.find((f) => f.folder_name === 'Sent');
    return exactSent?.folder_name || sentFolders[0]?.folder_name || 'Sent';
  }, [folderDetails]);

  const inboxFolderName = useMemo(() => {
    if (!Array.isArray(folderDetails)) return 'INBOX';
    const inboxFolder = folderDetails.find((f) => f.flags?.includes('Inbox'));
    return inboxFolder?.folder_name || 'INBOX';
  }, [folderDetails]);

  // 3. Determine if we should fetch threads
  const shouldFetchThreads = isFolderThread && threadedView === 'all threads';

  // 4. The Hook - Fetches from currentFolder + inboxFolder + sentFolder
  const {
    data: listofThreadEmails = [],
    isLoading: isThreadLoading,
    isFetching: isThreadFetching,
    error: threadError,
  } = useThreadEmails(
    requiredMessageIds,
    folderPath || 'INBOX',
    sentFolderName,
    inboxFolderName,
    shouldFetchThreads
  );

  // 5. Thread mutation helpers for optimistic updates
  const { optimisticallyRemove, optimisticallyRestore, invalidateThread } = useThreadMutations(
    folderPath || 'INBOX',
    requiredMessageIds
  );

  // 6. Determine if we are effectively threaded
  // Show threaded view only if we have finished loading and actually found multiple messages.
  // While loading, it will fall back to SingleEmailView so the user sees the parent email immediately without blocking.
  const isThreadedViewActive = shouldFetchThreads && listofThreadEmails.length > 1;

  // Show error state if thread fetch failed
  useEffect(() => {
    if (threadError) {
      console.error('[Thread] Failed to load thread:', threadError);
      toast.error({
        description: 'Some emails in this thread could not be loaded. Showing available messages.',
      });
    }
  }, [threadError, toast]);

  // ------------------------------------------------------------------
  // DELETE & MOVE OPERATIONS WITH OPTIMISTIC UPDATES
  // ------------------------------------------------------------------

  function FilteredListLength(filteredId: string) {
    const emailIdNum = Number(filteredId);
    const remaining = listofThreadEmails.filter((i) => Number(i.id) !== emailIdNum);

    if (remaining.length === 0) {
      onBack?.();
    } else {
      // Optimistically update UI
      optimisticallyRemove(emailIdNum);
    }
  }

  function deletedThreadMessage(deleteId: string) {
    const emailIdNum = Number(deleteId);

    // Find the email for potential restoration
    const emailToDelete = listofThreadEmails.find((e) => Number(e.id) === emailIdNum);
    const actualFolderPath = emailToDelete?.folderPath || folderPath || folder || 'INBOX';

    if (actualFolderPath.toLowerCase() === 'trash') {
      // Permanent delete - optimistically remove immediately
      optimisticallyRemove(emailIdNum);

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
            const remaining = listofThreadEmails.filter((i) => Number(i.id) !== emailIdNum);
            if (remaining.length === 0) onBack?.();
          },
          onError: (error) => {
            // Restore on error
            if (emailToDelete) optimisticallyRestore(emailToDelete);

            toast.error({ description: error?.message || 'Failed to delete email.' });
          },
        }
      );
    } else {
      // Move to Trash - with undo support
      let undoTimeoutId: NodeJS.Timeout | null = null;

      // Optimistically remove from UI
      optimisticallyRemove(emailIdNum);

      toast.success({
        description: 'Email moved to trash',
        undo: {
          label: 'Undo',
          onClick: () => {
            // Cancel the delayed move
            if (undoTimeoutId) clearTimeout(undoTimeoutId);

            // Restore to UI immediately
            if (emailToDelete) optimisticallyRestore(emailToDelete);

            // Actually move it back
            moveMutate(
              {
                path: 'Trash',
                sourceFolder: 'Trash',
                destFolder: actualFolderPath,
                body: [emailIdNum],
              },
              {
                onSuccess: () => {
                  toast.success({ description: 'Undo successful' });
                  invalidateThread();
                },
                onError: (error) => {
                  // Remove again if undo failed
                  optimisticallyRemove(emailIdNum);
                  toast.error({ description: error?.message || 'Failed to undo.' });
                },
              }
            );
          },
          duration: undoTime,
        },
      });

      // Delay the actual move to allow undo
      undoTimeoutId = setTimeout(() => {
        moveMutate(
          {
            path: actualFolderPath,
            sourceFolder: actualFolderPath,
            destFolder: 'Trash',
            body: [emailIdNum],
          },
          {
            onSuccess: () => {
              // Confirm the optimistic update
              invalidateThread();

              const remaining = listofThreadEmails.filter((i) => Number(i.id) !== emailIdNum);
              if (remaining.length === 0) onBack?.();
            },
            onError: (error) => {
              // Restore on error
              if (emailToDelete) optimisticallyRestore(emailToDelete);

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
      rawEmail={rawEmail}
      isLoading={isLoading}
      isParsing={isParsing}
      parseError={parseError}
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
      onContentLoaded={onContentLoaded}
      onAttachmentsLoaded={onAttachmentsLoaded}
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
