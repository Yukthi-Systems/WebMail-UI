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

import { Box, Button, Flex, Dialog, Text, AlertDialog } from '@radix-ui/themes';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  composerDataAtom,
  composerOpenAtom,
  resetComposerDataAtom,
  draftMessageIdAtom,
  type EmailAddress,
  type ComposedEmailData,
} from '../../state/composer';
import { FaDeleteLeft, FaFloppyDisk, FaPaperPlane } from 'react-icons/fa6';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import RecipientField, { type RecipientFieldHandle } from './RecipientField';
import SubjectField from './SubjectField';
import ContentEditor from './contentEditor';
import AttachmentUploader from './AttachmentUploader';
import { toBase64, MAX_TOTAL_SIZE, MAX_INDIVIDUAL_FILE_SIZE, formatFileSize } from './attachmentUtils';
import { useDropzone } from 'react-dropzone';
import { FaPaperclip } from 'react-icons/fa6';
import { formatComposedEmailData } from '../../utils/composedDataFormat';
import EmailPriorityField from './EmailPriorityField';
import { useDraftMail, useSendMail } from '../../hooks/useComposer';
import { emailAddress } from '../../state/emailAddress';
import { userSettingsAtom } from '../../state/settings';
import { useToast } from '../../hooks/useToast';
import TemplateSelector from './TempelateSelector';
import { generateMessageId, sendMailV2 } from '../../api/composer';
import { userDetailsAtom } from '../../state/userDetails';
import { folderQuotaAtom } from '../../state/folders';
import { FaExclamationTriangle } from 'react-icons/fa';
import CustomModal from './CustomModal';
import { SEND_DEFAULT } from '../../constants/constant';
import { useIsMobile } from '../../hooks/use-mobile';
import { getEditorDimensions } from '../../utils/dimensions';

export type EmailPriority = 'normal' | 'high' | 'low';

// Types for localStorage data
interface LocalStorageDraft {
  messageId: string;
  composerData: ComposedEmailData;
  priority: EmailPriority;
  folder: string;
  timestamp: number;
}

// LocalStorage keys
const DRAFT_STORAGE_KEY = 'email-composer-draft';

