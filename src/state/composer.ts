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

import { atom } from 'jotai';
import { generateMessageId } from '../api/composer';

export type EmailAddress = {
  address: string;
  name?: string;
};

export type EmailAttachment = {
  filename: string;
  mime_type?: string;
  content?: string; // base64 encoded string
  data?: string; // base64 encoded string
  size?: number;
};

export type ComposedEmailData = {
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  date: string; // ISO format | add timezone
  text: string;
  html: string;
  headers: Record<string, string | string[]>; // if from postal-mime, array of header maps
  attachments: EmailAttachment[];
  messageId?: string;
};

const defaultComposerData: ComposedEmailData = {
  from: { address: '', name: '' },
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  date: new Date().toISOString(),
  text: '',
  html: '',
  headers: { 'X-YSPL-Client': 'YSPL-WebMail', 'X-Product': 'YSPL' },
  attachments: [],
  messageId: generateMessageId(),
};

export const composerOpenAtom = atom<boolean>(false);

export const createFolderOpenAtom = atom<boolean>(false);

export const composerDataAtom = atom<ComposedEmailData>({
  ...defaultComposerData,
});

export const resetComposerDataAtom = atom(null, (_, set) => {
  set(composerDataAtom, { ...defaultComposerData });
});
