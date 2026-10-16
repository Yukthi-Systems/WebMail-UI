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

// Attachment preview helpers shared by the email viewer and the composer:
// MIME detection, and HTML rendering for EML / Word / Excel files.

import { sanitizeHTMLContent } from '../../../utils/sanitizeHTMLContent';

/**
 * Loose shape covering postal-mime attachments, the composer's own attachment
 * payloads and /email/view attachments. The latter arrive without `content`; it
 * is downloaded through `loadContent()` when the user acts on the file.
 */
export interface PreviewAttachment {
  filename?: string;
  mimeType: string;
  content?: string;
  contentId?: string;
  size?: number; // bytes, when known up front
  loadContent?: () => Promise<string>;
}

export type LoadedAttachment = PreviewAttachment & { content: string };

const getSafeExtension = (filename?: string): string => {
  if (!filename) return '';
  const parts = filename?.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

export const normalizeMimeType = (mimeType: string, filename?: string): string => {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;

  const ext = getSafeExtension(filename);
  const typeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
    txt: 'text/plain',
    html: 'text/html',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    // EML
    eml: 'message/rfc822',
    msg: 'message/rfc822',
  };
  return typeMap[ext] || 'application/octet-stream';
};

// ─── File type helpers ───────────────────────────────────────────────────────

export const isWordFile = (mimeType: string) =>
  mimeType === 'application/msword' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const isExcelFile = (mimeType: string) =>
  mimeType === 'application/vnd.ms-excel' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  mimeType === 'text/csv';

export const isPowerPointFile = (mimeType: string) =>
  mimeType === 'application/vnd.ms-powerpoint' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const isOfficeFile = (mimeType: string) =>
  isWordFile(mimeType) || isExcelFile(mimeType) || isPowerPointFile(mimeType);

export const isEmlFile = (mimeType: string) => mimeType === 'message/rfc822';

/** Decodes base64 attachment content as UTF-8 text. */
export const decodeBase64Text = (base64Content: string): string => {
  const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');
  try {
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
};

// ─── EML Parser ──────────────────────────────────────────────────────────────

interface EmlParsed {
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  bodyHtml: string;
  bodyText: string;
  attachmentCount: number;
}

/** Decodes quoted-printable encoded strings. */
const decodeQuotedPrintable = (str: string): string =>
  str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

/** Decodes RFC 2047 encoded words like =?UTF-8?B?...?= or =?UTF-8?Q?...?= */
const decodeRfc2047 = (str: string): string => {
  if (!str) return '';
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        const bytes = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } else {
        const decoded = text
          .replace(/_/g, ' ')
          .replace(/=([0-9A-Fa-f]{2})/g, (_match: string, hex: string) =>
            String.fromCharCode(parseInt(hex, 16))
          );
        return decoded;
      }
    } catch {
      return text;
    }
  });
};

