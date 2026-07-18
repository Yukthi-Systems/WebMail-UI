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

import { Separator, Popover, Button } from '@radix-ui/themes';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEmailRaw } from '../../../../../../hooks/useEmailRaw';
import EmailLoadingState from '../../EmailLoadingState';
import EmailParsingState from '../../EmailParsingState';
import EmailErrorState from '../../EmailErrorState';
import EmailNoDataState from '../../EmailNoDataState';
import EmailTabs, { type ParsedEmailForTabs } from '../../EmailTabs';
import PostalMime, { decodeWords } from 'postal-mime';
import {
  FaCalendarAlt,
  FaEnvelope,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaRegFolder,
  FaFlag,
} from 'react-icons/fa';
import BIMIAvatar from '../../../../../common/BimiAvatar';
import { Link, useParams } from '@tanstack/react-router';
import { parseEmail } from '../../../../../../utils/emailPerser';
import { useUserTimezone } from '../../../../../../hooks/useTimezone';
import { EmailActions } from './EmailActions';
import { RecipientSection } from '../../RecipientSection';
import {
  extractHeaders,
  getMessageId,
  normalizeFieldNames,
  parseMultipleEmails,
} from '../../../../../../utils/emailUtils';
import { useToast } from '../../../../../../hooks/useToast';
import {
  useCopyMail,
  useMoveMail,
  useSeenMail,
  useUnseenMail,
  useFlaggedMail,
  useUnFlaggedMail,
} from '../../../../../../hooks/useEmails';
import { useAtomValue } from 'jotai';
import { folderQuotaAtom } from '../../../../../../state/folders';
import { useEmailCacheUpdater } from '../../../../../../hooks/useEmailCacheUpdater';
import { useUpdateFolderUnreadCount } from '../../../../../../hooks/useFolders';
import FolderDialog from '../../../MoveEmail';
import { printEmail, viewEmailInWindow, viewEmailRaw } from '../../../../../../utils/emailPrint';
import { userDetailsAtom } from '../../../../../../state/userDetails';
import { useCreateEmailTemplate, useTemplateActions } from '../../../../../../hooks/useTempelate';
import type { EmailLike } from '../../../../../../utils/emailThreading';
import type { Email as ParsedEmail } from 'postal-mime';

interface Folder {
  id: string;
  name: string;
  count?: number;
  color?: string;
  children?: Folder[];
  path?: string;
}

interface ThreadEmailCardProps {
  threadEmail: EmailLike;
  folderPath: string;
  isCurrentEmail: boolean;
  onContentLoaded?: (content: string) => void;
  foundedIn: string;
  onReply?: (email: EmailLike) => void;
  onForward?: (email: EmailLike) => void;
  onForwardAsAttachment?: (email: EmailLike, rawContent: string) => void;
  onReplyAll?: (email: EmailLike) => void;
  handleSingleEmailDelete?: (emailId: string) => void;
  onBack?: () => void;
  FilteredListLength?: (emailId: string) => void;
  handleSingleEmailMarkAsFlagged?: (emailId: string, action: boolean) => void;
  handleSingleEmailMarkAsRead?: (emailId: string, action: boolean) => void;
  reFetchMails?: () => void;
  onSaveAsContact?: () => void;
  onEditAsNew?: (email: EmailLike) => void;
}

