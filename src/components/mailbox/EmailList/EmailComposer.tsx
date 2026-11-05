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

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Button, Dialog, Flex, Text } from '@radix-ui/themes';
import { FaExclamationTriangle } from 'react-icons/fa';
import { mightHaveForgottenAttachment as mightHaveForgottenAttachmentCheck } from '../../../utils/attachmentReminder';
import type { Email } from '../../../api/mailbox';
import type { Email as ParsedPostalEmail, Address as PostalMimeAddress } from 'postal-mime';
import { useParams } from '@tanstack/react-router';
import { useEmailRaw } from '../../../hooks/useEmailRaw';
import { useQueryClient } from '@tanstack/react-query';
import { addPendingReply } from '../../../hooks/useThreadConversation';
import type { EmailLike } from '../../../utils/threads';
import PostalMime, { decodeWords } from 'postal-mime';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useSendMail, useDraftMail } from '../../../hooks/useComposer';
import {
  emailComposerDataAtom,
  resetEmailComposerDataAtom,
  emailComposerOpenAtom,
  emailComposerKeepMountedAtom,
} from '../../../state/emailComposer';
import { emailAddress } from '../../../state/emailAddress';
import RecipientField, { type RecipientFieldHandle } from '../../composer/RecipientField';
import SubjectField from '../../composer/SubjectField';
import ContentEditor from '../../composer/contentEditor';
import AttachmentUploader, {
  type AttachmentUploaderHandle,
} from '../../composer/AttachmentUploader';
import { ComposerDropOverlay, ComposerFooter } from '../../composer/ComposerFrame';
import {
  NO_QUOTE,
  extractQuote,
  hasQuote,
  prepareOutgoingHtml,
  withoutQuote,
  wrapQuote,
  type OriginalQuote,
} from '../../../utils/emailQuote';
import {
  toBase64,
  MAX_TOTAL_SIZE,
  MAX_INDIVIDUAL_FILE_SIZE,
  formatFileSize,
} from '../../composer/attachmentUtils';
import { useDropzone } from 'react-dropzone';
import EmailPriorityField from '../../composer/EmailPriorityField';
import ReadReceiptField from '../../composer/ReadReceiptField';
import { generateMessageId, sendMailV2, type ComposerRequest } from '../../../api/composer';
import { useDeleteMail } from '../../../hooks/useEmails';
import { useToast } from '../../../hooks/useToast';
import { userSettingsAtom } from '../../../state/settings';
import { folderQuotaAtom } from '../../../state/folders';

// Import Utilities
import {
  formatComposedEmailData,
  htmlToPlainText,
  parseEmailAddresses,
  convertPostalMimeAttachments,
  extractHeadersFromRawEmail,
  buildReplyHeaders,
  processIncomingHtml,
  formatReplySubject,
  formatForwardSubject,
  type EmailPriority,
  type EmailHeaders,
  type Address,
  type EmailAttachmentPayload,
} from '../../../utils/replyForwardHelper';
import CustomModal from '../../composer/CustomModal';
import { parseEmail } from '../../../utils/emailPerser';
import { escapeHtml } from '../../../utils/emailPrint';
import { sanitizeEmailHtml } from '../../../utils/sanitizeHTMLContent';
import { userDetailsAtom } from '../../../state/userDetails';
import { useSpecialFolderPaths } from '../../../hooks/useFolders';
import { normalizeFieldNames } from '../../../utils/emailUtils';
import { parseEmailDate } from '../../../utils/dateFormat';
import type { ComposerEmail } from '../../../state/emailComposer';
import type { EmailAddress as RecipientEmailAddress } from '../../../state/composer';

// Recipients built here (from parseEmailAddresses / RecipientField) use the
// {address, name} shape, not the {email, name} shape ComposerEmail declares for
// to/cc/bcc — a pre-existing mismatch, preserved as-is (see CLAUDE.md).
interface ComposerBasicData {
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachmentPayload[];
  headers: EmailHeaders;
  from_id: { email: string; name: string };
}

interface EmailComposerProps {
  email: Email | null;
  mode: 'reply' | 'replyAll' | 'forward' | 'new' | 'draft' | 'editAsNew';
  onClose: () => void;
  onSend: () => void;
  onSendDraft?: (email: Email) => void;
}

// Updated useDebounce hook with cancel function
const useDebounce = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number
) => {
  const timeoutRef = useRef<number | null>(null);

  const debouncedFunction = useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debouncedFunction, cancel] as const;
};