/** Parses raw EML text into headers + body parts. */
const parseEml = (raw: string): EmlParsed => {
  // Normalize line endings
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into header block and body
  const blankLineIdx = text.indexOf('\n\n');
  const headerBlock = blankLineIdx !== -1 ? text.slice(0, blankLineIdx) : text;
  const bodyBlock = blankLineIdx !== -1 ? text.slice(blankLineIdx + 2) : '';

  // Unfold headers (continuation lines start with whitespace)
  const unfoldedHeaders = headerBlock.replace(/\n[ \t]+/g, ' ');

  const getHeader = (name: string): string => {
    const match = unfoldedHeaders.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
    return match ? decodeRfc2047(match[1].trim()) : '';
  };

  const contentType = getHeader('Content-Type');
  const encoding = getHeader('Content-Transfer-Encoding').toLowerCase();

  // Helper: decode a body part given its transfer encoding
  const decodePart = (content: string, enc: string): string => {
    const trimmed = content.trim();
    if (enc === 'base64') {
      try {
        const bytes = Uint8Array.from(atob(trimmed.replace(/\s+/g, '')), (c) => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
      } catch {
        return trimmed;
      }
    }
    if (enc === 'quoted-printable') return decodeQuotedPrintable(trimmed);
    return trimmed;
  };

  let bodyHtml = '';
  let bodyText = '';
  let attachmentCount = 0;

  const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)["']?/i);

  if (boundaryMatch) {
    // Multipart message
    const boundary = boundaryMatch[1];
    const parts = bodyBlock.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?`));

    for (const part of parts) {
      if (!part.trim() || part.trim() === '--') continue;

      const partBlankIdx = part.indexOf('\n\n');
      if (partBlankIdx === -1) continue;

      const partHeaderRaw = part.slice(0, partBlankIdx).replace(/\n[ \t]+/g, ' ');
      const partBody = part.slice(partBlankIdx + 2);

      const getPartHeader = (name: string): string => {
        const m = partHeaderRaw.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
        return m ? m[1].trim() : '';
      };

      const partContentType = getPartHeader('Content-Type').toLowerCase();
      const partEncoding = getPartHeader('Content-Transfer-Encoding').toLowerCase();
      const disposition = getPartHeader('Content-Disposition').toLowerCase();

      // Skip attachments
      if (disposition.startsWith('attachment')) {
        attachmentCount++;
        continue;
      }

      if (partContentType.startsWith('text/html') && !bodyHtml) {
        bodyHtml = decodePart(partBody, partEncoding);
      } else if (partContentType.startsWith('text/plain') && !bodyText) {
        bodyText = decodePart(partBody, partEncoding);
      } else if (partContentType.startsWith('multipart/')) {
        // Nested multipart — try to find html/text in it
        const nestedBoundaryMatch = getPartHeader('Content-Type').match(
          /boundary=["']?([^"';\s]+)["']?/i
        );
        if (nestedBoundaryMatch) {
          const nb = nestedBoundaryMatch[1];
          const nestedParts = partBody.split(new RegExp(`--${escapeRegex(nb)}(?:--)?`));
          for (const np of nestedParts) {
            const npBlank = np.indexOf('\n\n');
            if (npBlank === -1) continue;
            const npHeaders = np.slice(0, npBlank).replace(/\n[ \t]+/g, ' ');
            const npBody = np.slice(npBlank + 2);
            const npType = (npHeaders.match(/^Content-Type:\s*(.+)$/im)?.[1] ?? '').toLowerCase();
            const npEnc = (
              npHeaders.match(/^Content-Transfer-Encoding:\s*(.+)$/im)?.[1] ?? ''
            ).toLowerCase();
            if (npType.startsWith('text/html') && !bodyHtml) {
              bodyHtml = decodePart(npBody, npEnc);
            } else if (npType.startsWith('text/plain') && !bodyText) {
              bodyText = decodePart(npBody, npEnc);
            }
          }
        }
      }
    }
  } else {
    // Single-part message
    const decoded = decodePart(bodyBlock, encoding);
    if (contentType.toLowerCase().includes('text/html')) {
      bodyHtml = decoded;
    } else {
      bodyText = decoded;
    }
  }

  return {
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    bodyHtml,
    bodyText,
    attachmentCount,
  };
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Renders a parsed EML into a full HTML document for iframe display. */
export const renderEmlToHtml = (base64Content: string): string => {
  const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');
  let raw: string;
  try {
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    raw = new TextDecoder('utf-8').decode(bytes);
  } catch {
    raw = atob(base64Data);
  }

  const eml = parseEml(raw);

  const headerRows = [
    eml.from && `<tr><th>From</th><td>${escHtml(eml.from)}</td></tr>`,
    eml.to && `<tr><th>To</th><td>${escHtml(eml.to)}</td></tr>`,
    eml.cc && `<tr><th>Cc</th><td>${escHtml(eml.cc)}</td></tr>`,
    eml.subject && `<tr><th>Subject</th><td>${escHtml(eml.subject)}</td></tr>`,
    eml.date && `<tr><th>Date</th><td>${escHtml(eml.date)}</td></tr>`,
    eml.attachmentCount > 0 &&
      `<tr><th>Attachments</th><td>${eml.attachmentCount} file(s)</td></tr>`,
  ]
    .filter(Boolean)
    .join('');

  // Prefer HTML body; fall back to plain text rendered as preformatted
  const bodyContent = eml.bodyHtml
    ? `<div class="email-body">${sanitizeHTMLContent(eml.bodyHtml)}</div>`
    : eml.bodyText
      ? `<div class="email-body"><pre class="plain-body">${escHtml(eml.bodyText)}</pre></div>`
      : `<div class="email-body empty">No body content found.</div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    background: #f4f4f5;
    color: #18181b;
    min-height: 100vh;
  }
  .wrapper { max-width: 860px; margin: 0 auto; padding: 20px 16px 40px; }

  /* Header card */
  .header-card {
    background: #fff;
    border: 1px solid #e4e4e7;
    border-radius: 10px 10px 0 0;
    overflow: hidden;
  }
  .header-title {
    background: #18181b;
    color: #fafafa;
    padding: 12px 18px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.01em;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .header-title svg { opacity: 0.7; }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-table th {
    width: 90px;
    padding: 9px 14px;
    text-align: right;
    font-size: 11px;
    font-weight: 600;
    color: #71717a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    vertical-align: top;
    border-bottom: 1px solid #f4f4f5;
    white-space: nowrap;
  }
  .header-table td {
    padding: 9px 14px 9px 8px;
    color: #27272a;
    font-size: 13px;
    border-bottom: 1px solid #f4f4f5;
    word-break: break-word;
  }
  .header-table tr:last-child th,
  .header-table tr:last-child td { border-bottom: none; }

  /* Body card */
  .body-card {
    background: #fff;
    border: 1px solid #e4e4e7;
    border-top: none;
    border-radius: 0 0 10px 10px;
    overflow: hidden;
  }
  .body-divider {
    height: 1px;
    background: linear-gradient(to right, #e4e4e7 0%, #d4d4d8 50%, #e4e4e7 100%);
  }
  .email-body {
    padding: 24px 20px;
    line-height: 1.65;
    color: #27272a;
    overflow-x: auto;
  }
  .email-body.empty {
    color: #a1a1aa;
    font-style: italic;
    padding: 40px 20px;
    text-align: center;
  }
  .plain-body {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    color: #3f3f46;
    background: #fafafa;
    border: 1px solid #e4e4e7;
    border-radius: 6px;
    padding: 16px;
  }

  /* Resets for HTML email body */
  .email-body img { max-width: 100%; height: auto; }
  .email-body a { color: #2563eb; }
  .email-body table { max-width: 100%; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header-card">
    <div class="header-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>
      Email Message
    </div>
    <table class="header-table">${headerRows}</table>
  </div>
  <div class="body-card">
    <div class="body-divider"></div>
    ${bodyContent}
  </div>
</div>
</body>
</html>`;
};

// ─── Office Preview Renderers ────────────────────────────────────────────────

export const renderExcelToHtml = async (
  base64Content: string,
  mimeType: string
): Promise<string> => {
  try {
    const XLSX = await import('xlsx');
    const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');
    const workbook =
      mimeType === 'text/csv'
        ? XLSX.read(atob(base64Data), { type: 'string' })
        : XLSX.read(base64Data, { type: 'base64' });

    const sheetNames = workbook.SheetNames;
    if (!sheetNames.length) return '<p>No sheets found in file.</p>';

    const tabs = sheetNames
      .map(
        (name: string, i: number) =>
          `<button class="sheet-tab ${i === 0 ? 'active' : ''}" data-sheet="${i}" onclick="switchSheet(${i})">${escHtml(name)}</button>`
      )
      .join('');

    const sheets = sheetNames
      .map((name: string, i: number) => {
        const sheet = workbook.Sheets[name];
        let html;

        try {
          // Check if sheet has valid range
          if (!sheet['!ref']) {
            html = '<p style="padding: 20px; color: #999;">Empty sheet</p>';
          } else {
            html = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${i}`, editable: false });
          }
        } catch (err) {
          console.error(`Error rendering sheet ${name}:`, err);
          html = `<p style="padding: 20px; color: #d9534f;">Unable to render this sheet</p>`;
        }

        return `<div class="sheet-content ${i === 0 ? 'active' : ''}" id="sheet-wrapper-${i}">${html}</div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 12px; background: #fff; }
  .sheet-tabs { display: flex; gap: 2px; padding: 6px 8px 0; background: #f1f3f5; border-bottom: 1px solid #dee2e6; flex-wrap: wrap; }
  .sheet-tab { padding: 4px 12px; border: 1px solid #dee2e6; border-bottom: none; background: #e9ecef; cursor: pointer; border-radius: 4px 4px 0 0; font-size: 11px; color: #495057; }
  .sheet-tab.active { background: #fff; color: #212529; font-weight: 600; border-bottom-color: #fff; }
  .sheet-content { display: none; overflow: auto; height: calc(100vh - 40px); }
  .sheet-content.active { display: block; }
  table { border-collapse: collapse; min-width: 100%; }
  th, td { border: 1px solid #dee2e6; padding: 4px 8px; white-space: nowrap; min-width: 80px; }
  th { background: #f8f9fa; font-weight: 600; position: sticky; top: 0; z-index: 1; }
  tr:nth-child(even) td { background: #f8f9fa; }
  tr:hover td { background: #e8f4fd; }
</style>
</head>
<body>
<div class="sheet-tabs">${tabs}</div>
${sheets}
<script>
function switchSheet(idx) {
  document.querySelectorAll('.sheet-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sheet-tab').forEach(el => el.classList.remove('active'));
  document.getElementById('sheet-wrapper-' + idx).classList.add('active');
  document.querySelectorAll('.sheet-tab')[idx].classList.add('active');
}
</script>
</body>
</html>`;
  } catch (e) {
    console.error('Excel parse error:', e);
    throw new Error('Failed to parse spreadsheet file.');
  }
};

