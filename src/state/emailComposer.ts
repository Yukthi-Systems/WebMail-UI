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

// state/emailComposer.ts
import { atom } from 'jotai';
import { generateMessageId } from '../api/composer';

export type EmailAddress = {
  email: string;
  name?: string;
};

export type EmailAttachment = {
  filename: string;
  mimeType: string;
  content: string; // base64 encoded string
};

export interface ComposerEmail {
  from_id: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  html: string;
  text: string;
  attachments: EmailAttachment[];
  inlineAttachments?: EmailAttachment[];
  headers: Record<string, string | string[]>;
  messageId?: string;
}

export const emailComposerDataAtom = atom<ComposerEmail>({
  from_id: { email: '', name: '' },
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  html: '',
  text: '',
  headers: { 'X-YSPL-Client': 'YSPL-WebMail', 'X-Product': 'YSPL' },
  attachments: [],
  messageId: generateMessageId(),
});

export const emailComposerOpenAtom = atom(false);
// Keeps EmailComposer mounted (but modal hidden) during the undo-send countdown
// so component state is never lost. Set to true before setComposerOpen(false),
// reset to false once the send completes, fails, or is undone.
export const emailComposerKeepMountedAtom = atom(false);
export const emailComposerModeAtom = atom<'reply' | 'forward' | 'new'>('new');
// Not currently read anywhere; reserved for the original message when replying/forwarding.
export const emailComposerSourceEmailAtom = atom<unknown>(null);

export const resetEmailComposerDataAtom = atom(null, (_, set) => {
  // Removed the unused 'get' parameter
  set(emailComposerDataAtom, {
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    html: '',
    text: '',
    headers: { 'X-YSPL-Client': 'YSPL-WebMail', 'X-Product': 'YSPL' },
    attachments: [],
    from_id: { email: '', name: '' },
    messageId: generateMessageId(),
  });
  set(emailComposerSourceEmailAtom, null);
  set(emailComposerModeAtom, 'new');
});
