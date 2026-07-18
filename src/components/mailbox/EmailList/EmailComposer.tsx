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
import { FaPaperPlane, FaDeleteLeft, FaFloppyDisk } from 'react-icons/fa6';
import type { Email } from '../../../api/mailbox';
import type { Email as ParsedPostalEmail, Address as PostalMimeAddress } from 'postal-mime';
import { useParams } from '@tanstack/react-router';
import { useEmailRaw } from '../../../hooks/useEmailRaw';
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
import AttachmentUploader from '../../composer/AttachmentUploader';
import {
  toBase64,
  MAX_TOTAL_SIZE,
  MAX_INDIVIDUAL_FILE_SIZE,
  formatFileSize,
} from '../../composer/attachmentUtils';
import { useDropzone } from 'react-dropzone';
import { FaPaperclip } from 'react-icons/fa6';
import EmailPriorityField from '../../composer/EmailPriorityField';
import { generateMessageId, sendMailV2, type ComposerRequest } from '../../../api/composer';
import { useDeleteMail } from '../../../hooks/useEmails';
import { useToast } from '../../../hooks/useToast';
import { userSettingsAtom } from '../../../state/settings';
import { folderQuotaAtom } from '../../../state/folders';

// Import Utilities
import {
  formatComposedEmailData,
  parseEmailAddresses,
  convertPostalMimeAttachments,
  extractHeadersFromRawEmail,
  buildReplyHeaders,
  processIncomingHtml,
  type EmailPriority,
  type EmailHeaders,
  type Address,
  type EmailAttachmentPayload,
} from '../../../utils/replyForwardHelper';
import CustomModal from '../../composer/CustomModal';
import { parseEmail } from '../../../utils/emailPerser';
import { userDetailsAtom } from '../../../state/userDetails';
import { SEND_DEFAULT } from '../../../constants/constant';
import { getMessageId, normalizeFieldNames } from '../../../utils/emailUtils';
import { getEditorDimensions } from '../../../utils/dimensions';
import { useIsMobile } from '../../../hooks/use-mobile';
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
  // State for storing original email headers
  const [originalHeaders, setOriginalHeaders] = useState<EmailHeaders>({});
  const [originalMessageId, setOriginalMessageId] = useState<string | string[]>('');
  const [fullViewEnabled, setFullViewEnabled] = useState(false);
  const userSettings = useAtomValue(userSettingsAtom);
  const folderQuota = useAtomValue(folderQuotaAtom);
  const domainUser = useAtomValue(userDetailsAtom);

  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [quotedHtml, setQuotedHtml] = useState('');

  const quotedEditableRef = useRef<HTMLDivElement>(null);
  const [fieldVisibility, setFieldVisibility] = useState({
    cc: false,
    bcc: false,
  });
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [folder_path, setFolderPath] = useState<string>(folder || SEND_DEFAULT || 'Sent');
  const [sendPath, setSendPath] = useState<string>('Sent');
  const [saveDraft, setSaveDraft] = useState<string>('Drafts');

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
  const shouldFetchRaw = Boolean(email?.id && mode !== 'new' && isInitialized === false);
  const isMobile = useIsMobile();
  const { data: rawEmail, isLoading: isLoadingRaw } = useEmailRaw(
    email?.id?.toString() || '',
    folderForRaw || 'INBOX',
    getMessageId(email) || '',
    shouldFetchRaw
  );

  useEffect(() => {
    if (userSettings?.email) {
      const time = Number(userSettings?.email?.undo_send || 5) * 1000;
      setUndoTime(time);
      setSaveDraft('Drafts');
      setSendPath(SEND_DEFAULT || 'Sent');
    }
  }, [userSettings]);

  useEffect(() => {
    if (folder) {
      setFolderPath(folder);
    } else if (userSettings?.email) {
      setFolderPath(SEND_DEFAULT || 'Sent');
    }
  }, [folder, userSettings]);

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

  const toggleField = (field: keyof typeof fieldVisibility) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const formatEmailDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
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
      if (isLoadingRaw) {
        setIsLoading(true);
        return;
      }

      if (!email || !email.id) {
        setIsInitialized(true);
        return;
      }

      const normalizedEmails = normalizeFieldNames(email);

      const currentEmailId = email.id.toString();
      if (emailIdRef.current === currentEmailId && isInitialized) {
        return;
      }

      emailIdRef.current = currentEmailId;
      setIsLoading(true);
      setIsInitialized(false);

      try {
        resetComposerData();

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
          basicData.subject = `Re: ${decodeWords(email.Subject) || ''}`;
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
          basicData.subject = `Re: ${decodeWords(email.Subject) || ''}`;
        } else if (mode === 'forward') {
          basicData.subject = `Fwd: ${decodeWords(email.Subject) || ''}`;
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
          const originalDate = formatEmailDate(email.Date || '');

          const originalFrom = parseEmail(email.From) || '';
          const originalTo = parseEmail(normalizedEmails.to as string) || '';
          const originalSubject = decodeWords(email.Subject) || '';

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

          // Editable part: just the cursor area + signature (no original HTML here)
          const editableHtml = `<p><br><br></p>${signatureBlock}`;

          let processedOriginalHtml = parsed?.html || parsed?.text || '';
          if (parsed && parsed.html) {
            const result = processIncomingHtml(parsed.html, allAttachments);
            processedOriginalHtml = result.html;
          }

          // Quoted part: rendered in an iframe, not fed into Tiptap
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
                    <strong>To:</strong> ${originalTo.name} &lt;${originalTo.email}&gt;
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
            quotedBlock =
              mode === 'reply' || mode === 'replyAll'
                ? `<p>On ${originalDate}, ${originalFrom.name || originalFrom.email} wrote:</p><blockquote>[Email content unavailable]</blockquote>`
                : `<p>---------- Forwarded message ----------</p><p>[Email content unavailable]</p>`;
          }

          setQuotedHtml(quotedBlock);
          setComposerData((prev) => ({
            ...prev,
            html: editableHtml,
            text: editableHtml,
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
    setComposerData,
    resetComposerData,
  ]);

  const saveToDraft = useCallback(() => {
    const currentComposerData = composerDataRef.current;
    if (isQuotaExceeded || isManualSaveRef.current || !currentComposerData.to?.length) {
      return;
    }
    if (hasAutoSavedRef.current) return;

    const liveQuoted = quotedEditableRef.current?.innerHTML ?? quotedHtml;
    const draftData = liveQuoted
      ? { ...currentComposerData, html: (currentComposerData.html || '') + liveQuoted }
      : currentComposerData;
    const mailData = formatComposedEmailData(draftData, {
      folder_path: saveDraft || 'Drafts',
      priority,
      isDraft: true,
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
  }, [quotedHtml, priority, draftMutate, isQuotaExceeded, saveDraft]);

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

    // Read live quoted content from the editable div (if expanded & edited) or fall back to original
    const liveQuoted = quotedEditableRef.current?.innerHTML ?? quotedHtml;
    // Use overrides or current state; append quoted block so it's included in sent/drafted email
    const baseData = { ...composerData, ...dataOverrides };
    const currentData = liveQuoted
      ? { ...baseData, html: (baseData.html || '') + liveQuoted }
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
    });

    const mutateFn = isDraft ? draftMutate : sendMutate;

    const autoDelete = isDraft
      ? () => {
          const payload = {
            path: folder || 'INBOX',
            body: [Number(email?.id)],
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
          toast.dismiss(loadingId);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          toast.success({ description: successDescription || '', duration: 5000 });
          // Clean up composer state only after confirmed send.
          // onSend() clears EmailList's mode state and refreshes the email list.
          setKeepMounted(false);
          onSend();
          resetComposerData();
          setQuotedHtml('');
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
        }
        if (setSending) setSending(false);
        toast.success({
          description: successDescription || '',
          duration: 5000,
        });
        autoDelete();
        onClose();
        resetComposerData();
        setQuotedHtml('');
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
    setQuotedHtml('');
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

  // Populate the contenteditable div whenever quotedHtml is set or the modal reopens
  // (e.g. after undo-send: modal was hidden so the div was unmounted, but quotedHtml
  // state didn't change, so we must also re-run when composerOpen flips back to true)
  useEffect(() => {
    if (quotedEditableRef.current && quotedHtml) {
      quotedEditableRef.current.innerHTML = quotedHtml;
    }
  }, [quotedHtml, composerOpen]);

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
    <CustomModal
      isOpen={composerOpen}
      isFullView={fullViewEnabled}
      onToggleFullView={() => setFullViewEnabled((prev) => !prev)}
      onClose={handleComposerCancel}
      position="bottom-right"
      blocking={false}
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
        <div className="flex flex-row justify-between items-center w-full gap-3">
          <EmailPriorityField priority={priority} onChange={setPriority} />

          <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
            <button
              onClick={handleComposerCancel}
              className="flex items-center gap-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] px-3 py-2 rounded text-sm"
              disabled={isLoading}
            >
              <FaDeleteLeft />
              <span className="hidden sm:inline">Cancel</span>
            </button>

            <div className="h-6 w-px bg-[var(--gray-6)] hidden sm:block" />

            <button
              onClick={handleSaveDraft}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                isQuotaExceeded ||
                (!composerData.to?.length &&
                  !(toRef.current as unknown as { inputValue?: string })?.inputValue) ||
                isDrafting
                  ? 'opacity-50 cursor-not-allowed text-[var(--gray-9)]'
                  : 'text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)]'
              }`}
              title={
                !composerData.to?.length ? 'At least one recipient required to save draft' : ''
              }
              // Note: We can't easily check internal ref value here for disabling button,
              // but handleSaveDraft handles the validation check on click.
              disabled={isLoading || isQuotaExceeded || isDrafting}
            >
              {isDrafting ? (
                <>
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <FaFloppyDisk />
                  <span className="hidden sm:inline">
                    Save Draft{isQuotaExceeded && ' (Disabled)'}
                  </span>
                </>
              )}
            </button>

            <div className="h-6 w-px bg-[var(--gray-6)] hidden sm:block" />

            <button
              onClick={handleSend}
              className="flex items-center gap-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={isLoading || isSending}
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div {...getRootProps()} className="space-y-3 relative outline-none h-full min-h-[400px]">
        <input {...getInputProps()} />
        {isDragActive && (
          <div className="absolute inset-0 z-[9999] bg-[var(--gray-2)]/90 backdrop-blur-sm border-[3px] border-dashed border-[var(--accent-9)] rounded-xl flex items-center justify-center pointer-events-none">
            <div className="bg-white px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
              <div className="p-4 bg-[var(--accent-3)] text-[var(--accent-11)] rounded-full">
                <FaPaperclip size={36} />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[var(--gray-12)]">Drop files here to attach</p>
                <p className="text-sm text-[var(--gray-10)] mt-1">
                  Maximum {formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} per file
                </p>
              </div>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-[var(--gray-11)]">Loading email content...</div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Quota Warning */}
            {isQuotaExceeded && (
              <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="text-yellow-700 text-sm">
                  <strong>Storage Quota Exceeded:</strong> Draft saving is disabled because storage
                  is {folderQuota?.used_percent}% full. Please free up space to save drafts.
                </div>
              </div>
            )}

            {/* Recipient Fields */}
            <div className="space-y-2 relative">
              <RecipientField
                ref={toRef}
                label="To"
                placeholder="Recipients email address"
                value={(composerData.to as unknown as RecipientEmailAddress[]) || []}
                onChange={(emailAddresses) => updateComposerData({ to: emailAddresses })}
              />

              <div className="flex gap-4 ml-2 absolute right-0 top-1 z-50">
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

              {fieldVisibility.cc && (
                <RecipientField
                  ref={ccRef}
                  label="Cc"
                  placeholder="Enter cc email address"
                  value={(composerData.cc as unknown as RecipientEmailAddress[]) || []}
                  onChange={(emailAddresses) => updateComposerData({ cc: emailAddresses })}
                />
              )}

              {fieldVisibility.bcc && (
                <RecipientField
                  ref={bccRef}
                  label="Bcc"
                  placeholder="Enter bcc email address"
                  value={(composerData.bcc as unknown as RecipientEmailAddress[]) || []}
                  onChange={(emailAddresses) => updateComposerData({ bcc: emailAddresses })}
                />
              )}
            </div>

            {/* Subject Field */}
            <SubjectField
              value={composerData.subject || ''}
              onChange={(subject) => updateComposerData({ subject })}
            />

            {/* Content Editor and Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="col-span-3">
                <ContentEditor
                  onChange={({ html, text }) =>
                    updateComposerData({
                      html: html,
                      text: text,
                    })
                  }
                  value={composerData.html || ''}
                  height={getEditorDimensions(isMobile, false, false).height}
                  maxheight={getEditorDimensions(isMobile, false, false).maxHeight}
                />
              </div>
              <div className="col-span-1">
                <AttachmentUploader
                  attachments={composerData.attachments || []}
                  onAttachmentsChange={(newAttachments) =>
                    updateComposerData({ attachments: newAttachments })
                  }
                  height={getEditorDimensions(isMobile, false, true).height}
                  maxHeight={getEditorDimensions(isMobile, false, true).maxHeight}
                  disableDrop={true}
                />
              </div>
              {/* Quoted original email — full width, always visible, directly editable */}
              {quotedHtml && (
                <div className="col-span-4">
                  <div
                    ref={quotedEditableRef}
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                      paddingLeft: 12,
                      borderLeft: '3px solid var(--gray-5)',
                      outline: 'none',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--gray-11)',
                      cursor: 'text',
                      maxWidth: '100%',
                      overflowX: 'auto',
                      wordBreak: 'break-word',
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </CustomModal>
  );
};

export default EmailComposer;
