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

import { v4 as uuidv4 } from 'uuid';
import type { Attachment, ComposerRequest, EmailAddressObject } from '../api/composer';
import type { ComposedEmailData, EmailAddress, EmailAttachment } from '../state/composer';
import { generateMessageId } from '../api/composer';

/** Parses "Name <email>" format into EmailAddressObject. */
const parseEmailAddress = (emailStr: string): EmailAddressObject => {
  const match = emailStr.match(/(.*)<(.*)>/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return { name, email };
  }
  return { email: emailStr.trim() };
};

/** Converts state EmailAddress to API EmailAddressObject. */
const convertEmailAddressToObject = (email: EmailAddress): EmailAddressObject => {
  return {
    email: email.address,
    name: email.name,
  };
};

/** Converts EmailAttachment to API-compatible Attachment format. */
const formatAttachments = (attachments: EmailAttachment[]): Attachment[] => {
  return attachments.map(({ filename, mime_type, data, content }) => ({
    filename,
    mime_type,
    data: (data || content) as string,
  }));
};

/**
 * - INTERFACE EXTENSION: Ensure your local types match the new API structure. You
 *   might also need to add this to 'src/api/composer.ts' if not present.
 */
interface InlineAttachment {
  data: string;
  mime_type: string;
  content_id: string;
  filename: string;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

const processInlineAttachments = (htmlContent: string) => {
  // Safety check
  if (!htmlContent || !htmlContent.includes('data:image/')) {
    return {
      processedHtml: htmlContent,
      inlineAttachments: [] as InlineAttachment[],
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = doc.querySelectorAll('img');
  const inlineAttachments: InlineAttachment[] = [];

  images.forEach((img) => {
    const src = img.getAttribute('src');

    if (src && src.startsWith('data:image/')) {
      // UPDATED REGEX: Matches 'image/svg+xml' and other complex types
      // Group 1: Full Mime (image/png)
      // Group 2: Data (Base64 string)
      const match = src.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);

      if (match) {
        const mimeType = match[1]; // e.g. "image/jpeg"
        const base64Data = match[2];

        // 2. Safe Extension Logic
        const extension = MIME_TO_EXT[mimeType] || mimeType.split('/')[1] || 'png';

        const contentId = `inline-${uuidv4()}`;
        // Ensure strictly safe filename
        const filename = `image-${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;

        inlineAttachments.push({
          data: base64Data,
          mime_type: mimeType,
          content_id: contentId,
          filename: filename,
        });

        // Replace src
        img.setAttribute('src', `cid:${contentId}`);

        // Cleanup editor attributes
        img.removeAttribute('contenteditable');
        img.removeAttribute('draggable');

        // 3. (Optional but Recommended) Ensure the style string wasn't mangled by the Parser
        // If your editor specifically set 'width', ensure it's still clean.
        // The DOMParser usually preserves the 'width' attribute fine.
      }
    }
  });

  return {
    processedHtml: doc.body.innerHTML,
    inlineAttachments,
  };
};

export const formatComposedEmailData = (
  composed: ComposedEmailData,
  options?: {
    folderPath?: string;
    replyTo?: EmailAddress;
    priority?: 'normal' | 'high' | 'low';
    isDraft?: boolean;
    messageId?: string;
  }
): ComposerRequest & { in_line_attachments: InlineAttachment[] } => {
  // Extend return type
  const messageId = options?.messageId || composed.messageId || generateMessageId();

  // Convert addresses
  const from_id =
    typeof composed.from === 'string'
      ? parseEmailAddress(composed.from)
      : convertEmailAddressToObject(composed.from);

  const to = Array.isArray(composed.to)
    ? composed.to.map((item) =>
        typeof item === 'string' ? parseEmailAddress(item) : convertEmailAddressToObject(item)
      )
    : [];

  const cc = Array.isArray(composed.cc)
    ? composed.cc.map((item) =>
        typeof item === 'string' ? parseEmailAddress(item) : convertEmailAddressToObject(item)
      )
    : [];

  const bcc = Array.isArray(composed.bcc)
    ? composed.bcc.map((item) =>
        typeof item === 'string' ? parseEmailAddress(item) : convertEmailAddressToObject(item)
      )
    : [];

  const reply_to =
    !options?.isDraft && options?.replyTo
      ? convertEmailAddressToObject(options.replyTo)
      : undefined;

  // --- NEW LOGIC: Process Inline Images ---
  const { processedHtml, inlineAttachments } = processInlineAttachments(composed.html);

  return {
    from_id,
    to,
    cc,
    bcc,
    subject: composed.subject,
    body_text: composed.text,

    // Send the processed HTML containing 'cid:...' tags
    body_html: processedHtml,

    // Attachments separated into regular and inline
    attachments: formatAttachments(composed.attachments),
    in_line_attachments: inlineAttachments,

    folder_path: options?.folderPath,
    reply_to,
    headers: composed.headers,
    priority: options?.priority ?? 'normal',
    timestamp: composed.date,
    is_draft: options?.isDraft ?? false,
    message_id: messageId,
    draft_saved: false,
  };
};