const EmailComposer = ({ email, mode, onClose, onSend }: EmailComposerProps) => {
  const toast = useToast();
  const { folder } = useParams({ strict: false });
  const [composerData, setComposerData] = useAtom(emailComposerDataAtom);
  const resetComposerData = useSetAtom(resetEmailComposerDataAtom);
  const [composerOpen, setComposerOpen] = useAtom(emailComposerOpenAtom);
  const setKeepMounted = useSetAtom(emailComposerKeepMountedAtom);
  const currentEmail = useAtomValue(emailAddress);
  const [isSending, setIsSending] = useState(false);
  const [showAttachmentConfirm, setShowAttachmentConfirm] = useState(false);
  const [pendingSendAction, setPendingSendAction] = useState<(() => void) | null>(null);
  // State for storing original email headers
  const [originalHeaders, setOriginalHeaders] = useState<EmailHeaders>({});
  const [originalMessageId, setOriginalMessageId] = useState<string | string[]>('');
  const [fullViewEnabled, setFullViewEnabled] = useState(false);
  const userSettings = useAtomValue(userSettingsAtom);
  const folderQuota = useAtomValue(folderQuotaAtom);
  const domainUser = useAtomValue(userDetailsAtom);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  // The original of the quote in the editor: sent as is unless the user changes it
  const originalQuoteRef = useRef<OriginalQuote>(NO_QUOTE);
  const attachmentsRef = useRef<AttachmentUploaderHandle>(null);

  const [fieldVisibility, setFieldVisibility] = useState({
    cc: false,
    bcc: false,
  });
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [readReceipt, setReadReceipt] = useState(false);
  // Resolved per mailbox (e.g. "INBOX/Sent" on servers that nest folders under INBOX)
  const specialFolders = useSpecialFolderPaths();
  const [folder_path, setFolderPath] = useState<string>(folder || specialFolders.sent);
  const [sendPath, setSendPath] = useState<string>(specialFolders.sent);
  const [saveDraft, setSaveDraft] = useState<string>(specialFolders.drafts);

  // Refs for recipient fields to access flush method
  const toRef = useRef<RecipientFieldHandle>(null);
  const ccRef = useRef<RecipientFieldHandle>(null);
  const bccRef = useRef<RecipientFieldHandle>(null);

  // ── Undo-send state & refs ──────────────────────────────────────────────────
  const [undoTime, setUndoTime] = useState<number>(5000);
  const pendingEmailRef = useRef<Record<string, unknown> | null>(null);
  const isUndoPeriodRef = useRef(false);
  const isSendInFlightRef = useRef(false);
  // ───────────────────────────────────────────────────────────────────────────

  const { mutate: sendMutate } = useSendMail();
  const { mutate: draftMutate, isPending: isDrafting } = useDraftMail();
  const { mutate: deleteMutate } = useDeleteMail();

  const folderForRaw = email?.folderPath || folder;
  // Not gated on isInitialized: a kept-mounted composer switching to another email must
  // still fetch that email's raw source, or the quote falls back to the placeholder
  const shouldFetchRaw = Boolean(email?.id && mode !== 'new');
  const {
    data: rawEmail,
    isLoading: isLoadingRaw,
    isError: isRawError,
  } = useEmailRaw(email?.id?.toString() || '', folderForRaw || 'INBOX', shouldFetchRaw);

  const queryClient = useQueryClient();
  /**
   * After /email/send succeeded: show a reply in its open conversation as a
   * preview. Its copy reaches the Sent folder
   * through a queue later, and the conversation only reloads when the user asks.
   */
  const announceSent = (sent: Record<string, unknown>) => {
    if (email && (mode === 'reply' || mode === 'replyAll')) {
      const recipients = (sent.to as { email?: string; name?: string }[] | undefined) ?? [];
      const me = currentEmail?.address || '';
      addPendingReply(queryClient, email as unknown as EmailLike, {
        id: `pending-${String(sent.message_id || Date.now())}`,
        folderPath: specialFolders.sent,
        From: currentEmail?.name ? `${currentEmail.name} <${me}>` : me,
        To: recipients
          .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email || ''))
          .join(', '),
        Subject: String(sent.subject || ''),
        Date: new Date().toUTCString(),
        FLAGS: ['\\Seen'],
        pending: { html: String(sent.body_html || ''), text: String(sent.body_text || '') },
      });
    }
  };

  useEffect(() => {
    if (userSettings?.email) {
      const time = Number(userSettings?.email?.undo_send || 5) * 1000;
      setUndoTime(time);
      setSaveDraft(specialFolders.drafts);
      setSendPath(specialFolders.sent);
    }
  }, [userSettings, specialFolders.drafts, specialFolders.sent]);

  useEffect(() => {
    if (folder) {
      setFolderPath(folder);
    } else if (userSettings?.email) {
      setFolderPath(specialFolders.sent);
    }
  }, [folder, userSettings, specialFolders.sent]);

  const isQuotaExceeded = useMemo(() => {
    return folderQuota?.used_percent !== undefined && folderQuota.used_percent > 98;
  }, [folderQuota]);

  const hasAutoSavedRef = useRef(false);
  const emailIdRef = useRef<string | null>(null);
  const isManualSaveRef = useRef(false);
  // Track latest composer data for debounced auto-save to prevent stale closure
  const composerDataRef = useRef(composerData);

  useEffect(() => {
    composerDataRef.current = composerData;
  }, [composerData]);

  // Track dragging in the slideable strip so scrolling does not trigger child buttons
  const isDraggingStripRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const handleStripTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingStripRef.current = false;
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleStripTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
    if (dx > 12 || dy > 12) {
      isDraggingStripRef.current = true;
    }
  }, []);

  const handleStripClickCapture = useCallback((e: React.MouseEvent) => {
    if (isDraggingStripRef.current) {
      e.stopPropagation();
      e.preventDefault();
      setTimeout(() => {
        isDraggingStripRef.current = false;
      }, 50);
    }
  }, []);

  const toggleField = (field: keyof typeof fieldVisibility) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const formatEmailDate = (dateStr: string) => {
    const parsed = parseEmailDate(dateStr);
    if (!parsed) return dateStr;
    try {
      return parsed.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const setupEmailContent = async () => {
      // Wait for the raw source unless the fetch has given up
      if (isLoadingRaw || (shouldFetchRaw && !rawEmail && !isRawError)) {
        setIsLoading(true);
        return;
      }

      if (!email || !email.id) {
        setIsInitialized(true);
        return;
      }

      const normalizedEmails = normalizeFieldNames(email);

      // Keyed by mode too, so reply -> forward on the same email rebuilds the quote
      const currentEmailId = `${email.id}:${mode}`;
      if (emailIdRef.current === currentEmailId && isInitialized) {
        return;
      }

      emailIdRef.current = currentEmailId;
      setIsLoading(true);
      setIsInitialized(false);

      try {
        resetComposerData();
        originalQuoteRef.current = NO_QUOTE;

        const basicData: ComposerBasicData = {
          to: [],
          cc: [],
          bcc: [],
          subject: '',
          html: '',
          text: '',
          attachments: [],
          headers: {},
          from_id: { email: '', name: '' },
        };

        if (mode === 'editAsNew' && email) {
          setIsLoading(true);

          if (rawEmail) {
            const parsed = await PostalMime.parse(rawEmail);
            const allAttachments = parsed.attachments
              ? convertPostalMimeAttachments(parsed.attachments)
              : [];
            const { html, regularAttachments } = processIncomingHtml(
              parsed.html || '',
              allAttachments
            );

            setComposerData((prev) => ({
              ...prev,
              to: [],
              cc: [],
              bcc: [],
              subject: decodeWords(email.Subject) || '',
              html: html,
              text: parsed.text || '',
              // regularAttachments is backend/snake_case-shaped (mime_type, data, content_id),
              // not the composer's own EmailAttachment shape — pre-existing mismatch, unrelated
              // to this pass, preserved as-is.
              attachments: regularAttachments as unknown as typeof prev.attachments,
              from_id: {
                email: currentEmail.address || '',
                name: currentEmail.name || '',
              },
            }));
          }
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        let parsed: ParsedPostalEmail | null = null;
        let allAttachments: EmailAttachmentPayload[] = [];

        if (rawEmail) {
          try {
            parsed = await PostalMime.parse(rawEmail);

            const extractedHeaders = extractHeadersFromRawEmail(rawEmail);
            setOriginalHeaders(extractedHeaders);

            const msgId =
              extractedHeaders['Message-Id'] ||
              extractedHeaders['Message-ID'] ||
              extractedHeaders['message-id'] ||
              extractedHeaders['Message-ID'];
            setOriginalMessageId(msgId || '');

            basicData.headers = extractedHeaders;

            if (parsed.attachments && Array.isArray(parsed.attachments)) {
              allAttachments = convertPostalMimeAttachments(parsed.attachments);
            }
          } catch (parseError) {
            console.error('Failed to parse email:', parseError);
          }
        }

        if (mode === 'draft') {
          if (parsed) {
            const toAddressArray = (
              address: PostalMimeAddress[] | PostalMimeAddress | undefined
            ): Address[] => {
              if (!address) return [];
              if (Array.isArray(address)) {
                return address.map((addr) => ({
                  name: addr.name || '',
                  address: (addr as { address?: string }).address || '',
                }));
              }
              return [
                {
                  name: address.name || '',
                  address: (address as { address?: string }).address || '',
                },
              ];
            };

            basicData.to = toAddressArray(parsed.to);
            basicData.cc = toAddressArray(parsed.cc);
            basicData.bcc = toAddressArray(parsed.bcc);
            basicData.subject = decodeWords(email?.Subject) || '';

            const { html, regularAttachments } = processIncomingHtml(
              parsed.html || '',
              allAttachments
            );
            // A saved reply or forward finds its quote again by the marker
            originalQuoteRef.current = { raw: extractQuote(html), normalized: null };
            basicData.html = html;
            basicData.text = parsed.text || '';
            basicData.attachments = regularAttachments;
          } else {
            basicData.subject = decodeWords(email.Subject) || '';
          }
        } else if (mode === 'reply') {
          const replyToHeader = basicData.headers?.['Reply-To'] || basicData.headers?.['reply-to'];
          const replyAddress = replyToHeader
            ? parseEmailAddresses(replyToHeader as string)
            : parseEmailAddresses(email?.From || '');

          basicData.to = replyAddress;
          basicData.subject = formatReplySubject(email.Subject);
        } else if (mode === 'replyAll') {
          const replyToHeader = basicData.headers?.['Reply-To'] || basicData.headers?.['reply-to'];

          let primaryRecipients;
          if (replyToHeader) {
            primaryRecipients = parseEmailAddresses(replyToHeader as string);
          } else {
            primaryRecipients = [parseEmailAddresses(email.From || '')[0]].filter(Boolean);
          }

          const toAddresses = parseEmailAddresses((normalizedEmails?.to as string) || '');
          const ccAddresses = parseEmailAddresses((normalizedEmails?.cc as string) || '');

          const currentAddress =
            typeof currentEmail === 'string' ? currentEmail : currentEmail?.address;

          const allRecipients = [...toAddresses];
          const filteredRecipients = allRecipients.filter(
            (recipient) => recipient?.address !== currentAddress
          );

          basicData.to = [
            ...primaryRecipients,
            ...filteredRecipients.filter(
              (r) => !primaryRecipients.some((p) => p.address === r.address)
            ),
          ];

          basicData.cc = [...ccAddresses];
          if (ccAddresses.length > 0) {
            setFieldVisibility((prev) => ({ ...prev, cc: true }));
          }
          basicData.subject = formatReplySubject(email.Subject);
        } else if (mode === 'forward') {
          basicData.subject = formatForwardSubject(email.Subject);
          basicData.to = [];

          if (parsed && parsed.html) {
            const { regularAttachments } = processIncomingHtml(parsed.html, allAttachments);
            basicData.attachments = regularAttachments;
          } else if (allAttachments.length > 0) {
            basicData.attachments = allAttachments;
          }
        }

        basicData.from_id = {
          email: currentEmail.address || '',
          name: currentEmail.name || '',
        };

        setComposerData(
          (prev) =>
            ({
              ...prev,
              ...basicData,
            }) as unknown as ComposerEmail
        );

        if (mode !== 'draft' && mode !== 'new') {
          // Header values come from the incoming message, so escape before templating
          const originalDate = escapeHtml(formatEmailDate(email.Date || ''));

          const parsedFrom = parseEmail(email.From);
          const originalFrom = {
            name: escapeHtml(parsedFrom.name || ''),
            email: escapeHtml(parsedFrom.email || ''),
          };
          // Forward header lists every recipient, not just the first.
          // Names are decoded after splitting so a decoded comma can't break the list.
          const formatAddressList = (field: unknown) =>
            parseEmailAddresses((field as string) || '')
              .map((a) => {
                const name = decodeWords(a.name || '');
                if (!a.address) return escapeHtml(name);
                return escapeHtml(name ? `${name} <${a.address}>` : a.address);
              })
              .join(', ');
          const originalTo = formatAddressList(normalizedEmails.to);
          const originalCc = formatAddressList(normalizedEmails.cc);
          const originalSubject = escapeHtml(decodeWords(email.Subject) || '');

          const borderColors = {
            reply: '#8b5cf6',
            forward: '#3b82f6',
            text: '#4b5563',
          };

          const signatureHtml =
            userSettings?.general?.signature?.find(
              (sig) => sig.name === userSettings?.general?.selected_signature
            )?.content || '';

          const signatureBlock = signatureHtml ? `<div>${signatureHtml}</div><p><br></p>` : '';

          // The part to write in: the cursor area + signature, above the quote
          const editableHtml = `<p><br><br></p>${signatureBlock}`;

          // Plain-text mails: escape so "<user@host>" isn't parsed as a tag, and keep line breaks
          let processedOriginalHtml =
            parsed?.html || escapeHtml(parsed?.text || '').replace(/\r?\n/g, '<br>');
          if (parsed && parsed.html) {
            const result = processIncomingHtml(parsed.html, allAttachments);
            processedOriginalHtml = result.html;
          }
          // Goes into the editor and out in the email
          processedOriginalHtml = sanitizeEmailHtml(processedOriginalHtml);

          let quotedBlock = '';
          if (parsed) {
            try {
              if (mode === 'reply' || mode === 'replyAll') {
                quotedBlock = `<div>
                <div style="font-size: 14px; color: #111; margin-bottom: 10px; margin-top: 20px;">
                   On ${originalDate}, <strong>${originalFrom.name || originalFrom.email}</strong> wrote:
                </div>
                <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid ${borderColors.reply}; color: ${borderColors.text}; opacity: 0.9;">
                  ${processedOriginalHtml}
                </blockquote>
              </div>`;
              } else if (mode === 'forward') {
                quotedBlock = `<div>
                <div style="margin-top: 20px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: bold; color: #111; font-size: 14px;">---------- Forwarded message ----------</span><br>
                  <div style="font-size: 13px; color: #374151; line-height: 1.6; margin-top: 8px;">
                    <strong>From:</strong> ${originalFrom.name} &lt;${originalFrom.email}&gt;<br>
                    <strong>Date:</strong> ${originalDate}<br>
                    <strong>Subject:</strong> ${originalSubject}<br>
                    <strong>To:</strong> ${originalTo}${originalCc ? `<br>\n                    <strong>Cc:</strong> ${originalCc}` : ''}
                  </div>
                </div>
                <blockquote style="margin: 0; padding-left: 12px; border-left: 3px solid ${borderColors.forward}; color: ${borderColors.text};">
                  ${processedOriginalHtml}
                </blockquote>
              </div>`;
              }
            } catch (parseError) {
              console.error('Failed to parse email:', parseError);
              quotedBlock =
                mode === 'reply' || mode === 'replyAll'
                  ? `<p>On ${originalDate}, ${originalFrom.name || originalFrom.email} wrote:</p><blockquote>[Email content unavailable]</blockquote>`
                  : `<p>---------- Forwarded message ----------</p><p>[Email content unavailable]</p>`;
            }
          } else {
            toast.error({
              description:
                'Could not load the original message. Its content will not be included.',
            });
            quotedBlock =
              mode === 'reply' || mode === 'replyAll'
                ? `<p>On ${originalDate}, ${originalFrom.name || originalFrom.email} wrote:</p><blockquote>[Email content unavailable]</blockquote>`
                : `<p>---------- Forwarded message ----------</p><p>[Email content unavailable]</p>`;
          }

          const bodyHtml = editableHtml + wrapQuote(quotedBlock);
          originalQuoteRef.current = { raw: extractQuote(bodyHtml), normalized: null };
          setComposerData((prev) => ({
            ...prev,
            html: bodyHtml,
            text: htmlToPlainText(editableHtml),
            attachments: mode === 'forward' ? prev.attachments : [],
          }));
        }
      } catch (error) {
        console.error('Failed to setup email content:', error);

        const fallbackContent =
          mode === 'reply' || mode === 'replyAll'
            ? `<p><br></p><p>On ${email.Date || ''}, ${email.From || ''} wrote:</p><blockquote>[Email content unavailable]</blockquote>`
            : `<p><br></p><p>---------- Forwarded message ----------</p><p>[Email content unavailable]</p>`;

        setComposerData((prev) => ({
          ...prev,
          html: fallbackContent,
          text: fallbackContent,
        }));
      } finally {
        setIsLoading(false);
        setIsInitialized(true);

        if (isQuotaExceeded) {
          toast.error({
            description: 'Storage quota exceeded. Draft saving is disabled.',
            duration: 5000,
          });
        }
      }
    };

    setupEmailContent();
  }, [
    email?.id,
    mode,
    folder,
    currentEmail,
    isQuotaExceeded,
    toast,
    userSettings,
    rawEmail,
    isLoadingRaw,
    isRawError,
    shouldFetchRaw,
    setComposerData,
    resetComposerData,
  ]);

  const saveToDraft = useCallback(() => {
    const currentComposerData = composerDataRef.current;
    if (isQuotaExceeded || isManualSaveRef.current || !currentComposerData.to?.length) {
      return;
    }
    if (hasAutoSavedRef.current) return;

    const draftHtml = prepareOutgoingHtml(
      currentComposerData.html || '',
      originalQuoteRef.current,
      { keepMarker: true }
    );
    // text must include the quote too
    const draftData = hasQuote(currentComposerData.html)
      ? { ...currentComposerData, html: draftHtml, text: htmlToPlainText(draftHtml) }
      : currentComposerData;
    const mailData = formatComposedEmailData(draftData, {
      folder_path: saveDraft || 'Drafts',
      priority,
      isDraft: true,
      readReceipt,
    });

    // formatComposedEmailData returns html/text fields; ComposerRequest expects
    // body_html/body_text. This autosave path (unlike handleMailAction) never
    // renames them — a pre-existing mismatch, preserved as-is (see CLAUDE.md).
    draftMutate(mailData as unknown as ComposerRequest, {
      onSuccess: () => {
        hasAutoSavedRef.current = true;
      },
      onError: (err) => {
        console.error('error', err);
      },
    });
  }, [priority, readReceipt, draftMutate, isQuotaExceeded, saveDraft]);

  const [debouncedSaveToDraft, cancelDebouncedSaveToDraft] = useDebounce(saveToDraft, 15000);

  const handleMailAction = ({
    isDraft,
    folder_path,
    successDescription,
    setSending,
    allowUndo = false,
    dataOverrides = {},
  }: {
    isDraft: boolean;
    folder_path: string;
    successTitle: string;
    successDescription: string;
    errorTitle: string;
    setSending?: (value: boolean) => void;
    allowUndo?: boolean;
    dataOverrides?: Record<string, unknown>;
  }) => {
    if (isDraft && isQuotaExceeded) {
      toast.error({
        description: 'Cannot save draft: Storage quota exceeded (98%+ used). Please free up space.',
      });
      return;
    }

    // Generate new Message-ID
    const newMessageId = generateMessageId(domainUser?.domain || 'webmail.local');

    // Prepare headers based on mode
    let finalHeaders: EmailHeaders = {};

    // Use overrides or current state
    const baseData = { ...composerData, ...dataOverrides };
    const outgoingHtml = prepareOutgoingHtml(baseData.html || '', originalQuoteRef.current, {
      keepMarker: isDraft,
    });
    // Plain-text alternative must carry the quoted/forwarded content as well
    const currentData = hasQuote(baseData.html)
      ? { ...baseData, html: outgoingHtml, text: htmlToPlainText(outgoingHtml) }
      : baseData;

    if (isDraft) {
      const rawHeaders = currentData.headers || {};
      finalHeaders = {};
      Object.keys(rawHeaders).forEach((key) => {
        const value = rawHeaders[key];
        finalHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
      });
      if (!finalHeaders['Message-ID'] && !finalHeaders['Message-Id']) {
        finalHeaders['Message-ID'] = newMessageId;
      }
      if (!finalHeaders['Date']) {
        finalHeaders['Date'] = new Date().toUTCString();
      }
      if (!finalHeaders['MIME-Version']) {
        finalHeaders['MIME-Version'] = '1.0';
      }
    } else {
      const userReplyTo = userSettings?.general?.reply_to;
      finalHeaders = buildReplyHeaders(originalHeaders, newMessageId, mode, userReplyTo);

      if (!finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'text/html; charset="UTF-8"';
      }

      if (!finalHeaders['MIME-Version']) {
        finalHeaders['MIME-Version'] = '1.0';
      }
    }

    const finalValue = {
      ...currentData,
      headers: finalHeaders,
      messageId: newMessageId,
      from_id: {
        email: currentEmail.address || '',
        name: currentEmail.name || '',
      },
    };

    const mailData: Record<string, unknown> = formatComposedEmailData(finalValue, {
      folder_path: isDraft ? saveDraft || 'Drafts' : sendPath || folder_path,
      priority: priority,
      isDraft,
      readReceipt,
    });

    const mutateFn = isDraft ? draftMutate : sendMutate;

    // Re-saving an opened draft replaces the old copy. Only for mode 'draft':
    // in reply/forward `email` is the ORIGINAL message, and this endpoint
    // expunges permanently (no Trash), so it would destroy the user's email.
    const autoDelete =
      isDraft && mode === 'draft' && email?.id
        ? () => {
            const payload = {
              path: email.folderPath || folder || saveDraft || 'Drafts',
              body: [Number(email.id)],
            };
            deleteMutate(payload);
          }
        : () => {};

    if (mailData) {
      mailData.body_html = mailData.html || '';
      mailData.body_text = mailData.text || '';

      delete mailData.html;
      delete mailData.text;
    }

    // ── Attach draft deletion info so backend can clean up the draft on send ─
    if (!isDraft && mailData) {
      if (mode === 'draft' && email) {
        const draftMsgId = Array.isArray(originalMessageId)
          ? originalMessageId[0]
          : originalMessageId;
        if (draftMsgId) {
          mailData.draft_saved = true;
          mailData.draft_folder_name = email.folderPath || saveDraft || 'Drafts';
          mailData.draft_message_id = draftMsgId;
        }
      } else if (hasAutoSavedRef.current) {
        const draftMsgId = composerDataRef.current.messageId || '';
        if (draftMsgId) {
          mailData.draft_saved = true;
          mailData.draft_folder_name = saveDraft || 'Drafts';
          mailData.draft_message_id = draftMsgId;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Undo send path ──────────────────────────────────────────────────────
    if (allowUndo && !isDraft) {
      pendingEmailRef.current = mailData;
      isUndoPeriodRef.current = true;
      if (setSending) setSending(false);

      // Hide the modal immediately so the UI feels responsive, but keep EmailComposer
      // mounted (via emailComposerKeepMountedAtom) so all component state is preserved.
      // NOTE: resetComposerData() is intentionally NOT called here — we keep the
      // atom intact so we can reopen with content restored if the send fails or is undone.
      // NOTE: setComposerOpen(false) is used directly instead of onClose() so that
      // EmailList's mode state (replyingEmail, forwardingEmail, etc.) is NOT cleared.
      // If onClose() were called here it would run handleCloseComposer() and wipe the
      // mode, so clicking Undo would reopen the composer as a blank 'new' message.
      cancelDebouncedSaveToDraft();
      setKeepMounted(true);
      setComposerOpen(false);

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isUndoPeriodRef.current || isSendInFlightRef.current) {
          e.preventDefault();
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      const undoSeconds = Math.round(undoTime / 1000);
      toast.success({
        description: `Sending in ${undoSeconds}s… Don't close this tab. Click Undo to cancel.`,
        undo: {
          label: 'Undo',
          onClick: () => {
            isUndoPeriodRef.current = false;
            pendingEmailRef.current = null;
            window.removeEventListener('beforeunload', handleBeforeUnload);
            toast.success({ description: 'Send cancelled.' });
            // Reopen composer — component was never unmounted so all data is intact.
            // Mode state in EmailList is still intact because we used setComposerOpen(false)
            // above instead of onClose().
            setKeepMounted(false);
            setComposerOpen(true);
          },
          duration: undoTime,
        },
      });

      // Use sendMail directly instead of the TanStack mutation hook.
      // useMutation callbacks are unreliable after a component unmounts — although
      // the component stays mounted via keepMounted here, using sendMail directly
      // is still safer and avoids any TanStack Query lifecycle surprises.
      setTimeout(async () => {
        if (!isUndoPeriodRef.current || !pendingEmailRef.current) return;
        isUndoPeriodRef.current = false;
        const mailToSend = pendingEmailRef.current;
        pendingEmailRef.current = null;
        isSendInFlightRef.current = true;
        const loadingId = toast.loading({ description: 'Sending…' });
        try {
          await sendMailV2(mailToSend as unknown as ComposerRequest);
          isSendInFlightRef.current = false;
          announceSent(mailToSend);
          toast.dismiss(loadingId);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          toast.success({ description: successDescription || '', duration: 5000 });
          // Clean up composer state only after confirmed send.
          // onSend() clears EmailList's mode state and refreshes the email list.
          setKeepMounted(false);
          onSend();
          resetComposerData();
          hasAutoSavedRef.current = false;
          emailIdRef.current = null;
          setIsInitialized(false);
        } catch (err) {
          isSendInFlightRef.current = false;
          toast.dismiss(loadingId);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          toast.error({
            description:
              (err instanceof Error && err.message) ||
              'An error occurred while sending mail. Please try again.',
          });
          // Reopen the composer — data is still intact since the component stayed mounted
          setKeepMounted(false);
          setComposerOpen(true);
        }
      }, undoTime);

      return;
    }
    // ───────────────────────────────────────────────────────────────────────

    mutateFn(mailData as unknown as ComposerRequest, {
      onSuccess: () => {
        if (isDraft) {
          isManualSaveRef.current = false;
        } else if (mailData) {
          announceSent(mailData);
        }
        if (setSending) setSending(false);
        toast.success({
          description: successDescription || '',
          duration: 5000,
        });
        autoDelete();
        onClose();
        resetComposerData();
        hasAutoSavedRef.current = false;
        emailIdRef.current = null;
        setIsInitialized(false);
      },
      onError: (err) => {
        if (isDraft) {
          isManualSaveRef.current = false;
        }
        if (setSending) setSending(false);

        toast.error({
          description: err?.message || 'An error occurred while sending mail. Please try again.',
        });
      },
    });
  };

  const handleSend = () => {
    cancelDebouncedSaveToDraft();

    const pendingTo = toRef.current?.flush();
    const pendingCc = ccRef.current?.flush();
    const pendingBcc = bccRef.current?.flush();

    // composerData.to/cc/bcc are declared as {email, name} (ComposerEmail) but
    // RecipientField actually stores/emits {address, name} at runtime — see the
    // ComposerBasicData note above. Cast once here to the shape actually used below.
    const effectiveTo: RecipientEmailAddress[] = [
      ...((composerData.to || []) as unknown as RecipientEmailAddress[]),
      ...(pendingTo ? [pendingTo] : []),
    ];
    const effectiveCc: RecipientEmailAddress[] = [
      ...((composerData.cc || []) as unknown as RecipientEmailAddress[]),
      ...(pendingCc ? [pendingCc] : []),
    ];
    const effectiveBcc: RecipientEmailAddress[] = [
      ...((composerData.bcc || []) as unknown as RecipientEmailAddress[]),
      ...(pendingBcc ? [pendingBcc] : []),
    ];

    if (effectiveTo.length === 0) {
      toast.error({ description: 'Please add at least one recipient.' });
      return;
    }

    // ── Validate all recipient addresses ─────────────────────────────────────
    const allRecipients = [
      ...effectiveTo.map((r) => ({ ...r, field: 'To' })),
      ...effectiveCc.map((r) => ({ ...r, field: 'Cc' })),
      ...effectiveBcc.map((r) => ({ ...r, field: 'Bcc' })),
    ];

    for (const recipient of allRecipients) {
      const addr = recipient?.address?.trim();
      if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
        const label = recipient?.name?.trim() || addr || '(unknown)';
        toast.error({
          description: !addr
            ? `Could not resolve an email address for "${label}" (${recipient.field}) — the original header was malformed. Please enter their email manually or remove them.`
            : `Invalid email address in ${recipient.field}: "${addr}". Please fix before sending.`,
        });
        return;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const overrides: Record<string, unknown> = {};
    if (pendingTo) overrides.to = effectiveTo;
    if (pendingCc) overrides.cc = effectiveCc;
    if (pendingBcc) overrides.bcc = effectiveBcc;

    const sendNow = () => {
      handleMailAction({
        isDraft: false,
        folder_path: folder_path,
        successTitle: 'Mail Sent',
        successDescription: 'Your email sent successfully',
        errorTitle: 'Failed to send mail',
        setSending: setIsSending,
        allowUndo: true,
        dataOverrides: overrides,
      });
    };

    // Only what the user wrote: the quote may well say "see attached"
    const bodyMentionsAttachment = mightHaveForgottenAttachmentCheck(
      hasQuote(composerData.html)
        ? htmlToPlainText(withoutQuote(composerData.html || ''))
        : composerData.text || '',
      composerData.attachments?.length || 0
    );

    if (bodyMentionsAttachment) {
      setPendingSendAction(() => sendNow);
      setShowAttachmentConfirm(true);
    } else {
      sendNow();
    }
  };

  const handleSaveDraft = () => {
    // Flush any pending text in recipient fields
    const pendingTo = toRef.current?.flush();
    const pendingCc = ccRef.current?.flush();
    const pendingBcc = bccRef.current?.flush();

    // Calculate effective recipients for validation
    const effectiveTo: RecipientEmailAddress[] = [
      ...((composerData.to || []) as unknown as RecipientEmailAddress[]),
    ];
    if (pendingTo) effectiveTo.push(pendingTo);

    if (isQuotaExceeded) {
      toast.error({
        description: 'Cannot save draft: Storage quota exceeded (98%+ used). Please free up space.',
      });
      return;
    }

    if (effectiveTo.length === 0) {
      toast.error({
        description: 'At least one recipient is required to save a draft.',
      });
      return;
    }

    if (isDrafting) return;

    isManualSaveRef.current = true;
    cancelDebouncedSaveToDraft();

    hasAutoSavedRef.current = true;

    const overrides: Record<string, unknown> = {};
    if (pendingTo) overrides.to = effectiveTo;
    if (pendingCc) overrides.cc = [...(composerData.cc || []), pendingCc];
    if (pendingBcc) overrides.bcc = [...(composerData.bcc || []), pendingBcc];

    handleMailAction({
      isDraft: true,
      folder_path: saveDraft || 'Drafts',
      successTitle: 'Mail draft success',
      successDescription: 'Your email stored in draft successfully',
      errorTitle: 'Failed to draft mail',
      dataOverrides: overrides,
    });

    setTimeout(() => {
      isManualSaveRef.current = false;
    }, 2000);
  };

  const handleComposerCancel = () => {
    cancelDebouncedSaveToDraft();
    isManualSaveRef.current = false;

    onClose();
    resetComposerData();
    hasAutoSavedRef.current = false;
    emailIdRef.current = null;
    setIsInitialized(false);
  };

  const updateComposerData = (fields: Record<string, unknown>) => {
    setComposerData((prev) => ({ ...prev, ...fields }) as unknown as ComposerEmail);

    const text = (fields as { text?: string }).text;
    if (!isManualSaveRef.current && !isQuotaExceeded && text && text.length > 5) {
      debouncedSaveToDraft();
    }
  };

  useEffect(() => {
    if (mode === 'new' && !isInitialized) {
      setComposerData((prev) => {
        const from = (prev.from_id || {}) as { address?: string; name?: string };
        return {
          ...prev,
          // ComposerEmail has no `from` field (only `from_id`) — this is a
          // pre-existing dead assignment, nothing reads `composerData.from`.
          // Preserved as-is (see CLAUDE.md).
          from: {
            address: from?.address?.trim() ? from.address : '',
            name: from.name?.trim() ? from.name : 'Unknown Sender',
          },
        } as unknown as ComposerEmail;
      });
      setIsInitialized(true);
    }
  }, [mode, isInitialized, setComposerData]);

  // Cleanup effect to cancel any pending auto-saves when component unmounts
  useEffect(() => {
    return () => {
      cancelDebouncedSaveToDraft();
    };
  }, [cancelDebouncedSaveToDraft]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const currentTotalSize = (composerData.attachments || []).reduce(
        // ComposerEmail declares attachments as {filename, mimeType, content}, but
        // entries actually pushed below are {filename, mime_type, data, size} —
        // a pre-existing shape mismatch, preserved as-is (see CLAUDE.md).
        (sum: number, file) => sum + ((file as unknown as { size?: number }).size || 0),
        0
      );
      const newFilesTotalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);

      if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
        toast.error({
          description: `Cannot add files. Total attachments size would exceed ${formatFileSize(MAX_TOTAL_SIZE)}.`,
          duration: 5000,
        });
        return;
      }

      const oversizedFiles = acceptedFiles.filter((file) => file.size > MAX_INDIVIDUAL_FILE_SIZE);
      const validFiles = acceptedFiles.filter((file) => file.size <= MAX_INDIVIDUAL_FILE_SIZE);

      if (oversizedFiles.length > 0) {
        toast.error({
          description: `${oversizedFiles.length} file(s) exceed the 50MB limit.`,
          duration: 5000,
        });
      }

      if (validFiles.length === 0) return;

      try {
        const base64Attachments = await Promise.all(
          validFiles.map(async (file) => ({
            filename: file.name,
            mime_type: file.type,
            data: await toBase64(file),
            size: file.size,
          }))
        );

        setComposerData(
          (prev) =>
            ({
              ...prev,
              attachments: [...(prev.attachments || []), ...base64Attachments],
            }) as unknown as ComposerEmail
        );

        toast.success({
          description: `Added ${validFiles.length} file(s)`,
          duration: 3000,
        });
      } catch {
        toast.error({
          description: 'Failed to process files.',
        });
      }
    },
    [composerData.attachments, setComposerData, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: true,
    maxSize: MAX_INDIVIDUAL_FILE_SIZE,
  });

  return (
    <>
    <CustomModal
      isOpen={composerOpen}
      isFullView={fullViewEnabled}
      onToggleFullView={() => setFullViewEnabled((prev) => !prev)}
      onClose={handleComposerCancel}
      position="bottom-right"
      blocking={false}
      fillContent
      title={
        mode === 'reply'
          ? 'Reply'
          : mode === 'replyAll'
            ? 'Reply All'
            : mode === 'forward'
              ? 'Forward'
              : mode === 'editAsNew'
                ? 'Edit as New'
                : 'New Message'
      }
      footer={
        <ComposerFooter
          onAttach={() => attachmentsRef.current?.openPicker()}
          optionsStripProps={{
            onTouchStart: handleStripTouchStart,
            onTouchMove: handleStripTouchMove,
            onClickCapture: handleStripClickCapture,
          }}
          options={
            <>
              <div className="shrink-0 px-2">
                <EmailPriorityField priority={priority} onChange={setPriority} />
              </div>
              <ReadReceiptField checked={readReceipt} onChange={setReadReceipt} />
            </>
          }
          onCancel={handleComposerCancel}
          cancelDisabled={isLoading}
          draft={{
            onClick: handleSaveDraft,
            disabled: isLoading || isQuotaExceeded || isDrafting,
            dimmed:
              !composerData.to?.length &&
              !(toRef.current as unknown as { inputValue?: string })?.inputValue,
            isSaving: isDrafting,
            title: !composerData.to?.length ? 'At least one recipient required to save draft' : '',
            quotaExceeded: isQuotaExceeded,
          }}
          send={{ onClick: handleSend, disabled: isLoading, isSending }}
        />
      }
    >
      <div {...getRootProps()} className="relative outline-none h-full flex flex-col">
        <input {...getInputProps()} />
        {isDragActive && <ComposerDropOverlay />}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-[var(--gray-11)]">Loading email content...</div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Quota Warning */}
            {isQuotaExceeded && (
              <div className="shrink-0 px-3 py-2 bg-yellow-50 border-l-4 border-yellow-400">
                <div className="text-yellow-700 text-sm">
                  <strong>Storage Quota Exceeded:</strong> Draft saving is disabled because storage
                  is {folderQuota?.used_percent}% full. Please free up space to save drafts.
                </div>
              </div>
            )}

            {/* Recipient Fields */}
            <div className="shrink-0 relative border-b border-[var(--gray-4)] px-2">
              <RecipientField
                ref={toRef}
                label="To"
                placeholder="Recipients email address"
                value={(composerData.to as unknown as RecipientEmailAddress[]) || []}
                onChange={(emailAddresses) => updateComposerData({ to: emailAddresses })}
              />

              <div className="flex gap-4 absolute right-3 top-1.5 z-50">
                <button
                  onClick={() => toggleField('cc')}
                  className="text-[var(--gray-11)] hover:text-[var(--gray-12)] text-sm"
                >
                  Cc
                </button>
                <button
                  onClick={() => toggleField('bcc')}
                  className="text-[var(--gray-11)] hover:text-[var(--gray-12)] text-sm"
                >
                  Bcc
                </button>
              </div>
            </div>

            {fieldVisibility.cc && (
              <div className="shrink-0 border-b border-[var(--gray-4)] px-2">
                <RecipientField
                  ref={ccRef}
                  label="Cc"
                  placeholder="Enter cc email address"
                  value={(composerData.cc as unknown as RecipientEmailAddress[]) || []}
                  onChange={(emailAddresses) => updateComposerData({ cc: emailAddresses })}
                />
              </div>
            )}

            {fieldVisibility.bcc && (
              <div className="shrink-0 border-b border-[var(--gray-4)] px-2">
                <RecipientField
                  ref={bccRef}
                  label="Bcc"
                  placeholder="Enter bcc email address"
                  value={(composerData.bcc as unknown as RecipientEmailAddress[]) || []}
                  onChange={(emailAddresses) => updateComposerData({ bcc: emailAddresses })}
                />
              </div>
            )}

            {/* Subject Field */}
            <div className="shrink-0 border-b border-[var(--gray-4)] px-2">
              <SubjectField
                value={composerData.subject || ''}
                onChange={(subject) => updateComposerData({ subject })}
              />
            </div>

            {/* One writing space: the reply and the quoted original, one toolbar */}
            <div className="flex-1 min-h-[240px]">
              <ContentEditor
                fill
                onChange={({ html, text }) =>
                  updateComposerData({
                    html: html,
                    text: text,
                  })
                }
                value={composerData.html || ''}
                // Not for a new message: that one starts at the To field
                focusStartKey={mode !== 'new' && email ? `${email.id}:${mode}` : undefined}
                onContentLoaded={(html) => {
                  if (!originalQuoteRef.current.normalized) {
                    originalQuoteRef.current = {
                      ...originalQuoteRef.current,
                      normalized: extractQuote(html),
                    };
                  }
                }}
              />
            </div>

            <AttachmentUploader
              ref={attachmentsRef}
              attachments={composerData.attachments || []}
              onAttachmentsChange={(newAttachments) =>
                updateComposerData({ attachments: newAttachments })
              }
            />
          </>
        )}
      </div>
    </CustomModal>
    {/* Forgotten Attachment Confirmation Modal */}
    <Dialog.Root open={showAttachmentConfirm} onOpenChange={setShowAttachmentConfirm}>
      <Dialog.Content style={{ maxWidth: 450, borderRadius: 8 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <FaExclamationTriangle color="#f59e0b" />
            Did you forget to attach a file?
          </Flex>
        </Dialog.Title>

        <Box py="4">
          <Text size="2" color="gray">
            Your message mentions an attachment, but no files are attached to this email.
          </Text>

          <Box mt="4" p="3" style={{ backgroundColor: 'var(--yellow-2)', borderRadius: 6 }}>
            <Text size="2" color="yellow">
              Are you sure you want to send this without attaching anything?
            </Text>
          </Box>
        </Box>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" onClick={() => setShowAttachmentConfirm(false)}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            variant="solid"
            color="red"
            onClick={() => {
              if (pendingSendAction) {
                pendingSendAction();
              }
              setShowAttachmentConfirm(false);
            }}
          >
            Send anyway
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
    </>
  );
};

export default EmailComposer;
