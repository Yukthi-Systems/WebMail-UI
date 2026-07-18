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

import { useState, useRef, useEffect } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';
import LinkPreviewTooltip from './LinkPreviewTooltip';

interface EmailTextContentProps {
  textContent: string;
  maxHeight?: number;
}

const linkRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;

const LinkWithPreview = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const [tooltipData, setTooltipData] = useState<{ url: string; rect: DOMRect } | null>(null);
  const hideTimeoutRef = useRef<number | undefined>(undefined);
  const showTimeoutRef = useRef<number | undefined>(undefined);

  return (
    <>
      <a
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel="noopener noreferrer"
        className="text-[var(--accent-11)] hover:underline break-all font-medium"
        onMouseEnter={(e) => {
          clearTimeout(hideTimeoutRef.current);
          clearTimeout(showTimeoutRef.current);
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          showTimeoutRef.current = window.setTimeout(() => {
            setTooltipData({ url: href, rect });
          }, 400);
        }}
        onMouseLeave={() => {
          clearTimeout(showTimeoutRef.current);
          hideTimeoutRef.current = window.setTimeout(() => setTooltipData(null), 50);
        }}
      >
        {children}
      </a>
      {tooltipData && (
        <LinkPreviewTooltip
          url={tooltipData.url}
          rect={tooltipData.rect}
          onMouseEnter={() => {
            clearTimeout(showTimeoutRef.current);
            clearTimeout(hideTimeoutRef.current);
          }}
          onMouseLeave={() => setTooltipData(null)}
        />
      )}
    </>
  );
};

const renderRichText = (text: string) => {
  if (!text) return null;
  const parts = text.split(linkRegex);
  return parts.map((part, index) => {
    if (part.match(/^https?:\/\/[^\s]+$/)) {
      return (
        <LinkWithPreview key={index} href={part}>
          {part}
        </LinkWithPreview>
      );
    } else if (part.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/)) {
      return (
        <LinkWithPreview key={index} href={`mailto:${part}`}>
          {part}
        </LinkWithPreview>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const EmailTextContent = ({ textContent, maxHeight = 500 }: EmailTextContentProps) => {
  const [isExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setShowExpandButton(contentHeight > maxHeight);
    }
  }, [textContent, maxHeight]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="space-y-3 !mt-4 relative group">
      <div
        className={`relative rounded-lg border border-[var(--gray-6)] bg-[var(--gray-2)] transition-all duration-300 ${!isExpanded && showExpandButton ? 'overflow-hidden' : ''}`}
      >
        <button
          onClick={handleCopyText}
          className="flex absolute right-2 top-2 z-10 items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--gray-11)] bg-[var(--gray-3)] border border-[var(--gray-6)] hover:bg-[var(--gray-4)] hover:text-[var(--gray-12)] rounded-md transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Copy text content"
        >
          {isCopied ? (
            <>
              <FiCheck size={14} className="text-[var(--green-11)]" />
              <span className="text-[var(--green-11)]">Copied</span>
            </>
          ) : (
            <>
              <FiCopy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>

        <div
          ref={contentRef}
          className={`
            p-5 text-[15px] leading-[1.6] text-[var(--gray-12)] transition-all duration-300 ease-in-out
            ${!isExpanded && showExpandButton ? `max-h-[${maxHeight}px]` : 'max-h-none'}
          `}
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {renderRichText(textContent)}
        </div>
      </div>
    </div>
  );
};

export default EmailTextContent;