const ThreadEmailCard = ({
  threadEmail,
  folderPath,
  isCurrentEmail,
  onContentLoaded,
  foundedIn,
  onReply = () => {},
  onForward = () => {},
  onForwardAsAttachment,
  onReplyAll = () => {},
  handleSingleEmailDelete = () => {},
  FilteredListLength = () => {},
  reFetchMails = () => {},
  onEditAsNew = () => {},
  onSaveAsContact,
}: ThreadEmailCardProps) => {
  const { slug, folder: folderNameParam } = useParams({ strict: false });
  const folderName = folderNameParam ?? '';
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | string | undefined | null>(
    undefined
  );
  const { mutate: moveMutate } = useMoveMail();
  const { mutate: copyMutate } = useCopyMail();
  const { mutate: seenMutate } = useSeenMail();
  const { mutate: unseenMutate } = useUnseenMail();
  const { mutate: flagMutate } = useFlaggedMail();
  const { mutate: unflagMutate } = useUnFlaggedMail();

  const folderQuota = useAtomValue(folderQuotaAtom);
  const isQuotaExceeded = folderQuota?.used_percent !== undefined && folderQuota.used_percent > 98;

  const { prepareTemplateFromCache } = useTemplateActions();
  const [isExpanded, setIsExpanded] = useState(isCurrentEmail);

  // ✅ FIX 1: Ensure current email always expands when isCurrentEmail changes
  useEffect(() => {
    if (isCurrentEmail) {
      setIsExpanded(true);
    }
  }, [isCurrentEmail]);

  const {
    data: rawEmail,
    isLoading,
    refetch,
  } = useEmailRaw(String(threadEmail.id), folderPath, getMessageId(threadEmail) || '', false);

  const { patchEmailFlags } = useEmailCacheUpdater(folderPath);
  const updateFolderUnreadCount = useUpdateFolderUnreadCount(folderPath);

  const [parsedEmail, setParsedEmail] = useState<ParsedEmail | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [, setHeaders] = useState<Record<string, string>>({});
  const lastParsedEmailId = useRef<string>('');
  const [isHeaderPopoverOpen, setIsHeaderPopoverOpen] = useState<boolean>(false);

  const userDetails = useAtomValue(userDetailsAtom);
  const { name: senderName, email: senderEmailParsed } = parseEmail(threadEmail.From as string);

  const normalizedHeaders = normalizeFieldNames(threadEmail);

  const toRecipients = parseMultipleEmails((normalizedHeaders.to as string) || '');
  const ccRecipients = parseMultipleEmails((normalizedHeaders.cc as string) || '');
  const bccRecipients = parseMultipleEmails((normalizedHeaders.bcc as string) || '');

  const { formatUserDateNice } = useUserTimezone();
  const createTemplateMutation = useCreateEmailTemplate();

  const handleDelete = async (id: string) => {
    handleSingleEmailDelete(id);
  };

  const parseEmailContent = useCallback(
    async (emailContent: string) => {
      setIsParsing(true);
      try {
        const parsed = await PostalMime.parse(emailContent, {
          attachmentEncoding: 'base64',
        });
        setParsedEmail(parsed);
        setParseError(null);

        if (onContentLoaded) {
          const content = parsed.html || parsed.text || '';
          onContentLoaded(content);
        }
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Failed to parse email');
        setParsedEmail(null);
      } finally {
        setIsParsing(false);
      }
    },
    [onContentLoaded]
  );

  const handleSaveAsTemplate = async (email: EmailLike) => {
    try {
      // 1. Fetch full details via the raw API (as required by your backend)
      const { subject, body } = await prepareTemplateFromCache(
        String(email.id),
        email.folderPath || 'INBOX'
      );

      // 2. Save to templates
      await createTemplateMutation.mutateAsync({
        name: `Template: ${subject.slice(0, 30)}`,
        subject: subject,
        body: body,
        is_public: false,
        meta_data: {
          created_by: userDetails?.email || 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      toast.success({
        description: 'Saved! View it in Settings > Templates',
      });
    } catch {
      toast.error({
        description: 'Failed to process email for template',
      });
    }
  };

  useEffect(() => {
    if (isExpanded && rawEmail && lastParsedEmailId.current !== `${threadEmail.id}-${folderPath}`) {
      lastParsedEmailId.current = `${threadEmail.id}-${folderPath}`;
      const headerMap = extractHeaders(rawEmail);
      setHeaders(headerMap);
      parseEmailContent(rawEmail);

      // Backend already marked as read via mark_as_read=true on the raw fetch.
      // Sync frontend: update the email list cache FLAGS and decrement folder unread count.
      if (!threadEmail.FLAGS?.includes('\\Seen')) {
        patchEmailFlags([Number(threadEmail.id)], '\\Seen');
        updateFolderUnreadCount(-1);
      }
    } else if (isExpanded && !rawEmail && !isLoading) {
      refetch();
    }
  }, [
    rawEmail,
    threadEmail.id,
    threadEmail.FLAGS,
    folderPath,
    isExpanded,
    parseEmailContent,
    refetch,
    isLoading,
    patchEmailFlags,
    updateFolderUnreadCount,
  ]);

  const renderHeaderInfo = () => {
    const omitKeys = ['FLAGS', 'Thread-List', 'Thread-View', '_inReplyTo', '_references', 'id'];
    const filteredHeaders = Object.fromEntries(
      Object.entries(threadEmail).filter(([key]) => !omitKeys.includes(key))
    );

    if (Object.keys(filteredHeaders).length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[var(--gray-6)] text-nowrap">
          <FaEnvelope size={14} className="text-[var(--accent-9)]" />
          <span className="text-sm font-medium text-[var(--gray-12)] text-nowrap">
            Email Headers
          </span>
        </div>

        {Object.entries(filteredHeaders).map(([key, value], index) => (
          <div key={key}>
            <div className="grid grid-cols-[120px_1fr] gap-2 text-xs py-1">
              <span className="font-medium text-[var(--gray-10)] truncate">{key}:</span>
              <span className="text-[var(--gray-11)] break-all font-mono">{String(value)}</span>
            </div>
            {index < Object.keys(filteredHeaders).length - 1 && (
              <Separator size="4" className="w-full my-1" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleFolderSelect = (folder: Folder, action: 'move' | 'copy') => {
    if (action === 'copy' && isQuotaExceeded) {
      toast.error({
        description:
          'Cannot copy emails: Storage quota exceeded (98%+ used). Please free up space.',
      });
      setCopyDialogOpen(false);
      return;
    }

    setSelectedFolder(folder);
    const mutation = action === 'move' ? moveMutate : copyMutate;

    const actualFolderPath = folderPath || folderName || 'INBOX';

    mutation(
      {
        path: actualFolderPath,
        sourceFolder: actualFolderPath,
        destFolder: folder?.path || folderName || '',
        body: [Number(threadEmail?.id)],
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setCopyDialogOpen(false);
          setSelectedFolder('');
          FilteredListLength(String(threadEmail?.id));
        },
        onError: () => {
          if (action === 'copy' && isQuotaExceeded) {
            toast.error({
              description: 'Failed to copy: Storage quota exceeded.',
            });
          }
        },
      }
    );
  };

  const handleMoveClick = () => {
    if (isQuotaExceeded) {
      toast.error({
        description: 'Cannot move emails: Storage quota exceeded.',
      });
      return;
    }
    setDialogOpen(true);
  };

  const handleCopyClick = () => {
    if (isQuotaExceeded) {
      toast.error({
        description: 'Cannot copy emails: Storage quota exceeded.',
      });
      return;
    }
    setCopyDialogOpen(true);
  };

  const handleThreadPrint = (email: EmailLike) => {
    // Use parsedEmail state we already have in this component
    const content = parsedEmail?.html || parsedEmail?.text || '';
    const attachments = parsedEmail?.attachments || [];
    printEmail(email, content, attachments);
  };

  const handleThreadDownload = async (email: EmailLike) => {
    try {
      // If we don't have rawEmail in state yet, we refetch it
      const content = rawEmail || (await refetch()).data;
      if (!content) return;

      const blob = new Blob([content], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(email.Subject || 'email').replace(/[^a-z0-9]/gi, '_')}.eml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error({ description: 'Failed to download email' });
    }
  };

  const handleThreadForwardAsAttachment = async () => {
    try {
      const content = rawEmail || (await refetch()).data;
      if (!content) {
        toast.error({ description: 'Failed to load email content' });
        return;
      }
      onForwardAsAttachment?.(threadEmail, content);
    } catch {
      toast.error({ description: 'Failed to prepare email for forwarding as attachment' });
    }
  };

  const isFlagged = threadEmail?.FLAGS?.includes('\\Flagged');
  const readStatus = threadEmail?.FLAGS?.includes('\\Seen');

  const isSent = folderPath.toLowerCase() === 'sent' || foundedIn?.toLowerCase() === 'sent';
  const isTrash = folderPath.toLowerCase() === 'trash' || foundedIn?.toLowerCase() === 'trash';

  // Local handlers that use this email's actual folderPath — prevents the parent's
  // handler from using the URL folder param (e.g. INBOX) for Sent emails in a thread.
  const handleThreadMarkAsRead = (emailId: string, isRead: boolean) => {
    const emailIdNum = Number(emailId);
    const wasUnread = !threadEmail.FLAGS?.includes('\\Seen');
    const loadingId = toast.loading({
      description: isRead ? 'Marking as read...' : 'Marking as unread...',
    });
    const actualFolderPath = folderPath || folderName || 'INBOX';

    if (isRead) {
      seenMutate(
        { path: actualFolderPath, body: [emailIdNum] },
        {
          // mutate's declared response type (EmailFolders) doesn't match what the
          // backend actually sends back ({ message }) — pre-existing API-layer
          // mismatch, preserved via cast rather than "fixed" here.
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description: (res as unknown as { message?: string })?.message || 'Marked as read.',
            });
            patchEmailFlags([emailIdNum], '\\Seen');
            if (wasUnread) updateFolderUnreadCount(-1);
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error?.message || 'Failed to mark as read.' });
          },
        }
      );
    } else {
      unseenMutate(
        { path: actualFolderPath, body: [emailIdNum] },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Marked as unread.',
            });
            patchEmailFlags([emailIdNum], undefined, '\\Seen');
            if (!wasUnread) updateFolderUnreadCount(1);
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error?.message || 'Failed to mark as unread.' });
          },
        }
      );
    }
  };

  const handleThreadMarkAsFlagged = (emailId: string, action: boolean) => {
    const emailIdNum = Number(emailId);
    const loadingId = toast.loading({ description: action ? 'Unflagging...' : 'Flagging...' });
    const actualFolderPath = folderPath || folderName || 'INBOX';
    if (action) {
      unflagMutate(
        { path: actualFolderPath, body: [emailIdNum] },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description: (res as unknown as { message?: string })?.message || 'Email unflagged.',
            });
            patchEmailFlags([emailIdNum], undefined, '\\Flagged');
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error?.message || 'Failed to unflag email.' });
          },
        }
      );
    } else {
      flagMutate(
        { path: actualFolderPath, body: [emailIdNum] },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description: (res as unknown as { message?: string })?.message || 'Email flagged.',
            });
            patchEmailFlags([emailIdNum], '\\Flagged');
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error?.message || 'Failed to flag email.' });
          },
        }
      );
    }
  };

  const getBorderClass = () => {
    if (isSent) return 'border-l-4 border-l-[var(--teal-9)]';
    if (isTrash) return 'border-l-4 border-l-[var(--red-9)]';
    if (isCurrentEmail) return 'border-l-4 border-l-[var(--accent-9)]';
    if (isFlagged) return 'border-l-4 border-l-[var(--red-9)]';
    if (!readStatus) return 'border-l-4 border-l-[var(--blue-8)]';
    return 'border-l-4 border-l-[var(--gray-6)]';
  };

  const getBackgroundClass = () => {
    if (isExpanded) return 'bg-[var(--color-surface)] shadow-md';
    if (isFlagged) return 'bg-[var(--red-3)] hover:bg-[var(--red-4)]';
    return 'bg-[var(--gray-2)] hover:bg-[var(--gray-3)]';
  };

  return (
    <>
      <div
        className={`
          w-full transition-all duration-200
          border-y md:border border-[var(--gray-5)]
          ${getBorderClass()}
          ${getBackgroundClass()}
          md:rounded-lg
        `}
      >
        {foundedIn && (
          <div className="px-3 md:px-4 pt-2 text-xs text-[var(--gray-10)] flex items-center gap-1">
            <Link
              to={slug ? '/$slug/folder/$folder' : '/folder/$folder'}
              params={slug ? { slug, folder: folderPath || '' } : { folder: folderPath || '' }}
              className="flex gap-1 items-center hover:text-[var(--accent-11)] transition-colors"
            >
              <FaRegFolder size={12} />
              <span>Found in {foundedIn}</span>
            </Link>
          </div>
        )}

        {/* Main Card Content */}
        <div className="p-3">
          {/* Header: avatar + content column */}
          <div className="flex items-start gap-2 md:gap-3">
            <div className="mt-0.5 md:mt-1 flex-shrink-0">
              <BIMIAvatar email={senderEmailParsed} name={senderName} size={24} />
            </div>

            <div className="flex-1 min-w-0">
              {/* Row 1: sender name (flex-1, truncates) | actions | expand */}
              <div className="flex items-center gap-2 mb-1">
                {/* Clickable sender name */}
                <div
                  className="flex-1 min-w-0 flex items-center gap-1.5 cursor-pointer overflow-hidden"
                  onClick={toggleExpanded}
                >
                  {!readStatus && (
                    <span
                      className="w-2 h-2 rounded-full bg-[var(--blue-9)] flex-shrink-0"
                      title="Unread"
                    />
                  )}
                  <span
                    title={senderEmailParsed}
                    className={`text-sm md:text-base truncate ${!readStatus ? 'font-bold text-[var(--gray-12)]' : 'font-medium text-[var(--gray-12)]'}`}
                  >
                    {senderName} &lt;{senderEmailParsed}&gt;
                  </span>
                  {isSent && (
                    <span className="text-xs font-normal text-[var(--gray-10)] flex-shrink-0">
                      (Me)
                    </span>
                  )}
                  {isFlagged && (
                    <span
                      className="text-[var(--red-9)] flex-shrink-0 flex items-center"
                      title="Flagged"
                    >
                      <FaFlag size={11} className="md:w-3 md:h-3" />
                    </span>
                  )}
                </div>

                {/* Actions + expand — non-clickable */}
                <div
                  className="flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <EmailActions
                      email={threadEmail}
                      onSaveAsTemplate={handleSaveAsTemplate}
                      onReply={onReply}
                      onReplyAll={onReplyAll}
                      onForward={onForward}
                      onForwardAsAttachment={handleThreadForwardAsAttachment}
                      onDelete={handleDelete}
                      onMove={handleMoveClick}
                      onCopy={handleCopyClick}
                      handleSingleEmailMarkAsFlagged={handleThreadMarkAsFlagged}
                      handleSingleEmailMarkAsRead={handleThreadMarkAsRead}
                      reFetchMails={reFetchMails}
                      onPrint={handleThreadPrint}
                      onDownload={handleThreadDownload}
                      onEditAsNew={onEditAsNew}
                      onSaveAsContact={onSaveAsContact}
                      onViewInWindow={(e) =>
                        viewEmailInWindow(
                          e,
                          parsedEmail?.html || parsedEmail?.text || '',
                          parsedEmail?.attachments || []
                        )
                      }
                      onViewInRaw={async () => {
                        const content = rawEmail || (await refetch()).data;
                        if (content) viewEmailRaw(content);
                      }}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="1"
                    className="flex-shrink-0 hover:bg-[var(--gray-4)] min-w-[32px] h-8"
                    onClick={toggleExpanded}
                  >
                    {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </Button>
                </div>
              </div>

              {/* Row 2: Subject — always full width, never competes with toolbar */}
              <div
                className={`text-sm ${readStatus ? 'font-medium' : ''} text-[var(--gray-11)] mb-2 line-clamp-2 md:line-clamp-1 cursor-pointer`}
                onClick={toggleExpanded}
              >
                {decodeWords(threadEmail.Subject || '') || '(No Subject)'}
              </div>

              {/* Row 3: Date + Email Headers popover */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-[var(--gray-10)]">
                  <FaCalendarAlt size={10} />
                  <span className="text-nowrap">{formatUserDateNice(threadEmail.Date)}</span>
                </div>

                <Popover.Root open={isHeaderPopoverOpen} onOpenChange={setIsHeaderPopoverOpen}>
                  <Popover.Trigger>
                    <button
                      className="flex items-center gap-1 text-xs text-[var(--gray-10)] hover:text-[var(--accent-11)] transition-colors p-1 -ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaInfoCircle size={11} />
                      <span className="text-nowrap">Email Headers</span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Content
                    className="w-[90vw] sm:w-[500px] max-w-[90vw] max-h-[400px] overflow-y-auto bg-[var(--color-surface)] border border-[var(--gray-6)] shadow-lg rounded-lg p-3 md:p-4"
                    side="bottom"
                    align="start"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderHeaderInfo()}
                  </Popover.Content>
                </Popover.Root>
              </div>
            </div>
          </div>

          {/* ✅ Recipients section - FULL WIDTH, outside the flex container */}
          {isExpanded && (
            <div
              className="mt-3 ml-0 md:ml-9 text-xs text-[var(--gray-10)] space-y-1"
              onClick={toggleExpanded}
            >
              <RecipientSection recipients={toRecipients} label="To" />
              <RecipientSection recipients={ccRecipients} label="Cc" />
              <RecipientSection recipients={bccRecipients} label="Bcc" />
            </div>
          )}
        </div>

        {/* EXPANDED CONTENT AREA */}
        {isExpanded && (
          <div className="px-3 pb-3 border-t border-[var(--gray-5)] pt-3 bg-[var(--color-surface)] md:rounded-b-lg">
            <div className="space-y-4">
              <div>
                {isLoading && <EmailLoadingState />}
                {isParsing && <EmailParsingState />}
                {parseError && <EmailErrorState error={parseError} rawContent={rawEmail || ''} />}
                {!isLoading && !isParsing && !parseError && !parsedEmail && <EmailNoDataState />}
                {!isLoading && !isParsing && !parseError && parsedEmail && (
                  <EmailTabs
                    key={`${threadEmail.id}-${folderPath}`}
                    parsedEmail={parsedEmail as unknown as ParsedEmailForTabs}
                    rawEmail={rawEmail || ''}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <FolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onFolderSelect={(folder) => handleFolderSelect(folder, 'move')}
        currentFolder={selectedFolder}
        title="Move to folder"
      />

      <FolderDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onFolderSelect={(folder) => handleFolderSelect(folder, 'copy')}
        currentFolder={selectedFolder}
        title="Copy to folder"
        isQuotaExceeded={isQuotaExceeded}
      />
    </>
  );
};

export default ThreadEmailCard;