export const renderWordToHtml = async (base64Content: string): Promise<string> => {
  const mammoth = await import('mammoth');
  const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer as ArrayBuffer });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: 'Segoe UI', Georgia, serif; font-size: 14px; line-height: 1.7; padding: 32px 48px; max-width: 860px; margin: 0 auto; color: #1a1a1a; background: #fff; }
  h1,h2,h3,h4,h5,h6 { margin: 1.2em 0 0.5em; color: #111; }
  p { margin: 0.6em 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  td, th { border: 1px solid #ccc; padding: 6px 10px; }
  th { background: #f0f0f0; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  ul, ol { padding-left: 1.6em; margin: 0.6em 0; }
  a { color: #0066cc; }
  blockquote { border-left: 3px solid #ccc; margin: 1em 0; padding-left: 1em; color: #555; }
  .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 12px; color: #856404; }
</style>
</head>
<body>
${result.messages.length ? `<div class="warning">⚠ Some formatting could not be converted.</div>` : ''}
${result.value}
</body>
</html>`;
};

const escHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── Capabilities & labels ───────────────────────────────────────────────────

export const canPreview = (mimeType: string): boolean =>
  mimeType.startsWith('image/') ||
  mimeType.startsWith('video/') ||
  mimeType.startsWith('audio/') ||
  mimeType === 'application/pdf' ||
  mimeType.startsWith('text/') ||
  isWordFile(mimeType) ||
  isExcelFile(mimeType) ||
  isEmlFile(mimeType);

export const canPrint = (mimeType: string): boolean =>
  mimeType.startsWith('image/') ||
  mimeType === 'application/pdf' ||
  mimeType.startsWith('text/') ||
  mimeType === 'application/json' ||
  mimeType === 'text/csv' ||
  isWordFile(mimeType) ||
  isExcelFile(mimeType) ||
  isEmlFile(mimeType);

/** Files previewed as rendered HTML rather than through a blob URL. */
export const isHtmlRendered = (mimeType: string): boolean =>
  isEmlFile(mimeType) || isWordFile(mimeType) || isExcelFile(mimeType);

export const getFileTypeLabel = (mimeType: string): string => {
  if (isEmlFile(mimeType)) return 'Email';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('pdf')) return 'PDF';
  if (isWordFile(mimeType)) return 'Word';
  if (mimeType === 'text/csv') return 'CSV';
  if (isExcelFile(mimeType)) return 'Excel';
  if (isPowerPointFile(mimeType)) return 'PowerPoint';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'Archive';
  if (mimeType.startsWith('text/')) return 'Text';
  if (mimeType.includes('json')) return 'JSON';
  return 'File';
};

// ─── Size ────────────────────────────────────────────────────────────────────

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const base64FileSize = (base64String?: string): string => {
  if (!base64String) return '0 B';
  const cleaned = base64String.replace(/^data:[^;]+;base64,/, '');
  const bytes =
    cleaned.length * (3 / 4) - (cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0);
  return formatBytes(bytes);
};

export const attachmentSize = (attachment: PreviewAttachment): string =>
  typeof attachment.size === 'number'
    ? formatBytes(attachment.size)
    : base64FileSize(attachment.content);

// ─── Blob / download / print ─────────────────────────────────────────────────

export const base64ToBlob = (base64: string, mimeType: string): Blob | null => {
  try {
    const data = base64.replace(/^data:[^;]+;base64,/, '');
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mimeType });
  } catch (e) {
    console.error('base64ToBlob error:', e);
    return null;
  }
};

export const downloadAttachment = (attachment: LoadedAttachment) => {
  const mime = normalizeMimeType(attachment.mimeType, attachment.filename);
  const blob = base64ToBlob(attachment.content, mime);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.filename || `download.${mime.split('/')[1]}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Renders EML / Word / Excel content to a standalone HTML document. */
export const renderAttachmentHtml = async (attachment: LoadedAttachment): Promise<string> => {
  const mime = normalizeMimeType(attachment.mimeType, attachment.filename);
  if (isEmlFile(mime)) return renderEmlToHtml(attachment.content);
  if (isExcelFile(mime)) return renderExcelToHtml(attachment.content, mime);
  if (isWordFile(mime)) return renderWordToHtml(attachment.content);
  return '';
};
