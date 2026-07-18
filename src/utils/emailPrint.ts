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

import { decodeWords } from 'postal-mime';

// Printable email/attachment objects carry whatever header keys the source
// (IMAP fetch, postal-mime parse) provided, so both stay loosely typed.
interface PrintableEmail {
  Subject?: string;
  From?: string;
  To?: string;
  Cc?: string;
  Date?: string | number;
  _messageId?: string;
  [key: string]: unknown;
}

interface PrintableAttachment {
  filename?: string;
  size?: number;
  contentId?: string;
  content?: string;
  mimeType?: string;
}

/** Escape HTML for safe display. */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getFullEmailAddress(emailField: string): string {
  if (!emailField) return '';
  const decoded = decodeWords(emailField);
  return escapeHtml(decoded);
}

/** Helper to format bytes to human readable size. */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/** Formats email header for printing. */
function formatEmailHeader(email: PrintableEmail, attachments?: PrintableAttachment[]): string {
  const messageId = (email['Message-ID'] ||
    email._messageId ||
    email['Message-id'] ||
    email['Message-Id'] ||
    email['message-id'] ||
    'N/A') as string;

  // Escape messageId to handle <> brackets safely
  const escapedMessageId = escapeHtml(messageId);

  // Format attachments if provided
  const attachmentsHtml =
    attachments && attachments.length > 0
      ? `
    <div class="email-attachments" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9ecef;">
      <p style="margin: 0 0 8px 0;"><strong>Attachments (${attachments.length}):</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        ${attachments
          .map(
            (att) => `
          <li style="margin: 6px 0; font-size: 13px;">
            📎 ${escapeHtml(att.filename || 'unnamed')} 
            ${att.size ? `(${formatBytes(att.size)})` : ''}
          </li>
        `
          )
          .join('')}
      </ul>
    </div>
  `
      : '';

  return `
    <div class="email-header">
      <h2>${decodeWords(email.Subject as string) || '(No Subject)'}</h2>
      <div class="email-meta">
        <p><strong>From:</strong> ${getFullEmailAddress(email.From || '')}</p>
        <p><strong>To:</strong> ${getFullEmailAddress(email.To || '')}</p>
        ${email.Cc ? `<p><strong>Cc:</strong> ${getFullEmailAddress(email.Cc)}</p>` : ''}
        <p><strong>Date:</strong> ${new Date(email.Date as string).toLocaleString()}</p>
        <p><strong>Message-ID:</strong> <span style="font-family: monospace; font-size: 12px; word-break: break-all;">${escapedMessageId}</span></p>
      </div>
      ${attachmentsHtml}
    </div>
  `;
}