// Debounce hook with proper typing
const useDebounce = <Args extends unknown[]>(callback: (...args: Args) => void, delay: number) => {
  const timeoutRef = useRef<number | null>(null);
  const cancelRef = useRef<() => void>(() => {});

  const debouncedFunction = useCallback(
    (...args: Args) => {
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

  cancelRef.current = cancel;

  // Return both the debounced function and cancel function
  return [debouncedFunction, cancel] as const;
};

const Composer = () => {
  const toast = useToast();
  const [openComposer, setOpenComposer] = useAtom(composerOpenAtom);
  const [composerData, setComposerData] = useAtom(composerDataAtom);
  const resetComposerData = useSetAtom(resetComposerDataAtom);

  // Get folder quota data
  const folderQuota = useAtomValue(folderQuotaAtom);

  const [fieldVisibility, setFieldVisibility] = useState({
    cc: false,
    bcc: false,
  });
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const { mutate: saveMutate } = useSendMail();
  const { mutate: draftMutate, isPending: isDrafting } = useDraftMail();
  const currentEmail = useAtomValue(emailAddress);
  const userSettings = useAtomValue(userSettingsAtom);
  const userDetails = useAtomValue(userDetailsAtom);
  const [fullViewEnabled, setFullViewEnabled] = useState(false);
  const [draftMessageId, setDraftMessageId] = useAtom(draftMessageIdAtom);
  const [messageId, setMessageId] = useState<string>('');
  const [, setSentMessageId] = useState<string>('');
  const [undoTime, setUndoTime] = useState<number>(5000);
  const [saveDraft, setSaveDraft] = useState<string>('Drafts');
  const [folder, setFolder] = useState<string>('Sent');
  const isMobile = useIsMobile();
  // Refs for recipient fields to access flush method
  const toRef = useRef<RecipientFieldHandle>(null);
  const ccRef = useRef<RecipientFieldHandle>(null);
  const bccRef = useRef<RecipientFieldHandle>(null);

  useEffect(() => {
    if (userSettings?.email) {
      const time = Number(userSettings?.email?.undo_send || 5) * 1000;
      setUndoTime(time);
      setSaveDraft('Drafts');
      setFolder(SEND_DEFAULT || 'Sent');
    }
  }, [userSettings]);

  // Add state for empty message confirmation modal
  const [showEmptyMessageConfirm, setShowEmptyMessageConfirm] = useState(false);
  const [pendingSendAction, setPendingSendAction] = useState<(() => void) | null>(null);

  // Add state for close confirmation dialog
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [, setPendingCloseAction] = useState<(() => void) | null>(null);

  // Add state to track if there are unsaved changes
  // const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const {
    show_attach_file_button = true,
    show_bcc_field = true,
    show_body_field = true,
    show_cc_field = true,
    show_save_draft_button = true,
    show_send_button = true,
    show_subject_field = true,
    show_to_field = true,
  } = userSettings?.compose ?? {};

  // Check if quota is exceeded (greater than 98%)
  const isQuotaExceeded = useMemo(() => {
    return folderQuota?.used_percent !== undefined && folderQuota.used_percent > 98;
  }, [folderQuota]);

  // Track if we've already auto-saved to prevent duplicate saves
  const hasAutoSavedRef = useRef(false);
  // Track pending email to be sent
  const pendingEmailRef = useRef<{
    mailData: ReturnType<typeof formatComposedEmailData>;
    currentMsgId: string;
  } | null>(null);
  // Track if we're in the undo period
  const isUndoPeriodRef = useRef(false);
  // Track auto-save attempts to prevent too many API calls
  const autoSaveCountRef = useRef(0);
  // Ref to track current messageId to avoid stale closures
  const messageIdRef = useRef(draftMessageId);
  // Track if sending is in progress to prevent auto-save
  const isSendingRef = useRef(false);
  // Track if the actual HTTP send is in flight (after undo period)
  const isSendInFlightRef = useRef(false);
  // Track if draft is being saved manually
  const isManualDraftSaveRef = useRef(false);
  // Track latest composer data for debounced auto-save to prevent stale closure
  const composerDataRef = useRef(composerData);

  useEffect(() => {
    composerDataRef.current = composerData;
  }, [composerData]);

  // Add this useEffect to sync messageId with draftMessageIdAtom
  useEffect(() => {
    if (draftMessageId && draftMessageId !== messageId) {
      setMessageId(draftMessageId);
    }
  }, [draftMessageId]);

  // Update messageId ref when messageId changes
  useEffect(() => {
    messageIdRef.current = messageId;
  }, [messageId]);

  // Check if message body is empty (excluding signature)
  const isMessageEmpty = useMemo(() => {
    if (!composerData.html) return true;

    // Get signature HTML
    const selectedSignatureName = userSettings?.general?.selected_signature;
    const signatures = userSettings?.general?.signature || [];
    const selectedSignature = signatures.find((sig) => sig.name === selectedSignatureName);
    const signatureHtml = selectedSignature
      ? `<p><br></p><p><br></p>${selectedSignature.content}`
      : '';

    // Remove signature from HTML to check actual content
    let contentWithoutSignature = composerData.html;
    if (signatureHtml && composerData.html.includes(signatureHtml)) {
      contentWithoutSignature = composerData.html.replace(signatureHtml, '');
    }

    // Remove any HTML tags and whitespace
    const textContent = contentWithoutSignature
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/\s+/g, '') // Remove all whitespace
      .trim();

    // Also check plain text version
    const plainText = composerData.text ? composerData.text.trim() : '';

    return textContent.length === 0 && plainText.length === 0;
  }, [composerData.html, composerData.text, userSettings?.general]);

  // Load draft from localStorage when composer opens
  useEffect(() => {
    if (openComposer) {
      // Show warning if quota is exceeded
      if (isQuotaExceeded) {
        toast.error({
          description: 'Storage quota exceeded. Draft saving is disabled.',
          duration: 5000,
        });
      }

      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft: LocalStorageDraft = JSON.parse(savedDraft);
          // Set the messageId from the saved draft
          setMessageId(draft.messageId);
          setDraftMessageId(draft.messageId); // Also store in atom for persistence
          setComposerData(draft.composerData);
          setPriority(draft.priority);
          // setFolder(draft.folder);

          toast.success({
            description: 'Draft restored from auto-save',
            duration: 3000,
          });
        } catch (error) {
          console.error('Error loading draft from localStorage:', error);
          // Generate new messageId if loading fails
          const newMessageId = generateMessageId(userDetails?.domain || '');
          setMessageId(newMessageId);
          setDraftMessageId(newMessageId);
        }
      } else {
        // Generate new messageId if no saved draft
        const newMessageId = generateMessageId(userDetails?.domain || '');
        setMessageId(newMessageId);
        setDraftMessageId(newMessageId);
      }

      // Reset sending flag when composer opens
      isSendingRef.current = false;
      isManualDraftSaveRef.current = false;
    }
  }, [
    openComposer,
    userDetails?.domain,
    isQuotaExceeded,
    toast,
    setComposerData,
    setDraftMessageId,
  ]);

  // Save to localStorage - UPDATED to use current messageId
  const saveToLocalStorage = useCallback(
    (data: ComposedEmailData, currentPriority: EmailPriority, currentFolder: string) => {
      // Don't save if quota is exceeded
      if (isQuotaExceeded) {
        return;
      }

      const currentMsgId = messageIdRef.current || generateMessageId(userDetails?.domain || '');

      const draft: LocalStorageDraft = {
        messageId: currentMsgId,
        composerData: data,
        priority: currentPriority,
        folder: currentFolder,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        // Update messageId state if it was newly generated
        if (!messageIdRef.current) {
          setMessageId(currentMsgId);
          setDraftMessageId(currentMsgId);
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    },
    [userDetails?.domain, isQuotaExceeded, setDraftMessageId]
  );

  // Remove from localStorage
  const removeFromLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }, []);

  // Function to check if there are unsaved changes
  const checkForUnsavedChanges = useCallback(() => {
    // Check if any of the fields have content
    const hasContent =
      (composerData.to && composerData.to.length > 0) ||
      (composerData.cc && composerData.cc.length > 0) ||
      (composerData.bcc && composerData.bcc.length > 0) ||
      (composerData.subject && composerData.subject.trim().length > 0) ||
      (composerData.html && composerData.html.trim().length > 0 && !isMessageEmpty) ||
      (composerData.text && composerData.text.trim().length > 0);

    return hasContent;
  }, [composerData, isMessageEmpty]);

  // Function to close composer (common cleanup)
  const closeComposer = useCallback(() => {
    setOpenComposer(false);
    resetComposerData();
    // Remove from localStorage when closing
    removeFromLocalStorage();
    // Reset the auto-save flag when closing
    hasAutoSavedRef.current = false;
    autoSaveCountRef.current = 0;
    isSendingRef.current = false;
    isManualDraftSaveRef.current = false;
    // Clear BOTH message IDs when closing
    setDraftMessageId(null);
    setSentMessageId('');
    // Close confirmation modals if open
    setShowEmptyMessageConfirm(false);
    setShowCloseConfirm(false);

    // Cancel any pending auto-save
    if (debouncedSaveToDraftCancelRef.current) {
      debouncedSaveToDraftCancelRef.current();
    }
  }, [setOpenComposer, resetComposerData, removeFromLocalStorage, setDraftMessageId]);

  // Update the DialogWrapper onOpenChange to handle close attempts
  const handleComposerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // User is trying to close the dialog (clicking X or clicking outside)
        const hasChanges = checkForUnsavedChanges();

        if (hasChanges && !isQuotaExceeded) {
          // Show confirmation dialog
          setPendingCloseAction(() => () => {
            // User chose to close without saving
            closeComposer();
          });
          setShowCloseConfirm(true);
          // Prevent the dialog from closing immediately
          return;
        } else {
          // No unsaved changes or quota exceeded, close immediately
          closeComposer();
        }
      } else {
        // Opening the composer
        setOpenComposer(open);
      }
    },
    [checkForUnsavedChanges, isQuotaExceeded, closeComposer, setOpenComposer]
  );

  // Add this function to handle discard without saving
  const handleDiscardAndClose = useCallback(() => {
    closeComposer();
    setShowCloseConfirm(false);

    toast.success({
      description: 'Changes discarded',
      duration: 3000,
    });
  }, [closeComposer, toast]);

  const toggleField = (field: keyof typeof fieldVisibility) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const saveDraftToBackend = useCallback(() => {
    // Don't auto-save if quota is exceeded or if we're sending or manually saving
    if (isQuotaExceeded || isSendingRef.current || isManualDraftSaveRef.current) {
      return;
    }

    // Don't auto-save if we've already manually saved
    if (hasAutoSavedRef.current) return;

    const currentComposerData = composerDataRef.current;

    // Only auto-save when there's meaningful content
    const hasContent = currentComposerData.text && currentComposerData.text.length > 5;
    const hasRecipients = currentComposerData.to && currentComposerData.to.length > 0;
    const hasSubject = currentComposerData.subject && currentComposerData.subject.length > 0;

    if (hasContent || hasRecipients || hasSubject) {
      // Save to localStorage for immediate recovery
      saveToLocalStorage(currentComposerData, priority, folder);

      // Use the current draftMessageId or generate one specifically for draft
      const currentDraftMessageId = draftMessageId || generateMessageId(userDetails?.domain || '');

      // Update the draft messageId state if we generated a new one
      if (!draftMessageId) {
        setDraftMessageId(currentDraftMessageId);
      }

      const finalValue = {
        ...currentComposerData,
        from: currentEmail,
      };

      const mailData = formatComposedEmailData(finalValue, {
        folderPath: saveDraft,
        priority,
        isDraft: true,
        messageId: currentDraftMessageId, // Use draft-specific Message-ID
      });

      // Also save to backend API, but limit frequency to avoid too many API calls
      if (autoSaveCountRef.current < 10) {
        // Limit to 10 auto-saves per session
        draftMutate(mailData, {
          onSuccess: () => {
            autoSaveCountRef.current++;
          },
          onError: (err) => {
            console.error('Failed to auto-save draft:', err);
          },
        });
      }
    }
  }, [
    composerData,
    currentEmail,
    priority,
    folder,
    saveToLocalStorage,
    draftMutate,
    userDetails?.domain,
    draftMessageId,
    isQuotaExceeded,
  ]);

  // Update handleMailAction to generate different IDs for draft and send
  const handleMailAction = useCallback(
    ({
      isDraft,
      folderPath,
      successDescription,
      allowUndo = false,
      dataOverrides = {},
    }: {
      isDraft: boolean;
      folderPath: string;
      successTitle: string;
      successDescription: string;
      errorTitle: string;
      allowUndo?: boolean;
      dataOverrides?: Partial<ComposedEmailData>;
    }) => {
      // Check if trying to save draft when quota is exceeded
      if (isDraft && isQuotaExceeded) {
        toast.error({
          description:
            'Cannot save draft: Storage quota exceeded (98%+ used). Please free up space.',
        });
        return;
      }

      // Merge overrides with current composer data
      const currentData = { ...composerData, ...dataOverrides };

      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const replyEmail = userSettings?.general?.reply_to?.trim();

      let replyToHeader: string | undefined;

      // Validate email before using
      if (replyEmail && EMAIL_REGEX.test(replyEmail)) {
        replyToHeader = replyEmail;
      }

      const finalHeaders = { ...(currentData.headers || {}) };

      if (!isDraft && replyToHeader) {
        finalHeaders['reply-to'] = replyToHeader;
      }

      const finalValue = {
        ...currentData,
        from: currentEmail,
        headers: finalHeaders,
      };

      // Generate DIFFERENT Message-IDs for draft vs send
      let currentMsgId: string;

      if (isDraft) {
        // For drafts: use existing draftMessageId or generate new one
        currentMsgId = draftMessageId || generateMessageId(userDetails?.domain || '');
        if (!draftMessageId) {
          setDraftMessageId(currentMsgId);
        }
      } else {
        // For sending: always generate a NEW Message-ID
        currentMsgId = generateMessageId(userDetails?.domain || '');
        setSentMessageId(currentMsgId); // Store the sent message ID separately
        // Set sending flag to prevent auto-save
        isSendingRef.current = true;
      }

      const mailData = formatComposedEmailData(finalValue, {
        folderPath,
        priority,
        isDraft,
        messageId: currentMsgId,
      });

      const mutateFn = isDraft ? draftMutate : saveMutate;

      // Attach draft deletion info so the backend can clean up the draft on send
      if (!isDraft && (autoSaveCountRef.current > 0 || hasAutoSavedRef.current) && draftMessageId) {
        mailData.draft_saved = true;
        mailData.draft_folder_name = saveDraft || 'Drafts';
        mailData.draft_message_id = draftMessageId;
      }

      // If this is a send operation with undo allowed, store the data but don't send yet
      if (allowUndo && !isDraft) {
        pendingEmailRef.current = { mailData, currentMsgId };
        isUndoPeriodRef.current = true;
        setOpenComposer(false);
        // Remove from localStorage when sending
        removeFromLocalStorage();

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
              setSentMessageId('');
              isSendingRef.current = false;
              window.removeEventListener('beforeunload', handleBeforeUnload);
              toast.success({ description: 'Send cancelled.' });
            },
            duration: undoTime,
          },
        });

        // Use sendMail directly — the Composer may unmount (e.g. user changes folder)
        // before the timeout fires, making useMutation callbacks unreliable.
        setTimeout(async () => {
          if (!isUndoPeriodRef.current || !pendingEmailRef.current) return;
          isUndoPeriodRef.current = false;
          const mailToSend = pendingEmailRef.current.mailData;
          pendingEmailRef.current = null;
          isSendInFlightRef.current = true;
          const loadingId = toast.loading({ description: 'Sending…' });
          try {
            await sendMailV2(mailToSend);
            isSendInFlightRef.current = false;
            toast.dismiss(loadingId);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            toast.success({ description: successDescription });
            resetComposerData();
            hasAutoSavedRef.current = false;
            autoSaveCountRef.current = 0;
            setDraftMessageId(null);
            setSentMessageId('');
            isSendingRef.current = false;
          } catch (err) {
            isSendInFlightRef.current = false;
            toast.dismiss(loadingId);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            toast.error({
              description:
                (err instanceof Error && err.message) ||
                'An error occurred while sending mail. Please try again.',
            });
            setSentMessageId('');
            setOpenComposer(true);
            isSendingRef.current = false;
          }
        }, undoTime);
      } else {
        // For draft saves or sends without undo, proceed immediately
        // Remove from localStorage for both send and manual draft save
        removeFromLocalStorage();

        const loadingId = !isDraft ? toast.loading({ description: 'Sending…' }) : null;
        mutateFn(mailData, {
          onSuccess: () => {
            if (loadingId) toast.dismiss(loadingId);
            toast.success({
              description: successDescription,
            });
            if (!isDraft) {
              setOpenComposer(false);
              resetComposerData();
              // Clear BOTH message IDs after successful send
              setDraftMessageId(null);
              setSentMessageId('');
              isSendingRef.current = false; // Reset sending flag
            } else {
              // For drafts, ensure we keep the draft message ID
              setDraftMessageId(currentMsgId);
              isManualDraftSaveRef.current = false; // Reset manual save flag after successful save
            }
            // Reset the auto-save flag on successful operation
            hasAutoSavedRef.current = false;
            autoSaveCountRef.current = 0;
          },
          onError: (err) => {
            if (loadingId) toast.dismiss(loadingId);
            toast.error({
              description: err?.message || 'An error occurred while sending mail. Please try again.',
            });
            // On error, clear the sent message ID
            if (!isDraft) {
              setSentMessageId('');
              isSendingRef.current = false; // Reset sending flag
            } else {
              isManualDraftSaveRef.current = false; // Reset manual save flag on error
            }
            // Restore localStorage on error for drafts (only if quota not exceeded)
            if (isDraft && !isQuotaExceeded) {
              saveToLocalStorage(composerData, priority, folder);
            }
          },
        });
      }
    },
    [
      composerData,
      currentEmail,
      priority,
      draftMutate,
      saveMutate,
      removeFromLocalStorage,
      toast,
      setOpenComposer,
      resetComposerData,
      userDetails?.domain,
      setDraftMessageId,
      draftMessageId,
      folder,
      isQuotaExceeded,
      saveToLocalStorage,
    ]
  );

  // Function to actually send the email (after confirmation)
  const sendEmailConfirmed = useCallback(
    (overrides: Partial<ComposedEmailData> = {}) => {
      // Always generate a NEW Message-ID for sending, regardless of draft status
      const sendMessageId = generateMessageId(userDetails?.domain || '');
      setSentMessageId(sendMessageId);
      // Set sending flag to prevent auto-save
      isSendingRef.current = true;

      handleMailAction({
        isDraft: false,
        folderPath: folder,
        successTitle: 'Mail Sent',
        successDescription: 'Your email sent successfully',
        errorTitle: 'Failed to send mail',
        allowUndo: true,
        dataOverrides: overrides,
      });

      // Close confirmation modal
      setShowEmptyMessageConfirm(false);
    },
    [handleMailAction, folder, userDetails?.domain]
  );

  const handleSendButtonClick = useCallback(() => {
    // Cancel any pending auto-save
    if (debouncedSaveToDraftCancelRef.current) {
      debouncedSaveToDraftCancelRef.current();
    }

    // 1. Flush any pending text in recipient fields
    const pendingTo = toRef.current?.flush();
    const pendingCc = ccRef.current?.flush();
    const pendingBcc = bccRef.current?.flush();

    // 2. Calculate effective 'To' recipients to check if we have any
    const effectiveTo = [...(composerData.to || [])];
    if (pendingTo) {
      effectiveTo.push(pendingTo);
    }

    // 3. Validation: Require at least one recipient
    if (effectiveTo.length === 0) {
      toast.error({
        description: 'Please add at least one recipient.',
      });
      return; // Stop execution if no recipients
    }

    // 4. Prepare data overrides
    const overrides: Partial<ComposedEmailData> = {};
    if (pendingTo) overrides.to = effectiveTo;
    if (pendingCc) overrides.cc = [...(composerData.cc || []), pendingCc];
    if (pendingBcc) overrides.bcc = [...(composerData.bcc || []), pendingBcc];

    // Check if message is empty
    if (isMessageEmpty) {
      // Show confirmation modal instead of sending immediately
      // Pass overrides to the confirmed action
      setPendingSendAction(() => () => sendEmailConfirmed(overrides));
      setShowEmptyMessageConfirm(true);
    } else {
      // Send immediately if message has content
      sendEmailConfirmed(overrides);
    }
  }, [
    isMessageEmpty,
    sendEmailConfirmed,
    composerData.to,
    composerData.cc,
    composerData.bcc,
    toast,
  ]);

  const handleDraftButtonClick = useCallback(() => {
    // Don't save draft if quota is exceeded
    if (isQuotaExceeded) {
      toast.error({
        description: 'Cannot save draft: Storage quota exceeded (98%+ used). Please free up space.',
      });
      return;
    }

    // 1. Flush any pending text in recipient fields
    const pendingTo = toRef.current?.flush();
    const pendingCc = ccRef.current?.flush();
    const pendingBcc = bccRef.current?.flush();

    // 2. Calculate effective 'To' recipients
    const effectiveTo = [...(composerData.to || [])];
    if (pendingTo) {
      effectiveTo.push(pendingTo);
    }

    // 3. Validation: Require at least one recipient for drafts
    if (effectiveTo.length === 0) {
      toast.error({
        description: 'At least one recipient is required to save a draft.',
      });
      return;
    }

    // Set the flag to indicate we're manually saving a draft
    isManualDraftSaveRef.current = true;
    hasAutoSavedRef.current = true;

    // Cancel any pending auto-save
    if (debouncedSaveToDraftCancelRef.current) {
      debouncedSaveToDraftCancelRef.current();
    }

    // Remove from localStorage when manually saving draft
    removeFromLocalStorage();

    // 4. Prepare data overrides
    const overrides: Partial<ComposedEmailData> = {};
    if (pendingTo) overrides.to = effectiveTo;
    if (pendingCc) overrides.cc = [...(composerData.cc || []), pendingCc];
    if (pendingBcc) overrides.bcc = [...(composerData.bcc || []), pendingBcc];

    handleMailAction({
      isDraft: true,
      folderPath: saveDraft,
      successTitle: 'Mail draft success',
      successDescription: 'Your email stored in draft successfully',
      errorTitle: 'Failed to draft mail',
      dataOverrides: overrides,
    });

    setTimeout(() => {
      closeComposer();
    }, 1000);
  }, [
    handleMailAction,
    removeFromLocalStorage,
    isQuotaExceeded,
    toast,
    composerData.to,
    composerData.cc,
    composerData.bcc,
  ]);

  // Update the handleComposerCancel function
  const handleComposerCancel = useCallback(() => {
    // Check if there are unsaved changes
    const hasChanges = checkForUnsavedChanges();

    if (hasChanges && !isQuotaExceeded) {
      // Show confirmation dialog
      setPendingCloseAction(() => () => {
        // User chose to close without saving
        closeComposer();
      });
      setShowCloseConfirm(true);
    } else {
      // No unsaved changes or quota exceeded, close immediately
      closeComposer();
    }
  }, [checkForUnsavedChanges, isQuotaExceeded]);

  // Function to handle saving draft and closing
  const handleSaveAndClose = useCallback(() => {
    // First save the draft
    handleDraftButtonClick();
    // Then close the composer - wait a bit longer to ensure draft save is initiated
    // The handleDraftButtonClick already calls closeComposer with a timeout,
    // but we can close the confirm dialog immediately
    setShowCloseConfirm(false);
  }, [handleDraftButtonClick]);

  // The actual save to draft function - BOTH localStorage AND backend API
  const saveToDraft = useCallback(() => {
    const currentComposerData = composerDataRef.current;

    // Don't auto-save if quota is exceeded or if we're sending or manually saving
    if (
      isQuotaExceeded ||
      isSendingRef.current ||
      isManualDraftSaveRef.current ||
      currentComposerData.to.length === 0
    ) {
      return;
    }

    // Don't auto-save if we've already manually saved
    if (hasAutoSavedRef.current) return;

    if (isDrafting) return;

    // Only auto-save when there's meaningful content
    const hasContent = currentComposerData.text && currentComposerData.text.length > 5;
    const hasRecipients = currentComposerData.to && currentComposerData.to.length > 0;
    const hasSubject = currentComposerData.subject && currentComposerData.subject.length > 0;

    if (hasContent || hasRecipients || hasSubject) {
      // Save to localStorage for immediate recovery
      saveToLocalStorage(currentComposerData, priority, folder);

      // Also save to backend API, but limit frequency to avoid too many API calls
      if (autoSaveCountRef.current < 10) {
        // Limit to 10 auto-saves per session
        saveDraftToBackend();
      }
    }
  }, [priority, folder, saveToLocalStorage, saveDraftToBackend, isQuotaExceeded, isDrafting]);

  // Create a debounced version of saveToDraft with cancel function
  const [debouncedSaveToDraft, cancelDebouncedSaveToDraft] = useDebounce(saveToDraft, 15000); // 15 second delay
  const debouncedSaveToDraftCancelRef = useRef(cancelDebouncedSaveToDraft);

  // Update the cancel ref when the cancel function changes
  useEffect(() => {
    debouncedSaveToDraftCancelRef.current = cancelDebouncedSaveToDraft;
  }, [cancelDebouncedSaveToDraft]);

  const updateComposerData = useCallback(
    (fields: Partial<typeof composerData>) => {
      setComposerData((prev) => ({ ...prev, ...fields }));

      // Don't auto-save if sending is in progress, manually saving draft, or quota exceeded
      if (isSendingRef.current || isManualDraftSaveRef.current || isQuotaExceeded) {
        return;
      }

      // Auto-save when any meaningful content changes
      const hasTextChange = fields?.text && fields.text.length > 0;
      const hasRecipientChange = fields?.to && fields.to.length > 0;
      const hasSubjectChange = fields?.subject && fields.subject.length > 0;
      const hasHtmlChange = fields?.html && fields.html.length > 0;

      if (hasTextChange || hasRecipientChange || hasSubjectChange || hasHtmlChange) {
        debouncedSaveToDraft();
      }
    },
    [setComposerData, debouncedSaveToDraft, isQuotaExceeded]
  );

  const signatureHtml = useMemo(() => {
    const selectedSignatureName = userSettings?.general?.selected_signature;
    const signatures = userSettings?.general?.signature || [];
    const selectedSignature = signatures.find((sig) => sig.name === selectedSignatureName);

    return selectedSignature ? `<p><br><br></p>${selectedSignature.content}` : '';
  }, [userSettings?.general?.selected_signature, userSettings?.general?.signature]);

  // Initialize composer data with signature
  useEffect(() => {
    if (openComposer && signatureHtml && !composerData.html) {
      setComposerData((prev) => {
        const from = prev.from || ({} as Partial<EmailAddress>);
        const sanitizeString = (value: unknown): string => {
          return typeof value === 'string' ? value.trim() : '';
        };
        return {
          ...prev,
          from: {
            // currentEmail is an EmailAddress object, not a string — if
            // sanitizeString(from?.address) is empty this assigns the whole
            // object here (objects are always truthy), not a string. Pre-existing,
            // preserved as-is; see CLAUDE.md.
            address: (sanitizeString(from?.address) || currentEmail || '') as string,
            name: sanitizeString(from?.name) || 'Unknown Sender',
          },
          html: prev.html || signatureHtml,
          text: prev.text || '',
        };
      });
    }
  }, [openComposer, signatureHtml, currentEmail, composerData.html, setComposerData]);

  const handleTemplateSelect = useCallback(
    (templateData: { subject: string; html: string }) => {
      // Combine template content with signature
      const contentWithSignature = templateData.html + signatureHtml;

      updateComposerData({
        subject: templateData.subject,
        html: contentWithSignature,
        text: contentWithSignature.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      });
    },
    [signatureHtml, updateComposerData]
  );

  const handleToemailChange = (emailAddresses: EmailAddress[]) => {
    updateComposerData({ to: emailAddresses });
  };

  // Cleanup on unmount — only cancel auto-save; do NOT touch the undo-send refs
  // because the setTimeout may still be counting down after the component unmounts
  // (e.g. user switched folder). Clearing those refs would silently drop the queued email.
  useEffect(() => {
    return () => {
      if (debouncedSaveToDraftCancelRef.current) {
        debouncedSaveToDraftCancelRef.current();
      }
    };
  }, []);
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const currentTotalSize = (composerData.attachments || []).reduce(
        (sum, file) => sum + (file.size || 0),
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

        setComposerData((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...base64Attachments],
        }));

        toast.success({
          description: `Added ${validFiles.length} file(s)`,
          duration: 3000,
        });
      } catch {
        toast.error({ description: 'Failed to process files.' });
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
        isOpen={openComposer}
        blocking={false}
        onClose={handleComposerOpenChange.bind(null, false)}
        title="New mail"
        position="bottom-right"
        draggable={true}
        isFullView={fullViewEnabled}
        onToggleFullView={() => setFullViewEnabled((prev) => !prev)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="2"
              onClick={handleComposerCancel}
              className="text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)]"
            >
              <FaDeleteLeft />
              Cancel
            </Button>

            {show_save_draft_button && (
              <>
                <div className="h-6 w-px bg-[var(--gray-6)]" />
                <Button
                  variant="ghost"
                  size="2"
                  onClick={handleDraftButtonClick}
                  className={`text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] ${
                    isQuotaExceeded ||
                    // RecipientFieldHandle doesn't actually expose `inputValue` (only `flush`),
                    // so this always evaluates truthy — pre-existing no-op, not fixed here.
                    (!composerData.to?.length &&
                      !(toRef.current as unknown as { inputValue?: string })?.inputValue)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  title={
                    !composerData.to?.length ? 'At least one recipient required to save draft' : ''
                  }
                  // We can't rely solely on state for 'disabled' because of pending text in Ref
                  disabled={isQuotaExceeded || isDrafting}
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
                </Button>
              </>
            )}

            {show_send_button && (
              <>
                <div className="h-6 w-px bg-[var(--gray-6)]" />
                <Button
                  variant="solid"
                  size="2"
                  onClick={handleSendButtonClick}
                  className="bg-[var(--blue-9)] hover:bg-[var(--blue-10)] text-white font-medium"
                  disabled={isQuotaExceeded}
                >
                  <FaPaperPlane />
                  Send
                </Button>
              </>
            )}
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
                  <p className="text-xl font-bold text-[var(--gray-12)]">
                    Drop files here to attach
                  </p>
                  <p className="text-sm text-[var(--gray-10)] mt-1">
                    Maximum {formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} per file
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Recipient Fields */}
          <div className="space-y-2 relative">
            {show_to_field && (
              <RecipientField
                ref={toRef}
                label="To"
                placeholder="Recipients email address"
                value={composerData.to}
                onChange={(emailAddresses) => handleToemailChange(emailAddresses)}
              />
            )}

            <div className="absolute right-0 top-1 z-50 flex gap-4 ml-2">
              {show_cc_field && (
                <Button
                  variant="ghost"
                  onClick={() => toggleField('cc')}
                  className="text-[var(--gray-11)] hover:text-[var(--gray-12)] text-sm"
                >
                  Cc
                </Button>
              )}
              {show_bcc_field && (
                <Button
                  variant="ghost"
                  onClick={() => toggleField('bcc')}
                  className="text-[var(--gray-11)] hover:text-[var(--gray-12)] text-sm"
                >
                  Bcc
                </Button>
              )}
            </div>

            {fieldVisibility.cc && (
              <RecipientField
                ref={ccRef}
                label="Cc"
                placeholder="Enter cc email address"
                value={composerData.cc}
                onChange={(emailAddresses) => updateComposerData({ cc: emailAddresses })}
              />
            )}

            {fieldVisibility.bcc && (
              <RecipientField
                ref={bccRef}
                label="Bcc"
                placeholder="Enter bcc email address"
                value={composerData.bcc}
                onChange={(emailAddresses) => updateComposerData({ bcc: emailAddresses })}
              />
            )}
          </div>

          {/* Subject Field */}
          {show_subject_field && (
            <SubjectField
              value={composerData.subject}
              onChange={(subject) => updateComposerData({ subject })}
            />
          )}

          {/* Priority and Template */}
          <div className="w-full flex flex-row md:gap-2 md:items-center px-2 space-y-2 md:space-y-0">
            <TemplateSelector onTemplateSelect={handleTemplateSelect} />
            <EmailPriorityField priority={priority} onChange={setPriority} />
          </div>

          {/* Quota Warning */}
          {isQuotaExceeded && (
            <div className="px-3 py-2 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex items-center">
                <div className="text-yellow-700 text-sm">
                  <strong>Storage Quota Exceeded:</strong> Draft saving is disabled because storage
                  is {folderQuota?.used_percent}% full. Please free up space to save drafts.
                </div>
              </div>
            </div>
          )}

          {/* Content Editor and Attachments */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {show_body_field && (
              <div className={`${!show_attach_file_button ? 'col-span-4' : 'col-span-3'}`}>
                <ContentEditor
                  onChange={({ html, text }) =>
                    updateComposerData({
                      html: html,
                      text: text,
                    })
                  }
                  value={composerData.html}
                  height={getEditorDimensions(isMobile, fullViewEnabled, false).height}
                  maxheight={getEditorDimensions(isMobile, fullViewEnabled, false).maxHeight}
                />
              </div>
            )}
            {show_attach_file_button && (
              <div className={`${!show_body_field ? 'col-span-4' : 'col-span-1'}`}>
                <AttachmentUploader
                  attachments={composerData.attachments || []}
                  onAttachmentsChange={(newAttachments) =>
                    updateComposerData({ attachments: newAttachments })
                  }
                  height={getEditorDimensions(isMobile, fullViewEnabled, true).height}
                  maxHeight={getEditorDimensions(isMobile, fullViewEnabled, true).maxHeight}
                  disableDrop={true}
                />
              </div>
            )}
          </div>
        </div>
      </CustomModal>

      {/* Close Confirmation Dialog */}
      <AlertDialog.Root open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialog.Content style={{ maxWidth: 450, borderRadius: 12 }}>
          <Flex direction="column" gap="4">
            <AlertDialog.Title>
              <Flex align="center" gap="2">
                <FaExclamationTriangle color="var(--orange-9)" />
                <span>Unsaved Changes</span>
              </Flex>
            </AlertDialog.Title>

            <Box>
              <Text size="2" color="gray" mb="3" as="div">
                You are closing this email. What would you like to do with your changes?
              </Text>

              {/* State 1: Quota Exceeded */}
              {isQuotaExceeded && (
                <Box
                  mt="3"
                  p="3"
                  className="bg-[var(--red-2)] border-l-4 border-[var(--red-9)] rounded"
                >
                  <Text size="2" color="red" weight="bold">
                    Draft saving disabled:
                  </Text>
                  <Text size="2" color="red" as="div">
                    Your storage is {folderQuota?.used_percent}% full. Please free up space to save
                    drafts.
                  </Text>
                </Box>
              )}

              {/* State 2: Missing Recipient (If Quota is okay but 'To' is empty) */}
              {!isQuotaExceeded && composerData.to.length === 0 && (
                <Box
                  mt="3"
                  p="3"
                  className="bg-[var(--accent-2)] border-l-4 border-[var(--accent-9)] rounded"
                >
                  <Text size="2" className="text-[var(--accent-11)] font-bold">
                    Recipient Required:
                  </Text>
                  <Text size="2" className="text-[var(--accent-11)]" as="div">
                    To save this as a draft, you must add at least one recipient in the "To" field.
                  </Text>
                </Box>
              )}
            </Box>

            <Flex gap="3" justify="end">
              {/* Always show Discard - It's the "Escape" hatch */}
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray" onClick={handleDiscardAndClose}>
                  Discard Changes
                </Button>
              </AlertDialog.Cancel>

              {/* Conditional Action Button */}
              {isQuotaExceeded || composerData.to.length === 0 ? (
                // Use "Back to Editing" to encourage them to fix the missing 'To' field
                <AlertDialog.Action>
                  <Button
                    variant="solid"
                    className="bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium px-4"
                    onClick={() => setShowCloseConfirm(false)}
                  >
                    Back to Editing
                  </Button>
                </AlertDialog.Action>
              ) : (
                // Success State: Allow saving
                <>
                  <AlertDialog.Action>
                    <Button
                      variant="outline"
                      color="gray"
                      onClick={() => setShowCloseConfirm(false)}
                      className="border-[var(--gray-6)] text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)]"
                    >
                      Cancel
                    </Button>
                  </AlertDialog.Action>

                  {/* Primary Action: Save Draft */}
                  <Button
                    variant="solid"
                    onClick={handleSaveAndClose}
                    className="bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium px-4"
                  >
                    Save Draft & Close
                  </Button>
                </>
              )}
            </Flex>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
      {/* Empty Message Confirmation Modal */}
      <Dialog.Root open={showEmptyMessageConfirm} onOpenChange={setShowEmptyMessageConfirm}>
        <Dialog.Content style={{ maxWidth: 450, borderRadius: 8 }}>
          <Dialog.Title>
            <Flex align="center" gap="2">
              <FaExclamationTriangle color="#f59e0b" />
              Send without message body?
            </Flex>
          </Dialog.Title>

          <Box py="4">
            <Text size="2" color="gray">
              You're about to send an email without any message content. The email will only have
              recipients and subject.
            </Text>

            <Box mt="4" p="3" style={{ backgroundColor: 'var(--yellow-2)', borderRadius: 6 }}>
              <Text size="2" color="yellow">
                Are you sure you want to send this empty message?
              </Text>
            </Box>
          </Box>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" onClick={() => setShowEmptyMessageConfirm(false)}>
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
                setShowEmptyMessageConfirm(false);
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

export default Composer;
