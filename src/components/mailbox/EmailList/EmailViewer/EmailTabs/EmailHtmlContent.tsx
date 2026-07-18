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

import { Button } from '@radix-ui/themes';
import { useRef, useState, useEffect, useCallback } from 'react';
import { FiAlertTriangle, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import { sanitizeHTMLContent } from '../../../../../utils/sanitizeHTMLContent';
import LinkPreviewTooltip from './LinkPreviewTooltip';

interface HtmlContentAttachment {
  filename?: string;
  contentId?: string;
  content?: string;
  mimeType?: string;
}

interface EmailHtmlContentProps {
  htmlContent: string;
  attachments?: HtmlContentAttachment[];
  allowExternalContent: boolean;
  onToggleExternalContent: (allow: boolean) => void;
}

function buildSrcDoc(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base target="_blank">
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flow-root;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    img { max-width: 100%; }
    a { cursor: pointer; }
    [data-table-scroll] {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      max-width: 100%;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

const EmailHtmlContent = ({
  htmlContent,
  attachments = [],
  allowExternalContent,
  onToggleExternalContent,
}: EmailHtmlContentProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(0);
  const [blockedSrcDoc, setBlockedSrcDoc] = useState('');
  const [unblockedSrcDoc, setUnblockedSrcDoc] = useState('');
  const [hoveredLink, setHoveredLink] = useState<{ url: string; rect: DOMRect } | null>(null);
  const hideTimeoutRef = useRef<number | undefined>(undefined);
  const showTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let processedHTML = htmlContent;

    if (attachments && attachments.length > 0) {
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
          processedHTML = processedHTML.replace(pattern, dataUrl);
        });
      });
    }

    setBlockedSrcDoc(buildSrcDoc(sanitizeHTMLContent(processedHTML, true)));
    setUnblockedSrcDoc(buildSrcDoc(sanitizeHTMLContent(processedHTML, false)));
  }, [htmlContent, attachments]);

  const syncHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;

      // Reset previous state so measurements are unconstrained
      doc.body.style.transform = '';
      doc.body.style.transformOrigin = '';
      doc.body.style.zoom = '';
      doc.documentElement.style.overflow = '';

      // Expand to a huge height so body.scrollHeight is never capped by the iframe
      // viewport. overflow:hidden from a prior call can make scrollHeight lie.
      iframe.style.height = '9999px';

      const naturalH = doc.body.scrollHeight;

      // Tables scroll via their own [data-table-scroll] wrappers; suppress all
      // document-level scrollbars so nothing else causes full-email scroll.
      doc.documentElement.style.overflow = 'hidden';

      const h = naturalH + 4;
      iframe.style.height = `${h}px`;
      setIframeHeight(h);
    } catch {
      // sandboxed cross-origin — no access
    }
  }, []);

  // Re-run zoom + height when the iframe's own width changes (e.g. panel resize, window resize)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(syncHeight);
    ro.observe(iframe);
    return () => ro.disconnect();
  }, [syncHeight]);

  // Wire up link preview and ResizeObserver once per iframe load
  const handleIframeLoad = useCallback(() => {
    syncHeight();

    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Wrap each outermost table in a scrollable div so wide tables get their
      // own horizontal scrollbar rather than causing the whole email to scale/scroll.
      // Nested tables (inside a <td>) are skipped — only the root table is wrapped.
      Array.from(doc.querySelectorAll('table')).forEach((table) => {
        if (table.parentElement?.closest('table')) return;
        const wrapper = doc.createElement('div');
        wrapper.setAttribute('data-table-scroll', '');
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });

      // Auto-resize when email images load or layout changes
      if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(syncHeight);
        ro.observe(doc.body);
      }

      // Re-measure after table wrapping changes the DOM
      syncHeight();

      // Link preview tooltip
      doc.addEventListener('mouseover', (e) => {
        const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
        if (!anchor?.href) return;
        clearTimeout(hideTimeoutRef.current);
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = window.setTimeout(() => {
          // Convert iframe-local rect to page-level rect
          const iframeRect = iframe.getBoundingClientRect();
          const linkRect = anchor.getBoundingClientRect();
          const pageRect = new DOMRect(
            iframeRect.left + linkRect.left,
            iframeRect.top + linkRect.top,
            linkRect.width,
            linkRect.height
          );
          setHoveredLink({ url: anchor.href, rect: pageRect });
        }, 400);
      });

      doc.addEventListener('mouseout', (e) => {
        const anchor = (e.target as HTMLElement).closest('a[href]');
        if (!anchor) return;
        clearTimeout(showTimeoutRef.current);
        hideTimeoutRef.current = window.setTimeout(() => setHoveredLink(null), 50);
      });
    } catch {
      // sandboxed
    }
  }, [syncHeight]);

  const srcDoc = allowExternalContent ? unblockedSrcDoc : blockedSrcDoc;

  return (
    <div className="space-y-4 !mt-4">
      {!allowExternalContent && (
        <div className="bg-[var(--amber-2)] border border-[var(--amber-6)] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <FiAlertTriangle size={18} className="text-[var(--amber-11)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--amber-12)]">
                External content blocked
              </div>
              <div className="text-xs text-[var(--amber-11)] mt-1">
                To protect your privacy, remote images and resources have been blocked.
              </div>
            </div>
            <Button
              size="2"
              onClick={() => onToggleExternalContent(true)}
              className="bg-[var(--amber-9)] hover:bg-[var(--amber-10)] text-white border-0 flex items-center gap-1 transition-colors"
            >
              <FiEye size={14} />
              <span className="hidden sm:inline">Load content</span>
            </Button>
          </div>
        </div>
      )}

      {allowExternalContent && (
        <div className="bg-[var(--green-2)] mt-4 border border-[var(--green-6)] rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiLock size={14} className="text-[var(--green-11)]" />
              <span className="text-sm text-[var(--green-12)]">External content loaded</span>
            </div>
            <button
              onClick={() => onToggleExternalContent(false)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded transition-colors"
            >
              <FiEyeOff size={12} />
              <span>Block</span>
            </button>
          </div>
        </div>
      )}

      {srcDoc && (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-same-origin allow-popups"
            title="Email content"
            style={{
              width: '100%',
              minWidth: '100%',
              height: iframeHeight > 0 ? `${iframeHeight}px` : '200px',
              border: 'none',
              display: 'block',
              overflow: 'hidden',
            }}
            onLoad={handleIframeLoad}
          />
        </div>
      )}

      {hoveredLink && (
        <LinkPreviewTooltip
          url={hoveredLink.url}
          rect={hoveredLink.rect}
          onMouseEnter={() => {
            clearTimeout(showTimeoutRef.current);
            clearTimeout(hideTimeoutRef.current);
          }}
          onMouseLeave={() => setHoveredLink(null)}
        />
      )}
    </div>
  );
};

export default EmailHtmlContent;
