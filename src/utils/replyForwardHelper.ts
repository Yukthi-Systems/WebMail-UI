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

// src/utils/composerUtils.ts   (or replyForwardHelper.ts)
// Fixed version – prevents duplicate headers like Date, MIME-Version, Subject, etc.

import { decodeWords } from 'postal-mime';
import { splitAddressList } from './emailUtils';

// ────────────────────────────────────────────────
// ────────────────────────────────────────────────

export type EmailPriority = 'normal' | 'high' | 'low';

export type EmailHeaders = Record<string, string | string[] | undefined>;

export type Address = {
  name: string;
  address: string;
};

// ────────────────────────────────────────────────
// ────────────────────────────────────────────────

export const generateMessageId = (domain: string = 'webmail.local'): string => {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `<${timestamp}.${random}@${domain}>`;
};

export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// ────────────────────────────────────────────────
// Address & Header Parsing
// ────────────────────────────────────────────────

export const parseEmailAddresses = (emailString: string | undefined): Address[] => {
  if (!emailString) return [];

  try {
    // Unfold RFC 2822 header folding (\r\n followed by whitespace → single space)
    const unfolded = emailString.replace(/\r?\n[\t ]+/g, ' ');

    return splitAddressList(unfolded).flatMap((part) => {
      const trimmed = part.trim();
      if (!trimmed) return [];

      // Standard format: "Display Name" <email> or Display Name <email>
      const angleMatch = trimmed.match(/^(?:"?([^"]*)"?\s*)?<([^>]+)>$/);
      if (angleMatch) {
        return [{ name: angleMatch[1]?.trim() || '', address: angleMatch[2].trim() }];
      }

      // RFC 2822 old-style: email@domain (Comment)
      const oldStyleMatch = trimmed.match(/^([^\s(,]+@[^\s(,]+)\s*(?:\(.*\))?$/);
      if (oldStyleMatch) {
        return [{ name: '', address: oldStyleMatch[1].trim() }];
      }

      // Malformed header — no extractable email address found.
      // Keep the raw string as `address` so the chip remains visible in the composer
      // and the send validation can surface an actionable error to the user.
      return [{ name: trimmed, address: '' }];
    });
  } catch (err) {
    console.error('Failed to parse email addresses:', err);
    return [];
  }
};

export const extractHeadersFromRawEmail = (rawEmail: string): EmailHeaders => {
  const headers: EmailHeaders = {};
  if (!rawEmail) return headers;

  try {
    const lines = rawEmail.split(/\r?\n/);
    let currentHeader = '';
    let headerValue = '';

    for (const line of lines) {
      if (line.trim() === '') {
        // End of headers
        if (currentHeader && headerValue) {
          headers[currentHeader] = decodeWords(headerValue.trim());
        }
        break;
      }

      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Folded continuation line
        headerValue += ' ' + line.trim();
      } else {
        // New header line
        if (currentHeader && headerValue) {
          headers[currentHeader] = decodeWords(headerValue.trim());
        }

        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          currentHeader = line.substring(0, colonIndex).trim();
          headerValue = line.substring(colonIndex + 1).trim();
        }
      }
    }

    // Last header
    if (currentHeader && headerValue) {
      headers[currentHeader] = decodeWords(headerValue.trim());
    }

    // Normalize header keys to Title-Case
    const normalized: EmailHeaders = {};
    Object.keys(headers).forEach((key) => {
      const normalizedKey = key
        .split('-')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('-');
      normalized[normalizedKey] = headers[key];
    });

    return normalized;
  } catch (err) {
    console.error('Header extraction failed:', err);
    return {};
  }
};

// ────────────────────────────────────────────────
// Build safe reply/forward headers – NO protected fields!
// ────────────────────────────────────────────────

