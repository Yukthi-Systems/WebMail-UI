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

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaPaperclip,
  FaDownload,
  FaFilePdf,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaFileWord,
  FaFileExcel,
  FaFileArchive,
  FaFile,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExpand,
  FaCompress,
  FaFilePowerpoint,
  FaFileCode,
  FaCopy,
  FaShare,
  FaSpinner,
  FaExclamationTriangle,
  FaEnvelope,
} from 'react-icons/fa';
import { useToast } from '../ui/ToastComponent';
import { sanitizeHTMLContent } from '../../utils/sanitizeHTMLContent';
import JSZip from 'jszip';

interface EmailAttachmentsProps {
  attachments: any[];
  emailHtml?: string;
}

const getSafeExtension = (filename: string): string => {
  if (!filename) return '';
  const parts = filename?.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

const normalizeMimeType = (mimeType: string, filename: string): string => {
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

const isWordFile = (mimeType: string) =>
  mimeType === 'application/msword' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const isExcelFile = (mimeType: string) =>
  mimeType === 'application/vnd.ms-excel' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  mimeType === 'text/csv';

const isPowerPointFile = (mimeType: string) =>
  mimeType === 'application/vnd.ms-powerpoint' ||
  mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const isOfficeFile = (mimeType: string) =>
  isWordFile(mimeType) || isExcelFile(mimeType) || isPowerPointFile(mimeType);

const isEmlFile = (mimeType: string) => mimeType === 'message/rfc822';

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
          .replace(/=([0-9A-Fa-f]{2})/g, (__: any, hex: any) =>
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
const renderEmlToHtml = (base64Content: string): string => {
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

const renderExcelToHtml = async (base64Content: string, mimeType: string): Promise<string> => {
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
          `<button class="sheet-tab ${i === 0 ? 'active' : ''}" data-sheet="${i}" onclick="switchSheet(${i})">${name}</button>`
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

const renderWordToHtml = async (base64Content: string): Promise<string> => {
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

const renderPptxToHtml = async (base64Content: string): Promise<string> => {
  const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const zip = await JSZip.loadAsync(bytes.buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)?.[1] ?? '0');
      const nb = parseInt(b.match(/slide(\d+)/)?.[1] ?? '0');
      return na - nb;
    });

  if (!slideFiles.length) throw new Error('No slides found in presentation.');

  let accentColor = '#4f46e5';
  try {
    const themeXml = await zip.files['ppt/theme/theme1.xml']?.async('string');
    if (themeXml) {
      const accent = themeXml.match(/<a:accent1[^>]*>.*?<a:srgbClr val="([0-9a-fA-F]{6})"/s);
      if (accent) accentColor = `#${accent[1]}`;
    }
  } catch {
    /* ignore */
  }

  const parseXmlText = (xml: string): { titles: string[]; bullets: string[]; notes: string } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const getTitleText = (el: Element): string =>
      Array.from(el.querySelectorAll('r t'))
        .map((t) => t.textContent)
        .join('')
        .trim();

    const titles: string[] = [];
    const bullets: string[] = [];

    const titlePlaceholders = doc.querySelectorAll('sp');
    titlePlaceholders.forEach((sp) => {
      const phType = sp.querySelector('ph')?.getAttribute('type') ?? '';
      const text = getTitleText(sp);
      if (!text) return;
      if (phType === 'ctrTitle' || phType === 'title' || phType === 'subTitle') {
        titles.push(text);
      } else {
        const paras = sp.querySelectorAll('p');
        paras.forEach((p) => {
          const paraText = Array.from(p.querySelectorAll('r t'))
            .map((t) => t.textContent)
            .join('')
            .trim();
          const level = parseInt(p.querySelector('pPr')?.getAttribute('lvl') ?? '0');
          if (paraText) bullets.push(`${level}:::${paraText}`);
        });
      }
    });

    return { titles, bullets, notes: '' };
  };

  const slideHtmlParts: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async('string');
    const { titles, bullets } = parseXmlText(xml);

    const titleHtml = titles
      .map((t, idx) =>
        idx === 0
          ? `<h2 class="slide-title">${escHtml(t)}</h2>`
          : `<h3 class="slide-subtitle">${escHtml(t)}</h3>`
      )
      .join('');

    const bulletHtml = bullets
      .map((b) => {
        const [lvlStr, ...rest] = b.split(':::');
        const lvl = parseInt(lvlStr);
        const text = rest.join(':::');
        return `<li class="bullet-lvl-${Math.min(lvl, 4)}">${escHtml(text)}</li>`;
      })
      .join('');

    const isEmpty = !titles.length && !bullets.length;

    slideHtmlParts.push(`
      <div class="slide" id="slide-${i}">
        <div class="slide-number">${i + 1} / ${slideFiles.length}</div>
        ${
          isEmpty
            ? '<div class="empty-slide">[ No text content on this slide ]</div>'
            : `${titleHtml}${bulletHtml ? `<ul class="bullet-list">${bulletHtml}</ul>` : ''}`
        }
      </div>
    `);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1e1e2e; padding: 20px; color: #cdd6f4; }
  .controls { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px 0 14px; background: #1e1e2e; }
  .controls button { padding: 6px 16px; background: ${accentColor}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
  .controls button:disabled { opacity: 0.35; cursor: default; }
  .controls .counter { font-size: 13px; color: #a6adc8; min-width: 80px; text-align: center; }
  .slide { display: none; background: #313244; border-radius: 12px; padding: 40px 48px; min-height: 360px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); position: relative; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .slide.active { display: flex; flex-direction: column; gap: 16px; }
  .slide-number { position: absolute; top: 14px; right: 18px; font-size: 11px; color: #6c7086; font-variant-numeric: tabular-nums; }
  .slide-title { font-size: 26px; font-weight: 700; color: #cdd6f4; line-height: 1.3; border-bottom: 2px solid ${accentColor}; padding-bottom: 12px; }
  .slide-subtitle { font-size: 17px; font-weight: 500; color: #a6adc8; }
  .bullet-list { list-style: none; display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
  .bullet-list li { padding-left: 20px; position: relative; color: #cdd6f4; font-size: 15px; line-height: 1.5; }
  .bullet-list li::before { content: '▸'; position: absolute; left: 0; color: ${accentColor}; }
  .bullet-lvl-1 { padding-left: 36px !important; font-size: 14px !important; color: #a6adc8 !important; }
  .bullet-lvl-2 { padding-left: 52px !important; font-size: 13px !important; color: #9399b2 !important; }
  .bullet-lvl-3, .bullet-lvl-4 { padding-left: 68px !important; font-size: 12px !important; color: #7f849c !important; }
  .bullet-lvl-1::before { content: '–' !important; }
  .bullet-lvl-2::before, .bullet-lvl-3::before, .bullet-lvl-4::before { content: '·' !important; }
  .empty-slide { color: #6c7086; font-style: italic; margin: auto; font-size: 14px; }
  .thumbnail-bar { display: flex; gap: 8px; margin-top: 16px; overflow-x: auto; padding-bottom: 4px; }
  .thumb { flex-shrink: 0; width: 100px; min-height: 64px; background: #313244; border: 2px solid transparent; border-radius: 6px; cursor: pointer; padding: 8px; font-size: 10px; color: #a6adc8; overflow: hidden; line-height: 1.3; }
  .thumb:hover { border-color: ${accentColor}88; }
  .thumb.active { border-color: ${accentColor}; }
  .thumb-num { font-size: 9px; color: #6c7086; margin-bottom: 3px; }
</style>
</head>
<body>
<div class="controls">
  <button id="btn-prev" onclick="go(-1)" disabled>← Prev</button>
  <span class="counter" id="counter">1 / ${slideFiles.length}</span>
  <button id="btn-next" onclick="go(1)" ${slideFiles.length <= 1 ? 'disabled' : ''}>Next →</button>
</div>
<div id="slides-container">
  ${slideHtmlParts.join('')}
</div>
<div class="thumbnail-bar" id="thumb-bar">
  ${slideHtmlParts
    .map(
      (
        _,
        i
      ) => `<div class="thumb ${i === 0 ? 'active' : ''}" id="thumb-${i}" onclick="jumpTo(${i})">
      <div class="thumb-num">Slide ${i + 1}</div>
    </div>`
    )
    .join('')}
</div>
<script>
  var cur = 0;
  var total = ${slideFiles.length};
  var slides = document.querySelectorAll('.slide');
  slides.forEach(function(s, i) {
    var th = document.getElementById('thumb-' + i);
    var title = s.querySelector('.slide-title');
    if (title) th.appendChild(document.createTextNode(title.textContent.substring(0, 40)));
  });
  function show(idx) {
    slides.forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.thumb').forEach(function(t) { t.classList.remove('active'); });
    slides[idx].classList.add('active');
    document.getElementById('thumb-' + idx).classList.add('active');
    document.getElementById('thumb-' + idx).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    document.getElementById('counter').textContent = (idx + 1) + ' / ' + total;
    document.getElementById('btn-prev').disabled = idx === 0;
    document.getElementById('btn-next').disabled = idx === total - 1;
    cur = idx;
  }
  function go(dir) { show(Math.max(0, Math.min(total - 1, cur + dir))); }
  function jumpTo(idx) { show(idx); }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1);
  });
  show(0);
</script>
</body>
</html>`;
};

const escHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ────────────────────────────────────────────────────────────────────────────

const EmailAttachments = ({ attachments, emailHtml = '' }: EmailAttachmentsProps) => {
  const displayAttachments = attachments.filter((att) => {
    if (!att.contentId) return true;
    const cidReference = `cid:${att.contentId.replace(/^<|>$/g, '')}`;
    return !emailHtml.includes(cidReference);
  });

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blobUrls, setBlobUrls] = useState<Map<number, string>>(new Map());
  const [officeHtml, setOfficeHtml] = useState<Map<number, string>>(new Map());
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [officeError, setOfficeError] = useState<Map<number, string>>(new Map());
  const [canShare, setCanShare] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function' && typeof navigator.canShare === 'function');
  }, []);

  useEffect(() => {
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ─── Icon helpers ──────────────────────────────────────────────────────────

  const getFileIcon = (mimeType: string, className: string = 'text-lg') => {
    if (isEmlFile(mimeType)) return <FaEnvelope className={`${className} text-[var(--blue-9)]`} />;
    if (mimeType.startsWith('image/'))
      return <FaFileImage className={`${className} text-[var(--green-9)]`} />;
    if (mimeType.startsWith('video/'))
      return <FaFileVideo className={`${className} text-[var(--red-9)]`} />;
    if (mimeType.startsWith('audio/'))
      return <FaFileAudio className={`${className} text-[var(--purple-9)]`} />;
    if (mimeType.includes('pdf'))
      return <FaFilePdf className={`${className} text-[var(--red-9)]`} />;
    if (isWordFile(mimeType)) return <FaFileWord className={`${className} text-[var(--blue-9)]`} />;
    if (isExcelFile(mimeType))
      return <FaFileExcel className={`${className} text-[var(--green-9)]`} />;
    if (isPowerPointFile(mimeType))
      return <FaFilePowerpoint className={`${className} text-[var(--orange-9)]`} />;
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar'))
      return <FaFileArchive className={`${className} text-[var(--orange-9)]`} />;
    if (
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      mimeType.includes('html') ||
      mimeType.includes('css')
    )
      return <FaFileCode className={`${className} text-[var(--violet-9)]`} />;
    return <FaFile className={`${className} text-[var(--gray-9)]`} />;
  };

  const getFileTypeLabel = (mimeType: string): string => {
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

  // ─── Size helpers ──────────────────────────────────────────────────────────

  const base64FileSize = (base64String: string): string => {
    if (!base64String) return '0 B';
    const cleaned = base64String.replace(/^data:[^;]+;base64,/, '');
    const bytes =
      cleaned.length * (3 / 4) - (cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // ─── Blob / File helpers ───────────────────────────────────────────────────

  const base64ToBlob = useCallback((base64: string, mimeType: string): Blob | null => {
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
  }, []);

  const base64ToFile = useCallback(
    (attachment: any): File | null => {
      const mime = normalizeMimeType(attachment.mimeType, attachment.filename);
      const blob = base64ToBlob(attachment.content, mime);
      if (!blob) return null;
      return new File([blob], attachment.filename || `file.${mime.split('/')[1]}`, { type: mime });
    },
    [base64ToBlob]
  );

  // ─── Download / Copy / Share ───────────────────────────────────────────────

  const handleDownload = useCallback(
    (attachment: any) => {
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
    },
    [base64ToBlob]
  );

  const handleCopyToClipboard = useCallback(
    async (attachment: any) => {
      const file = base64ToFile(attachment);
      if (!file) {
        toast.error({ description: 'Failed to prepare file' });
        return;
      }
      try {
        await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
        toast.success({ description: '✓ Image copied! Paste with Ctrl+V' });
      } catch {
        toast.error({ description: 'Failed to copy file' });
      }
    },
    [base64ToFile]
  );

  const handleShare = useCallback(
    async (attachment: any) => {
      const file = base64ToFile(attachment);
      if (!file) {
        toast.error({ description: 'Failed to prepare file' });
        return;
      }
      if (canShare) {
        try {
          const shareData = { files: [file] };
          if (navigator.canShare?.(shareData)) {
            await navigator.share(shareData);
            return;
          }
        } catch {
          /* user cancelled */
        }
      }
      handleDownload(attachment);
      toast.success({ description: `📁 Downloaded "${attachment.filename}"` });
    },
    [base64ToFile, canShare, handleDownload]
  );

  // ─── Preview capability ────────────────────────────────────────────────────

  const canPreview = (mimeType: string): boolean =>
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/') ||
    isWordFile(mimeType) ||
    isExcelFile(mimeType) ||
    isEmlFile(mimeType);

  // ─── Blob URL creation ─────────────────────────────────────────────────────

  const createBlobUrl = useCallback(
    (attachment: any, index: number): string | null => {
      if (blobUrls.has(index)) return blobUrls.get(index)!;
      const mime = normalizeMimeType(attachment.mimeType, attachment.filename);
      const blob = base64ToBlob(attachment.content, mime);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      setBlobUrls((prev) => new Map(prev).set(index, url));
      return url;
    },
    [base64ToBlob, blobUrls]
  );

  // ─── Office + EML HTML rendering ──────────────────────────────────────────

  const processOfficePreview = useCallback(
    async (attachment: any, index: number) => {
      if (officeHtml.has(index)) return;
      const mime = normalizeMimeType(attachment.mimeType, attachment.filename);

      setLoadingIndex(index);
      try {
        let html = '';
        if (isEmlFile(mime)) {
          html = renderEmlToHtml(attachment.content);
        } else if (isExcelFile(mime)) {
          html = await renderExcelToHtml(attachment.content, mime);
        } else if (isWordFile(mime)) {
          html = await renderWordToHtml(attachment.content);
        }
        setOfficeHtml((prev) => new Map(prev).set(index, html));
        setOfficeError((prev) => {
          const next = new Map(prev);
          next.delete(index);
          return next;
        });
      } catch (e: any) {
        setOfficeError((prev) => new Map(prev).set(index, e?.message || 'Preview failed'));
      } finally {
        setLoadingIndex(null);
      }
    },
    [officeHtml]
  );

  // ─── Open preview modal ────────────────────────────────────────────────────

  const handlePreview = useCallback(
    async (index: number, resetFullscreen = false) => {
      setPreviewIndex(index);
      if (resetFullscreen) setIsFullscreen(false);
      const att = displayAttachments[index];
      const mime = normalizeMimeType(att.mimeType, att.filename);

      if (isEmlFile(mime) || (isOfficeFile(mime) && !isPowerPointFile(mime))) {
        await processOfficePreview(att, index);
      } else if (!isOfficeFile(mime)) {
        setLoadingIndex(index);
        createBlobUrl(att, index);
        setTimeout(() => setLoadingIndex(null), 200);
      }
    },
    [displayAttachments, createBlobUrl, processOfficePreview]
  );

  const closePreview = useCallback(() => {
    setPreviewIndex(null);
    setIsFullscreen(false);
  }, []);

  const navigatePreview = useCallback(
    async (direction: 'next' | 'prev') => {
      if (previewIndex === null) return;
      const newIndex =
        direction === 'next'
          ? (previewIndex + 1) % displayAttachments.length
          : (previewIndex - 1 + displayAttachments.length) % displayAttachments.length;
      await handlePreview(newIndex);
    },
    [previewIndex, displayAttachments, handlePreview]
  );

  // ─── Render preview content ────────────────────────────────────────────────

  const renderPreviewContent = (attachment: any, index: number) => {
    const mime = normalizeMimeType(attachment.mimeType, attachment.filename);

    // EML / Office files rendered as HTML
    if (isEmlFile(mime) || isExcelFile(mime) || isWordFile(mime)) {
      const errMsg = officeError.get(index);
      const html = officeHtml.get(index);

      if (loadingIndex === index || (!html && !errMsg)) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--gray-11)]">
            <FaSpinner className="animate-spin text-3xl text-[var(--accent-9)]" />
            <span className="text-sm">
              {isEmlFile(mime)
                ? 'Parsing email…'
                : isExcelFile(mime)
                  ? 'Rendering spreadsheet…'
                  : 'Rendering document…'}
            </span>
          </div>
        );
      }

      if (errMsg) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <FaExclamationTriangle className="text-4xl text-[var(--yellow-9)]" />
            <p className="text-sm text-[var(--gray-11)]">{errMsg}</p>
            <button
              onClick={() => handleDownload(attachment)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg text-sm font-medium"
            >
              <FaDownload /> Download to View
            </button>
          </div>
        );
      }

      return (
        <iframe
          srcDoc={html}
          className="w-full h-full border-none bg-white"
          title={attachment.filename}
          sandbox="allow-scripts allow-same-origin"
        />
      );
    }

    // Images
    if (mime.startsWith('image/')) {
      const url = blobUrls.get(index);
      if (!url) return null;
      return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
          <img
            src={url}
            alt={attachment.filename}
            className="max-w-full max-h-full object-contain shadow-md rounded"
          />
        </div>
      );
    }

    // Video
    if (mime.startsWith('video/')) {
      const url = blobUrls.get(index);
      if (!url) return null;
      return (
        <div className="flex items-center justify-center h-full p-8">
          <video controls className="max-w-full max-h-full rounded shadow-lg" src={url}>
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio
    if (mime.startsWith('audio/')) {
      const url = blobUrls.get(index);
      if (!url) return null;
      return (
        <div className="flex items-center justify-center h-full bg-[var(--gray-2)]">
          <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-lg text-center min-w-[300px]">
            <div className="flex justify-center mb-6">
              <FaFileAudio className="text-6xl text-[var(--purple-9)]" />
            </div>
            <h3 className="mb-4 text-lg font-medium">{attachment.filename}</h3>
            <audio controls className="w-full" src={url} />
          </div>
        </div>
      );
    }

    // PDF / plain text
    if (mime === 'application/pdf' || mime.startsWith('text/')) {
      const url = blobUrls.get(index);
      if (!url) return null;
      return (
        <iframe
          src={mime === 'application/pdf' ? `${url}#toolbar=0` : url}
          className="w-full h-full border-none bg-white"
          title={attachment.filename}
        />
      );
    }

    return null;
  };

  // ─── Empty state ───────────────────────────────────────────────────────────

  if (!displayAttachments?.length) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--gray-3)] flex items-center justify-center">
            <FaPaperclip size={20} className="text-[var(--gray-9)]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-[var(--gray-12)]">No attachments</h3>
            <p className="text-xs text-[var(--gray-11)]">This email has no attachments</p>
          </div>
        </div>
      </div>
    );
  }

  const currentAttachment = previewIndex !== null ? displayAttachments[previewIndex] : null;
  const currentMimeType = currentAttachment
    ? normalizeMimeType(currentAttachment.mimeType, currentAttachment.filename)
    : '';
  const isPreviewable = currentAttachment && canPreview(currentMimeType);
  const isCurrentLoading = previewIndex !== null && loadingIndex === previewIndex;

  return (
    <>
      {/* Attachments Grid */}
      <div className="mt-4 space-y-4">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}
        >
          {displayAttachments.map((attachment, index) => {
            const mimeType = normalizeMimeType(attachment.mimeType, attachment.filename);
            const fileTypeLabel = getFileTypeLabel(mimeType);
            const fileSize = base64FileSize(attachment.content);
            const previewable = canPreview(mimeType);

            return (
              <div
                key={index}
                onClick={() => handlePreview(index, true)}
                className="group bg-[var(--color-surface)] border border-[var(--gray-6)] rounded-lg p-4 hover:border-[var(--gray-7)] hover:shadow-sm transition-all duration-200 cursor-pointer"
                title={previewable ? 'Click to preview' : 'Click to download'}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{getFileIcon(mimeType, 'text-xl')}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4
                        className="text-sm font-medium text-[var(--gray-12)] truncate"
                        title={attachment.filename}
                      >
                        {attachment.filename || 'Untitled File'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[var(--gray-11)]">
                        <span className="px-1.5 py-0.5 bg-[var(--gray-3)] rounded font-medium">
                          {fileTypeLabel}
                        </span>
                        <span>•</span>
                        <span>{fileSize}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {mimeType.startsWith('image/') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyToClipboard(attachment);
                          }}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-all duration-200"
                          title="Copy to clipboard"
                        >
                          <FaCopy size={12} />
                        </button>
                      )}
                      {canShare && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(attachment);
                          }}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-all duration-200"
                          title="Share"
                        >
                          <FaShare size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(attachment);
                        }}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-all duration-200"
                        title="Download"
                      >
                        <FaDownload size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewIndex !== null && currentAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className={`bg-[var(--color-panel)] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullscreen
                ? 'fixed inset-0 w-full h-full rounded-none'
                : 'w-full max-w-6xl h-[85vh] rounded-xl border border-[var(--gray-6)]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--gray-6)] bg-[var(--color-surface)] z-10">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(currentMimeType, 'text-xl')}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--gray-12)] truncate">
                    {currentAttachment.filename || 'Untitled File'}
                  </h3>
                  <p className="text-xs text-[var(--gray-11)]">
                    {getFileTypeLabel(currentMimeType)} •{' '}
                    {base64FileSize(currentAttachment.content)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPreviewable && (
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
                  >
                    {isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}
                  </button>
                )}
                <button
                  onClick={() => handleDownload(currentAttachment)}
                  className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
                >
                  <FaDownload size={14} />
                </button>
                <div className="w-px h-4 bg-[var(--gray-6)] mx-1" />
                <button
                  onClick={closePreview}
                  className="p-2 text-[var(--gray-11)] hover:text-[var(--red-9)] hover:bg-[var(--red-3)] rounded-md transition-colors"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative bg-[var(--gray-2)] overflow-hidden flex flex-col">
              {isCurrentLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] z-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[var(--gray-11)]">Loading preview…</span>
                  </div>
                </div>
              ) : isPreviewable ? (
                renderPreviewContent(currentAttachment, previewIndex)
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in zoom-in-95 duration-200">
                  <div className="w-24 h-24 rounded-full bg-[var(--gray-4)] flex items-center justify-center mb-6">
                    {getFileIcon(currentMimeType, 'text-5xl')}
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--gray-12)] mb-2">
                    Preview Unavailable
                  </h3>
                  <p className="text-[var(--gray-11)] max-w-md mb-8 leading-relaxed">
                    <strong>{getFileTypeLabel(currentMimeType)}</strong> files cannot be previewed
                    directly in the browser. Download the file to open it in the appropriate
                    application.
                  </p>
                  <button
                    onClick={() => handleDownload(currentAttachment)}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg font-medium shadow-md transition-all hover:scale-105"
                  >
                    <FaDownload /> Download File
                  </button>
                </div>
              )}
            </div>

            {/* Footer / Navigation */}
            {displayAttachments.length > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--gray-6)] bg-[var(--color-surface)] z-10">
                <button
                  onClick={() => navigatePreview('prev')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
                >
                  <FaChevronLeft size={12} /> Previous
                </button>
                <span className="text-xs font-mono text-[var(--gray-10)]">
                  {previewIndex + 1} / {displayAttachments.length}
                </span>
                <button
                  onClick={() => navigatePreview('next')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
                >
                  Next <FaChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EmailAttachments;
