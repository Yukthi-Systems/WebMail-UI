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

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiCopy, FiExternalLink, FiLink, FiMail } from 'react-icons/fi';

interface LinkPreviewTooltipProps {
  url: string;
  rect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const TOOLTIP_WIDTH = 310;
const TOOLTIP_MARGIN = 10;

const LinkPreviewTooltip = ({ url, rect, onMouseEnter, onMouseLeave }: LinkPreviewTooltipProps) => {
  const [copied, setCopied] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  let domain = '';
  let isMailto = false;
  let displayAddress = url;

  try {
    const parsed = new URL(url);
    isMailto = parsed.protocol === 'mailto:';
    if (isMailto) {
      displayAddress = parsed.pathname; // email address
    } else {
      domain = parsed.hostname;
      displayAddress = url;
    }
  } catch {
    domain = url;
  }

  const faviconUrl =
    !isMailto && domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : null;

  // Position the card below the link, clamped to viewport
  let left = rect.left;
  let top = rect.bottom + TOOLTIP_MARGIN;

  if (left + TOOLTIP_WIDTH > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - TOOLTIP_WIDTH - 8);
  }

  const estimatedHeight = 130;
  if (top + estimatedHeight > window.innerHeight) {
    top = rect.top - estimatedHeight - TOOLTIP_MARGIN;
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const truncatedUrl =
    displayAddress.length > 65 ? displayAddress.slice(0, 62) + '…' : displayAddress;

  return createPortal(
    <div
      ref={tooltipRef}
      style={{
        left,
        top,
        width: TOOLTIP_WIDTH,
        position: 'fixed',
        zIndex: 9999,
        backgroundColor: 'var(--gray-1)',
        opacity: 1,
      }}
      className="border border-[var(--gray-6)] rounded-xl shadow-2xl p-3"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Domain / address row */}
      <div className="flex items-center gap-2 mb-2">
        {isMailto ? (
          <FiMail size={14} className="text-[var(--accent-10)] flex-shrink-0" />
        ) : faviconUrl ? (
          <img
            src={faviconUrl}
            width={15}
            height={15}
            className="flex-shrink-0 rounded-sm"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).replaceWith(
                Object.assign(document.createElement('span'), { textContent: '' })
              );
            }}
          />
        ) : (
          <FiLink size={14} className="text-[var(--gray-10)] flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-[var(--gray-12)] truncate">
          {isMailto ? displayAddress : domain}
        </span>
      </div>

      {/* Full URL in a mono block */}
      <div className="text-[11px] text-[var(--gray-10)] font-mono bg-[var(--gray-2)] px-2 py-1.5 rounded-lg border border-[var(--gray-5)] mb-3 leading-relaxed break-all">
        {truncatedUrl}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {!isMailto && (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--accent-11)] bg-[var(--accent-3)] hover:bg-[var(--accent-4)] rounded-md transition-colors"
          >
            <FiExternalLink size={11} />
            Open
          </button>
        )}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--gray-11)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
        >
          {copied ? <FiCheck size={11} className="text-[var(--green-11)]" /> : <FiCopy size={11} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default LinkPreviewTooltip;
