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

import { useState, useEffect, useCallback } from 'react';
import {
  FaPaperclip,
  FaDownload,
  FaCopy,
  FaShare,
  FaSpinner,
  FaPrint,
} from 'react-icons/fa';
import { useToast } from '../../../../../hooks/useToast';
import { printAttachment } from '../../../../../utils/emailPrint';
import { attachmentErrorMessage } from '../../../../../hooks/useEmailView';
import AttachmentPreviewModal from '../../../../common/attachmentPreview/AttachmentPreviewModal';
import { getAttachmentIcon } from '../../../../common/attachmentPreview/fileIcon';
import {
  attachmentSize,
  base64ToBlob,
  canPreview,
  canPrint,
  downloadAttachment,
  getFileTypeLabel,
  isHtmlRendered,
  normalizeMimeType,
  renderAttachmentHtml,
  type LoadedAttachment,
  type PreviewAttachment,
} from '../../../../common/attachmentPreview/previewUtils';

/**
 * Loose shape covering postal-mime attachments, the composer's own attachment
 * payloads and /email/view attachments. The latter arrive without `content`;
 * it is downloaded through `loadContent()` when the user acts on the file.
 */
export type EmailAttachment = PreviewAttachment;

interface EmailAttachmentsProps {
  attachments: EmailAttachment[];
  emailHtml?: string;
}

const EmailAttachments = ({ attachments, emailHtml = '' }: EmailAttachmentsProps) => {
  const displayAttachments = attachments.filter((att) => {
    if (!att.contentId) return true;
    const cidReference = `cid:${att.contentId.replace(/^<|>$/g, '')}`;
    return !emailHtml.includes(cidReference);
  });

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [canShare, setCanShare] = useState(false);
  // Content downloaded on demand, by display index, plus the index being downloaded
  const [loadedContent, setLoadedContent] = useState<Map<number, string>>(new Map());
  const [fetchingIndex, setFetchingIndex] = useState<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function' && typeof navigator.canShare === 'function');
  }, []);

  // ─── On-demand content ─────────────────────────────────────────────────────

  const withLoadedContent = useCallback(
    (attachment: EmailAttachment, index: number): EmailAttachment =>
      attachment.content || !loadedContent.has(index)
        ? attachment
        : { ...attachment, content: loadedContent.get(index) },
    [loadedContent]
  );

  /** Returns the attachment with its content, downloading it first if needed. */
  const resolveAttachment = useCallback(
    async (attachment: EmailAttachment, index: number): Promise<LoadedAttachment | null> => {
      const current = withLoadedContent(attachment, index);
      if (current.content) return current as LoadedAttachment;
      if (!current.loadContent) return null;

      setFetchingIndex(index);
      try {
        const content = await current.loadContent();
        setLoadedContent((prev) => new Map(prev).set(index, content));
        return { ...current, content };
      } catch (error) {
        toast.error({ description: attachmentErrorMessage(error) });
        return null;
      } finally {
        setFetchingIndex(null);
      }
    },
    [withLoadedContent, toast]
  );

  // ─── Download / Copy / Share / Print ───────────────────────────────────────

  const base64ToFile = useCallback((attachment: LoadedAttachment): File | null => {
    const mime = normalizeMimeType(attachment.mimeType, attachment.filename);
    const blob = base64ToBlob(attachment.content, mime);
    if (!blob) return null;
    return new File([blob], attachment.filename || `file.${mime.split('/')[1]}`, { type: mime });
  }, []);

  const handleDownload = useCallback(
    async (target: EmailAttachment, index: number) => {
      const attachment = await resolveAttachment(target, index);
      if (attachment) downloadAttachment(attachment);
    },
    [resolveAttachment]
  );

  const handleCopyToClipboard = useCallback(
    async (target: EmailAttachment, index: number) => {
      const attachment = await resolveAttachment(target, index);
      if (!attachment) return;
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
    [base64ToFile, resolveAttachment, toast]
  );

  const handleShare = useCallback(
    async (target: EmailAttachment, index: number) => {
      const attachment = await resolveAttachment(target, index);
      if (!attachment) return;
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
      downloadAttachment(attachment);
      toast.success({ description: `📁 Downloaded "${attachment.filename}"` });
    },
    [base64ToFile, canShare, resolveAttachment, toast]
  );

  const handlePrint = useCallback(
    async (target: EmailAttachment, index: number) => {
      const mime = normalizeMimeType(target.mimeType, target.filename);
      if (!canPrint(mime)) {
        toast.error({
          description: `Printing is not supported for ${getFileTypeLabel(mime)} files`,
        });
        return;
      }

      const attachment = await resolveAttachment(target, index);
      if (!attachment) return;

      let renderedHtml: string | undefined;
      if (isHtmlRendered(mime)) {
        try {
          renderedHtml = await renderAttachmentHtml(attachment);
        } catch {
          toast.error({ description: 'Failed to prepare the file for printing' });
          return;
        }
      }

      printAttachment({
        filename: attachment.filename || 'attachment',
        mimeType: mime,
        content: attachment.content,
        renderedHtml,
      });
    },
    [resolveAttachment, toast]
  );

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
            const fileSize = attachmentSize(attachment);
            const isFetching = fetchingIndex === index;
            const previewable = canPreview(mimeType);

            return (
              <div
                key={index}
                onClick={() => setPreviewIndex(index)}
                className="group bg-[var(--color-surface)] border border-[var(--gray-6)] rounded-lg p-4 hover:border-[var(--gray-7)] hover:shadow-sm transition-all duration-200 cursor-pointer"
                title={previewable ? 'Click to preview' : 'Click to download'}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {isFetching ? (
                        <FaSpinner
                          className="animate-spin text-xl text-[var(--accent-9)]"
                          aria-label="Downloading"
                        />
                      ) : (
                        getAttachmentIcon(mimeType, 'text-xl')
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4
                        className="text-sm font-medium text-[var(--gray-12)] truncate"
                        title={`${attachment.filename || 'Untitled File'}\n${fileTypeLabel} • ${fileSize}`}
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
                            handleCopyToClipboard(attachment, index);
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
                            handleShare(attachment, index);
                          }}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-all duration-200"
                          title="Share"
                        >
                          <FaShare size={12} />
                        </button>
                      )}
                      {canPrint(mimeType) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(attachment, index);
                          }}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-all duration-200"
                          title="Print"
                          aria-label="Print attachment"
                        >
                          <FaPrint size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(attachment, index);
                        }}
                        disabled={isFetching}
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

      <AttachmentPreviewModal
        attachments={displayAttachments}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        resolveAttachment={resolveAttachment}
      />
    </>
  );
};

export default EmailAttachments;
