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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCompress,
  FaDownload,
  FaExclamationTriangle,
  FaExpand,
  FaExternalLinkAlt,
  FaFileAudio,
  FaPen,
  FaPrint,
  FaSpinner,
  FaTimes,
} from 'react-icons/fa';
import { printAttachment } from '../../../utils/emailPrint';
import { getAttachmentIcon } from './fileIcon';
import RenameFileDialog from './RenameFileDialog';
import {
  attachmentSize,
  base64ToBlob,
  canPreview,
  canPrint,
  decodeBase64Text,
  downloadAttachment,
  getFileTypeLabel,
  isEmlFile,
  isExcelFile,
  isHtmlRendered,
  normalizeMimeType,
  renderAttachmentHtml,
  type LoadedAttachment,
  type PreviewAttachment,
} from './previewUtils';

interface AttachmentPreviewModalProps {
  attachments: PreviewAttachment[];
  /** Attachment being previewed; null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  /**
   * Returns the attachment with its content, downloading it first if needed.
   * Defaults to the attachment's own `content` / `loadContent()`.
   */
  resolveAttachment?: (
    attachment: PreviewAttachment,
    index: number
  ) => Promise<LoadedAttachment | null>;
  /** Shows a rename button next to the file name. */
  onRename?: (index: number, filename: string) => void;
  /**
   * Render above everything, e.g. over the composer. It goes into the
   * surrounding Radix theme root, not document.body: the theme's colors (and
   * dark mode) only apply inside it.
   */
  portal?: boolean;
}

type PreviewState =
  | { status: 'loading' }
  | {
      status: 'ready';
      key: string;
      attachment: LoadedAttachment;
      mime: string;
      url?: string;
      html?: string;
      error?: string;
    };

const defaultResolve = async (attachment: PreviewAttachment): Promise<LoadedAttachment | null> => {
  if (attachment.content) return attachment as LoadedAttachment;
  if (!attachment.loadContent) return null;
  return { ...attachment, content: await attachment.loadContent() };
};

// Same file → same rendered preview, however it is reached
const cacheKey = (attachment: LoadedAttachment, mime: string) =>
  `${mime}|${attachment.content.length}|${attachment.content.slice(0, 64)}|${attachment.content.slice(-64)}`;

const loadingLabel = (mime: string) => {
  if (isEmlFile(mime)) return 'Parsing email…';
  if (isExcelFile(mime)) return 'Rendering spreadsheet…';
  if (isHtmlRendered(mime)) return 'Rendering document…';
  return 'Loading preview…';
};