export const buildReplyHeaders = (
  originalHeaders: EmailHeaders,
  newMessageId: string,
  mode: 'reply' | 'replyAll' | 'forward' | 'new' | 'draft' | 'editAsNew',
  userReplyTo?: string // Add this parameter
): EmailHeaders => {
  const headers: EmailHeaders = {};

  const msgId =
    originalHeaders['Message-Id'] || originalHeaders['Message-ID'] || originalHeaders['message-id'];

  if (mode === 'reply' || mode === 'replyAll') {
    headers['Message-ID'] = newMessageId;

    if (msgId) {
      headers['In-Reply-To'] = msgId as string;

      let refs = (originalHeaders['References'] || originalHeaders['references'] || '') as string;
      if (refs && !refs.includes(msgId as string)) {
        refs += ` ${msgId}`;
      } else if (!refs) {
        refs = msgId as string;
      }
      headers['References'] = refs;
    }

    ['Content-Language', 'Thread-Index', 'Thread-Topic'].forEach((h) => {
      if (originalHeaders[h]) headers[h] = originalHeaders[h];
    });
  } else if (mode === 'forward') {
    headers['Message-ID'] = newMessageId;
    if (msgId) {
      headers['X-Forwarded-Message-Id'] = msgId as string;
    }
    if (originalHeaders['Content-Language']) {
      headers['Content-Language'] = originalHeaders['Content-Language'];
    }
  } else if (mode === 'new') {
    headers['Message-ID'] = newMessageId;
  } else if (mode === 'draft') {
    Object.keys(originalHeaders).forEach((key) => {
      const lower = key.toLowerCase();
      if (
        !lower.startsWith('received') &&
        !lower.startsWith('x-ms-exchange') &&
        !lower.startsWith('x-microsoft') &&
        !lower.startsWith('arc-') &&
        !['from', 'to', 'cc', 'bcc', 'subject', 'date', 'mime-version', 'content-type'].includes(
          lower
        )
      ) {
        headers[key] = originalHeaders[key];
      }
    });
    if (!headers['Message-ID']) {
      headers['Message-ID'] = newMessageId;
    }
  }

  // Add user's Reply-To preference if provided (for new emails, not replies)
  if (userReplyTo && mode !== 'draft') {
    headers['Reply-To'] = userReplyTo;
  }

  return headers;
};
// ────────────────────────────────────────────────
// Attachments conversion (unchanged)
// ────────────────────────────────────────────────

export const convertPostalMimeAttachments = (postalMimeAttachments: any[]): any[] => {
  if (!postalMimeAttachments || !Array.isArray(postalMimeAttachments)) return [];

  return postalMimeAttachments
    .map((att) => {
      try {
        let data = '';
        let size = 0;
        const content = att.content;

        if (content instanceof ArrayBuffer) {
          const bytes = new Uint8Array(content);
          size = bytes.length;
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          data = btoa(binary);
        } else if (content instanceof Uint8Array) {
          size = content.length;
          let binary = '';
          for (let i = 0; i < content.length; i++) {
            binary += String.fromCharCode(content[i]);
          }
          data = btoa(binary);
        } else if (typeof content === 'string') {
          data = content;
          size = content.length;
        } else if (content && 'toString' in content) {
          data = content.toString('base64');
          size = content.length;
        }

        return {
          filename: att.filename || 'attachment',
          data,
          mime_type: att.mimeType || att.contentType || 'application/octet-stream',
          size,
          disposition: att.disposition || 'attachment',
          content_id: att.contentId || att.headers?.['content-id'] || null,
          ...(att.cid && { cid: att.cid }),
          ...(att.headers && { headers: att.headers }),
        };
      } catch (err) {
        console.error('Attachment conversion error:', err, att);
        return null;
      }
    })
    .filter((att): att is NonNullable<typeof att> => att !== null);
};

// ────────────────────────────────────────────────
// Inline image handling – incoming & outgoing
// ────────────────────────────────────────────────

export const processIncomingHtml = (html: string, allAttachments: any[]) => {
  if (!html) return { html: '', regularAttachments: allAttachments || [] };

  const attachmentMap = new Map<string, any>();
  allAttachments.forEach((att) => {
    const cid = att.content_id?.replace(/^<|>$/g, '') || null;
    if (cid) attachmentMap.set(cid, att);
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');

  const usedCids = new Set<string>();

  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src?.startsWith('cid:')) {
      const cid = src.replace('cid:', '');
      const att = attachmentMap.get(cid);
      if (att?.data) {
        img.setAttribute('src', `data:${att.mime_type};base64,${att.data}`);
        usedCids.add(cid);
      }
    }
  });

  const regularAttachments = allAttachments.filter((att) => {
    const cid = att.content_id?.replace(/^<|>$/g, '') || null;
    return !cid || !usedCids.has(cid);
  });

  return {
    html: doc.body.innerHTML,
    regularAttachments,
  };
};

