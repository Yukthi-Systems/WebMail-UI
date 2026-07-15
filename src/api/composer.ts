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

import { csrfTokenAtom } from '../state/auth';
import { webmailStore } from '../store.ts';
import { API_URL } from './config.ts';
import { v4 as uuidv4 } from 'uuid';
import { fetchWithAuth } from './fetchWrapper.ts';

export type EmailAddressObject = {
  email?: string;
  name?: string;
};

export type Attachment = {
  filename: string;
  data: string; // Base64 encoded content
  mime_type?: string;
  content_id?: string;
};

export type ComposerRequest = {
  from_id: EmailAddressObject; // Should be object, not string
  to: EmailAddressObject[]; // Should be array of objects, not strings
  cc: EmailAddressObject[];
  bcc: EmailAddressObject[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  attachments: Attachment[];
  in_line_attachments: Attachment[];
  folder_path?: string;
  reply_to?: EmailAddressObject; // Should be object, not string
  headers?: Record<string, string | string[]>;
  priority?: 'normal' | 'high' | 'low';
  timestamp?: string;
  is_draft: boolean;
  message_id?: string;
  draft_saved: boolean;
  draft_folder_name?: string;
  draft_message_id?: string;
};

function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return new Blob([buffer], { type: mimeType });
}

export const sendMailV2 = async (composedData: ComposerRequest): Promise<void> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  delete composedData.timestamp;

  const { attachments, in_line_attachments, message_id, is_draft, ...rest } = composedData;

  const dataJson: Record<string, unknown> = {
    ...rest,
    timestamp: new Date().toISOString(),
    headers: {
      ...rest.headers,
      'Message-ID': message_id,
    },
  };

  if (is_draft) delete dataJson.is_draft;

  const formData = new FormData();
  formData.append('data', JSON.stringify(dataJson));

  for (const att of attachments) {
    if (att.data) {
      formData.append(
        'attachments',
        base64ToBlob(att.data, att.mime_type || 'application/octet-stream'),
        att.filename
      );
    }
  }

  for (const att of in_line_attachments) {
    if (att.data) {
      formData.append(
        'in_line_attachments',
        base64ToBlob(att.data, att.mime_type || 'application/octet-stream'),
        att.content_id
      );
    }
  }

  const res = await fetchWithAuth(`${API_URL}/email/send`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to send email');
  }
  return data;
};

export const sendMail = async (composedData: ComposerRequest): Promise<void> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  delete composedData.timestamp;

  const FinalComposedData = {
    ...composedData,
    timestamp: new Date().toISOString(),
    headers: {
      ...composedData.headers,
      'Message-ID': composedData?.message_id,
    },
  };

  delete FinalComposedData.message_id;
  if (FinalComposedData.is_draft) {
    delete (FinalComposedData as Partial<ComposerRequest>).is_draft;
  }
  // delete (FinalComposedData as Partial<ComposerRequest>).is_draft;

  const res = await fetchWithAuth(`${API_URL}/email/send`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(FinalComposedData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to send email');
  }
  return data;
};

export const draftMail = async (composerData: ComposerRequest): Promise<void> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const FinalComposedData = {
    ...composerData,
    headers: {
      ...composerData.headers,
      'Message-ID': composerData?.message_id,
    },
  };

  delete FinalComposedData.message_id;
  if (FinalComposedData.is_draft) {
    // delete (FinalComposedData as Partial<ComposerRequest>).is_draft;
  }

  const formData = new FormData();
  formData.append('data', JSON.stringify(FinalComposedData));

  for (const att of FinalComposedData.attachments) {
    if (att.data) {
      formData.append(
        'attachments',
        base64ToBlob(att.data, att.mime_type || 'application/octet-stream'),
        att.filename
      );
    }
  }

  for (const att of FinalComposedData.in_line_attachments) {
    if (att.data) {
      formData.append(
        'in_line_attachments',
        base64ToBlob(att.data, att.mime_type || 'application/octet-stream'),
        att.content_id
      );
    }
  }

  const res = await fetchWithAuth(`${API_URL}/email/draft`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to send email');
  }
  return data;
};

// Helper function to generate Message-ID in standard email format with exact length
export const generateMessageId = (domain?: string): string => {
  const emailDomain = domain || 'webmail.local';

  // Generate a 69-character unique string (71 total with < and >)
  const generateRandomString = (length: number): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    // Start with timestamp for uniqueness
    result += Date.now().toString(36);
    // Add UUID without hyphens
    result += uuidv4().replace(/-/g, '');
    // Fill remaining space with random characters
    while (result.length < length) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Trim to exact length if needed
    return result.substring(0, length);
  };

  // Calculate needed ID length: 71 - 2 (< and >) - domain length - 1 (@)
  const idLength = 71 - 3 - emailDomain.length;
  const uniqueId = generateRandomString(idLength);

  return `<${uniqueId}@${emailDomain}>`;
};