const AttachmentPreviewModal = ({
  attachments,
  index,
  onIndexChange,
  resolveAttachment,
  onRename,
  portal = false,
}: AttachmentPreviewModalProps) => {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Marks where the preview sits in the page, to find the theme root to render into
  const anchorRef = useRef<HTMLSpanElement>(null);
  const cacheRef = useRef(new Map<string, { url?: string; html?: string }>());

  // Latest callbacks without re-running the load effect when their identity changes
  const resolveRef = useRef(resolveAttachment);
  resolveRef.current = resolveAttachment;
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const current = index !== null ? attachments[index] : undefined;
  const isOpen = index !== null && !!current;
  const count = attachments.length;
  // Not the file name: renaming must not reload the preview
  const currentKey = current
    ? [index, current.mimeType, current.size ?? '', current.content?.length ?? 'lazy'].join('|')
    : '';

  useEffect(() => {
    const cache = cacheRef.current;
    return () => cache.forEach(({ url }) => url && URL.revokeObjectURL(url));
  }, []);

  // Fresh view each time the preview opens
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
    else setIsFullscreen(false);
  }, [isOpen]);

  useEffect(() => setIsRenaming(false), [index]);

  // Load the current attachment: its content, then a blob URL or rendered HTML
  useEffect(() => {
    if (index === null || !current) return;
    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const loaded = await (resolveRef.current ?? defaultResolve)(current, index).catch(() => null);
      if (cancelled) return;
      if (!loaded) {
        onIndexChangeRef.current(null);
        return;
      }

      const mime = normalizeMimeType(loaded.mimeType, loaded.filename);
      const key = cacheKey(loaded, mime);
      const cached = cacheRef.current.get(key) ?? {};
      let error: string | undefined;

      if (canPreview(mime)) {
        if (isHtmlRendered(mime)) {
          if (cached.html === undefined) {
            try {
              cached.html = await renderAttachmentHtml(loaded);
            } catch (e) {
              error = e instanceof Error ? e.message : 'Preview failed';
            }
          }
        } else if (!cached.url) {
          const blob = base64ToBlob(loaded.content, mime);
          if (blob) cached.url = URL.createObjectURL(blob);
        }
        cacheRef.current.set(key, cached);
      }

      if (cancelled) return;
      setState({
        status: 'ready',
        key: currentKey,
        attachment: loaded,
        mime,
        url: cached.url,
        html: cached.html,
        error,
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const close = useCallback(() => onIndexChange(null), [onIndexChange]);

  const navigate = useCallback(
    (step: 1 | -1) => {
      if (index === null || count < 2) return;
      onIndexChange((index + step + count) % count);
    },
    [index, count, onIndexChange]
  );

  // A result for another attachment (just navigated away from it) counts as loading
  const ready = state.status === 'ready' && state.key === currentKey ? state : null;
  // The name shown and used for download/print follows renames immediately
  const filename = current?.filename || 'Untitled File';
  const mime = current ? normalizeMimeType(current.mimeType, current.filename) : '';
  const currentFilename = current?.filename;
  const loadedFile = useMemo(
    () => (ready ? { ...ready.attachment, filename: currentFilename } : null),
    [ready, currentFilename]
  );

  const handleDownload = useCallback(() => {
    if (loadedFile) downloadAttachment(loadedFile);
  }, [loadedFile]);

  const handlePrint = useCallback(() => {
    if (!ready || !loadedFile || !canPrint(ready.mime)) return;
    printAttachment({
      filename: loadedFile.filename || 'attachment',
      mimeType: ready.mime,
      content: loadedFile.content,
      blobUrl: ready.url,
      renderedHtml: ready.html,
    });
  }, [ready, loadedFile]);

  // Capture phase, so Esc / arrows don't also reach the composer or the mail list
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      )
        return;
      // A dialog opened on top (e.g. rename) handles its own keys
      if (
        target &&
        !panelRef.current?.contains(target) &&
        target.closest('[role="dialog"], [role="alertdialog"]')
      )
        return;
      let handled = true;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight' && count > 1) navigate(1);
      else if (e.key === 'ArrowLeft' && count > 1) navigate(-1);
      else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'p' &&
        ready &&
        canPrint(ready.mime)
      ) {
        e.preventDefault();
        handlePrint();
      } else handled = false;
      if (handled) e.stopPropagation();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, count, close, navigate, handlePrint, ready]);

  const anchor = portal ? <span ref={anchorRef} hidden /> : null;
  if (!isOpen || index === null || !current) return anchor;

  const renderContent = () => {
    if (!ready) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] z-20">
          <div className="flex flex-col items-center gap-3">
            <FaSpinner className="animate-spin text-3xl text-[var(--accent-9)]" />
            <span className="text-sm text-[var(--gray-11)]">{loadingLabel(mime)}</span>
          </div>
        </div>
      );
    }

    if (!canPreview(ready.mime)) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-24 h-24 rounded-full bg-[var(--gray-4)] flex items-center justify-center mb-6">
            {getAttachmentIcon(ready.mime, 'text-5xl')}
          </div>
          <h3 className="text-xl font-semibold text-[var(--gray-12)] mb-2">Preview Unavailable</h3>
          <p className="text-[var(--gray-11)] max-w-md mb-8 leading-relaxed">
            <strong>{getFileTypeLabel(ready.mime)}</strong> files cannot be previewed directly in
            the browser. Download the file to open it in the appropriate application.
          </p>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg font-medium shadow-md transition-all hover:scale-105"
          >
            <FaDownload /> Download File
          </button>
        </div>
      );
    }

    if (ready.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <FaExclamationTriangle className="text-4xl text-[var(--yellow-9)]" />
          <p className="text-sm text-[var(--gray-11)]">{ready.error}</p>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg text-sm font-medium"
          >
            <FaDownload /> Download to View
          </button>
        </div>
      );
    }

    // EML / Office files rendered as HTML
    if (isHtmlRendered(ready.mime)) {
      return (
        <iframe
          srcDoc={ready.html}
          className="w-full h-full border-none bg-white"
          title={filename}
          sandbox="allow-scripts"
        />
      );
    }

    if (ready.mime.startsWith('image/') && ready.url) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
          <img
            src={ready.url}
            alt={filename}
            className="max-w-full max-h-full object-contain shadow-md rounded"
          />
        </div>
      );
    }

    if (ready.mime.startsWith('video/') && ready.url) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <video controls className="max-w-full max-h-full rounded shadow-lg" src={ready.url}>
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (ready.mime.startsWith('audio/') && ready.url) {
      return (
        <div className="flex items-center justify-center h-full bg-[var(--gray-2)]">
          <div className="bg-[var(--color-surface)] p-8 rounded-xl shadow-lg text-center min-w-[300px]">
            <div className="flex justify-center mb-6">
              <FaFileAudio className="text-6xl text-[var(--purple-9)]" />
            </div>
            <h3 className="mb-4 text-lg font-medium">{filename}</h3>
            <audio controls className="w-full" src={ready.url} />
          </div>
        </div>
      );
    }

    // Browsers without a built-in PDF viewer (e.g. Chrome on Android) show nothing
    // in the frame; offer to open the file in the device's PDF app instead
    if (ready.mime === 'application/pdf' && ready.url && navigator.pdfViewerEnabled === false) {
      const url = ready.url;
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--gray-4)] flex items-center justify-center mb-5">
            {getAttachmentIcon(ready.mime, 'text-4xl')}
          </div>
          <h3 className="text-lg font-semibold text-[var(--gray-12)] mb-2">
            Open this PDF to view it
          </h3>
          <p className="text-sm text-[var(--gray-11)] max-w-sm mb-6 leading-relaxed">
            This browser can't show PDFs inside the page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
            <button
              onClick={() => window.open(url, '_blank', 'noopener')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg font-medium"
            >
              <FaExternalLinkAlt size={13} /> Open PDF
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-[var(--gray-4)] hover:bg-[var(--gray-5)] text-[var(--gray-12)] rounded-lg font-medium"
            >
              <FaDownload size={13} /> Download
            </button>
          </div>
        </div>
      );
    }

    if (ready.mime === 'application/pdf' && ready.url) {
      return (
        <iframe
          src={`${ready.url}#toolbar=0`}
          className="w-full h-full border-none bg-white"
          title={filename}
        />
      );
    }

    if (ready.mime.startsWith('text/html')) {
      return (
        <iframe
          srcDoc={decodeBase64Text(ready.attachment.content)}
          className="w-full h-full border-none bg-white"
          title={filename}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        />
      );
    }

    // Other text (plain, csv, xml…): no scripts
    if (ready.mime.startsWith('text/') && ready.url) {
      return (
        <iframe
          src={ready.url}
          className="w-full h-full border-none bg-white"
          title={filename}
          sandbox=""
        />
      );
    }

    return null;
  };

  const headerButton =
    'p-2.5 sm:p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none';

  const modal = (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200 ${
        portal ? 'z-[99999]' : 'z-50'
      }`}
      // Keep clicks from reaching whatever the preview was opened from
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) close();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${filename}`}
        tabIndex={-1}
        className={`bg-[var(--color-panel)] shadow-2xl flex flex-col overflow-hidden outline-none transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 w-full h-full rounded-none'
            : // Phones: the whole screen; larger screens: a centered window
              'w-full h-full sm:max-w-6xl sm:h-[85vh] sm:rounded-xl sm:border sm:border-[var(--gray-6)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-[var(--gray-6)] bg-[var(--color-surface)] z-10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">{getAttachmentIcon(mime, 'text-xl')}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <h3
                  className="text-sm font-semibold text-[var(--gray-12)] truncate"
                  title={filename}
                >
                  {filename}
                </h3>
                {onRename && (
                  <button
                    onClick={() => setIsRenaming(true)}
                    className="flex-shrink-0 p-2 sm:p-1.5 text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
                    title="Rename"
                    aria-label="Rename file"
                  >
                    <FaPen size={11} />
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--gray-11)] truncate">
                {getFileTypeLabel(mime)} • {attachmentSize(ready?.attachment ?? current)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
            {ready && canPreview(ready.mime) && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`${headerButton} hidden sm:inline-flex`}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}
              </button>
            )}
            {canPrint(mime) && (
              <button
                onClick={handlePrint}
                disabled={!ready}
                className={`${headerButton} hidden sm:inline-flex`}
                title="Print Attachment (Ctrl+P / Cmd+P)"
                aria-label="Print Attachment"
              >
                <FaPrint size={14} />
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={!ready}
              className={headerButton}
              title="Download Attachment"
              aria-label="Download Attachment"
            >
              <FaDownload size={14} />
            </button>
            <div className="w-px h-4 bg-[var(--gray-6)] mx-1" />
            <button
              onClick={close}
              className="p-2.5 sm:p-2 text-[var(--gray-11)] hover:text-[var(--red-9)] hover:bg-[var(--red-3)] rounded-md transition-colors"
              title="Close Preview (Esc)"
              aria-label="Close Preview"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-[var(--gray-2)] overflow-hidden flex flex-col">
          {renderContent()}
        </div>

        {/* Footer / Navigation */}
        {count > 1 && (
          <div className="flex items-center justify-between px-2 sm:px-4 pt-2 sm:pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-[var(--gray-6)] bg-[var(--color-surface)] z-10">
            <button
              onClick={() => navigate(-1)}
              aria-label="Previous attachment"
              className="flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
            >
              <FaChevronLeft size={12} /> <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-xs font-mono text-[var(--gray-10)]">
              {index + 1} / {count}
            </span>
            <button
              onClick={() => navigate(1)}
              aria-label="Next attachment"
              className="flex items-center gap-2 px-3 py-2.5 sm:py-1.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
            >
              <span className="hidden sm:inline">Next</span> <FaChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {onRename && (
        <RenameFileDialog
          filename={isRenaming ? current.filename || '' : null}
          onSave={(name) => {
            onRename(index, name);
            setIsRenaming(false);
          }}
          onClose={() => setIsRenaming(false)}
        />
      )}
    </div>
  );

  if (!portal) return modal;
  const themeRoot = anchorRef.current?.closest<HTMLElement>('.radix-themes') ?? document.body;
  return (
    <>
      {anchor}
      {createPortal(modal, themeRoot)}
    </>
  );
};

export default AttachmentPreviewModal;