/** Print email content with Safari compatibility. */
export function printEmail(email: unknown, emailContent: string, attachments?: unknown[]) {
  const printableEmail = email as PrintableEmail;
  const printableAttachments = attachments as PrintableAttachment[] | undefined;
  const printStyles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        margin: 0;
        padding: 24px;
        line-height: 1.6;
        color: #333;
      }
      
      .email-header {
        border-bottom: 2px solid #ddd;
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      
      .email-header h2 {
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 600;
        color: #000;
        word-wrap: break-word;
      }
      
      .email-meta {
        font-size: 14px;
        color: #555;
      }
      
      .email-meta p {
        margin: 8px 0;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      
      .email-meta strong {
        display: inline-block;
        min-width: 90px;
        color: #000;
      }

      .email-attachments {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 4px;
      }

      .email-attachments ul {
        list-style: none;
      }

      .email-attachments li {
        padding: 4px 0;
      }
      
      .email-body {
        padding: 8px 0;
        font-size: 14px;
        line-height: 1.8;
      }
      
      .email-body img {
        max-width: 100%;
        height: auto;
      }
      
      .print-button {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .print-button:hover {
        background: #0056b3;
      }
      
      @media print {
        body {
          margin: 0;
          padding: 16px;
        }
        
        .print-button {
          display: none !important;
        }
        
        .email-header {
          page-break-after: avoid;
        }
        
        .email-body {
          page-break-inside: avoid;
        }
      }
    </style>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Print - ${decodeWords(printableEmail.Subject as string) || 'Email'}</title>
        ${printStyles}
      </head>
      <body>
        <button class="print-button" onclick="window.print()">Print</button>
        ${formatEmailHeader(printableEmail, printableAttachments)}
        <div class="email-body">
          ${emailContent}
        </div>
      </body>
    </html>
  `;

  // Safari-compatible printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');

  if (!printWindow) {
    alert('Please allow popups to print emails');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Safari needs a delay before printing
  if (isSafari()) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250); // Increased delay for Safari
    };
  } else {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
}

/** Replace cid: URLs with base64 data URLs for inline attachments. */
function processCidAttachments(html: string, attachments: PrintableAttachment[]): string {
  let processed = html;
  attachments.forEach((attachment) => {
    const filename = attachment.filename || '';
    const contentId = attachment.contentId || '';
    const content = attachment.content || '';
    const mimeType = attachment.mimeType || 'image/png';

    if (!content) return;

    const dataUrl = `data:${mimeType};base64,${content}`;
    const cleanCid = contentId.replace(/[<>]/g, '');

    const patterns = [
      new RegExp(`cid:${filename.replace(/\./g, '\\.')}@[^"'\\s]+`, 'gi'),
      new RegExp(`cid:${cleanCid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
    ];

    patterns.forEach((pattern) => {
      processed = processed.replace(pattern, dataUrl);
    });
  });
  return processed;
}

/** Open email in new window. */
export function viewEmailInWindow(email: unknown, emailContent: string, attachments?: unknown[]) {
  const printableEmail = email as PrintableEmail;
  const printableAttachments = attachments as PrintableAttachment[] | undefined;
  const windowStyles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        margin: 0;
        padding: 24px;
        background: #f8f9fa;
      }
      
      .container {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        padding: 32px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .email-header {
        border-bottom: 2px solid #e9ecef;
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      
      .email-header h2 {
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 600;
        color: #212529;
      }
      
      .email-meta {
        font-size: 14px;
        color: #495057;
      }
      
      .email-meta p {
  margin: 8px 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-all;
}
      
      .email-meta strong {
        display: inline-block;
        min-width: 90px;
        color: #212529;
      }
      
      .email-body {
        padding: 8px 0;
        font-size: 14px;
        line-height: 1.8;
        color: #212529;
      }
      
      .email-body img {
        max-width: 100%;
        height: auto;
      }
    </style>
  `;

  const processedContent =
    printableAttachments && printableAttachments.length > 0
      ? processCidAttachments(emailContent, printableAttachments)
      : emailContent;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${decodeWords(printableEmail.Subject as string) || 'Email'}</title>
        ${windowStyles}
      </head>
      <body>
        <div class="container">
          ${formatEmailHeader(printableEmail)}
          <div class="email-body">
            ${processedContent}
          </div>
        </div>
      </body>
    </html>
  `;

  const newWindow = window.open('', '_blank', 'width=900,height=700,resizable=yes,scrollbars=yes');

  if (!newWindow) {
    alert('Please allow popups to view emails in new window');
    return;
  }

  newWindow.document.open();
  newWindow.document.write(htmlContent);
  newWindow.document.close();
}

/** View email raw source. */
export function viewEmailRaw(rawContent: string) {
  const rawStyles = `
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #1e1e1e;
        font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        font-size: 13px;
      }
      
      .toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #2d2d2d;
        padding: 12px 24px;
        border-bottom: 1px solid #444;
        z-index: 100;
      }
      
      .toolbar button {
        padding: 8px 16px;
        background: #0d6efd;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        margin-right: 8px;
      }
      
      .toolbar button:hover {
        background: #0b5ed7;
      }
      
      .raw-content {
        margin-top: 60px;
        background: #252526;
        padding: 20px;
        border-radius: 4px;
        overflow: auto;
      }
      
      pre {
        margin: 0;
        color: #d4d4d4;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    </style>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Raw Email Source</title>
        ${rawStyles}
      </head>
      <body>
        <div class="toolbar">
          <button onclick="copyToClipboard()">Copy to Clipboard</button>
          <button onclick="downloadRaw()">Download</button>
        </div>
        <div class="raw-content">
          <pre id="raw-text">${escapeHtml(rawContent)}</pre>
        </div>
        <script>
          function copyToClipboard() {
            const text = document.getElementById('raw-text').textContent;
            navigator.clipboard.writeText(text).then(() => {
              alert('Copied to clipboard!');
            }).catch(err => {
              console.error('Failed to copy:', err);
            });
          }
          
          function downloadRaw() {
            const text = document.getElementById('raw-text').textContent;
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'email-raw.txt';
            a.click();
            URL.revokeObjectURL(url);
          }
        </script>
      </body>
    </html>
  `;

  const newWindow = window.open('', '_blank', 'width=1000,height=800,resizable=yes,scrollbars=yes');

  if (!newWindow) {
    alert('Please allow popups to view raw email');
    return;
  }

  newWindow.document.open();
  newWindow.document.write(htmlContent);
  newWindow.document.close();
}

/** Detect Safari browser. */
function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
}