export const processOutgoingHtml = (htmlContent: string) => {
  if (!htmlContent) return { html: '', inlineAttachments: [] };

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = doc.querySelectorAll('img');
  const inlineAttachments: any[] = [];

  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src?.startsWith('data:')) {
      const uniqueId = generateUniqueId();
      const [meta, data] = src.split(',');
      const mimeMatch = meta.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      inlineAttachments.push({
        data,
        mime_type: mimeType,
        content_id: uniqueId,
        filename: `embedded-${uniqueId}.${mimeType.split('/')[1] || 'png'}`,
      });

      img.setAttribute('src', `cid:${uniqueId}`);
    }
  });

  return {
    html: doc.body.innerHTML,
    inlineAttachments,
  };
};

// ────────────────────────────────────────────────
// Clean protected headers – VERY IMPORTANT
// ────────────────────────────────────────────────

const PROTECTED_HEADERS = [
  'from',
  'sender',
  'reply-to',
  'to',
  'cc',
  'bcc',
  'subject',
  'date',
  'message-id',
  'mime-version',
  'content-type',
  'content-transfer-encoding',
];

const cleanProtectedHeaders = (headers: EmailHeaders): EmailHeaders => {
  const cleaned = { ...headers };
  Object.keys(cleaned).forEach((key) => {
    if (PROTECTED_HEADERS.includes(key.toLowerCase())) {
      delete cleaned[key];
    }
  });
  return cleaned;
};

// const cleanProtectedHeaders = (headers: EmailHeaders): EmailHeaders => {
//   const cleaned = { ...headers };

//   // Only remove if they exist — let backend add if missing
//   // But do NOT force them from frontend

//   // Aggressive removal (current — safest)
//   PROTECTED_HEADERS.forEach((protectedKey) => {
//     const lower = protectedKey.toLowerCase();
//     Object.keys(cleaned).forEach((k) => {
//       if (k.toLowerCase() === lower) {
//         delete cleaned[k];
//       }
//     });
//   });

//   // Alternative softer version — only remove duplicates, keep one if present
//   // (but most people prefer the aggressive one above)

//   return cleaned;
// };

// ────────────────────────────────────────────────
// Format payload for backend – now with header cleaning
// ────────────────────────────────────────────────

export const formatComposedEmailData = (
  data: any,
  options: {
    folder_path: string;
    priority: EmailPriority;
    isDraft: boolean;
  }
) => {
  const { folder_path, isDraft } = options;

  const { html: processedHtml, inlineAttachments } = processOutgoingHtml(data.html || '');

  const to = Array.isArray(data.to)
    ? data.to.map((a: any) => ({ name: a.name || '', email: a.address || '' }))
    : [];

  const cc = Array.isArray(data.cc)
    ? data.cc.map((a: any) => ({ name: a.name || '', email: a.address || '' }))
    : [];

  const bcc = Array.isArray(data.bcc)
    ? data.bcc.map((a: any) => ({ name: a.name || '', email: a.address || '' }))
    : [];

  let headers = data.headers || {};
  headers = cleanProtectedHeaders(headers); // ← Prevents duplicates

  return {
    folder_path,
    priority: options.priority,
    isDraft,
    to,
    cc,
    bcc,
    subject: decodeWords(data.subject || '') || '',
    html: processedHtml,
    text: data.text || '',
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    in_line_attachments: inlineAttachments,
    headers, // Cleaned – safe to send
    from_id: data.from_id || { email: '', name: '' },
    timestamp: new Date().toISOString(),
    is_draft: isDraft,
    message_id: data.messageId || generateMessageId(),
    draft_saved: false,
  };
};
