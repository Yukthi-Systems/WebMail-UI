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

// src/hooks/useEmailComposer.ts
import { useState, useCallback } from 'react';
import type { Email } from '../api/mailbox';
import { useAtom } from 'jotai';
import { emailComposerOpenAtom } from '../state/emailComposer';

export const useEmailComposer = () => {
  const [composerOpen, setComposerOpen] = useAtom(emailComposerOpenAtom);
  const [replyingEmail, setReplyingEmail] = useState<Email | null>(null);
  const [replyingAllEmail, setReplyingAllEmail] = useState<Email | null>(null);
  const [forwardingEmail, setForwardingEmail] = useState<Email | null>(null);
  const [sendDraftEmail, setSendDraftEmail] = useState<Email | null>(null);

  const openComposer = useCallback(
    (mode: 'reply' | 'replyAll' | 'forward' | 'draft', email?: Email) => {
      switch (mode) {
        case 'reply':
          setReplyingEmail(email || null);
          setReplyingAllEmail(null);
          setForwardingEmail(null);
          setSendDraftEmail(null);
          break;
        case 'replyAll':
          setReplyingAllEmail(email || null);
          setReplyingEmail(null);
          setForwardingEmail(null);
          setSendDraftEmail(null);
          break;
        case 'forward':
          setForwardingEmail(email || null);
          setReplyingEmail(null);
          setReplyingAllEmail(null);
          setSendDraftEmail(null);
          break;
        case 'draft':
          setSendDraftEmail(email || null);
          setReplyingEmail(null);
          setReplyingAllEmail(null);
          setForwardingEmail(null);
          break;
      }
      setComposerOpen(true);
    },
    [setComposerOpen]
  );

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setReplyingEmail(null);
    setReplyingAllEmail(null);
    setForwardingEmail(null);
    setSendDraftEmail(null);
  }, [setComposerOpen]);

  const getComposerMode = useCallback(() => {
    if (replyingEmail) return 'reply';
    if (replyingAllEmail) return 'replyAll';
    if (forwardingEmail) return 'forward';
    if (sendDraftEmail) return 'draft';
    return 'new';
  }, [replyingEmail, replyingAllEmail, forwardingEmail, sendDraftEmail]);

  const getComposerEmail = useCallback(() => {
    return replyingEmail || replyingAllEmail || forwardingEmail || sendDraftEmail || null;
  }, [replyingEmail, replyingAllEmail, forwardingEmail, sendDraftEmail]);

  return {
    composerOpen,
    replyingEmail,
    replyingAllEmail,
    forwardingEmail,
    sendDraftEmail,

    openComposer,
    closeComposer,
    getComposerMode,
    getComposerEmail,
  };
};
