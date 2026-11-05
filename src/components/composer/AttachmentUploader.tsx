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

import { useDropzone, type FileRejection } from 'react-dropzone';
import {
  forwardRef,
  useCallback,
  useState,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { FaX, FaPen } from 'react-icons/fa6';
import { useToast } from '../../hooks/useToast';
import AttachmentPreviewModal from '../common/attachmentPreview/AttachmentPreviewModal';
import RenameFileDialog from '../common/attachmentPreview/RenameFileDialog';
import { getAttachmentIcon } from '../common/attachmentPreview/fileIcon';
import {
  getFileTypeLabel,
  normalizeMimeType,
  type PreviewAttachment,
} from '../common/attachmentPreview/previewUtils';
import { FaExclamationTriangle } from 'react-icons/fa';
import type { EmailAttachment } from '../../state/composer';
import {
  toBase64,
  MAX_INDIVIDUAL_FILE_SIZE,
  MAX_TOTAL_SIZE,
  formatFileSize,
} from './attachmentUtils';

interface AttachmentUploaderProps {
  attachments: EmailAttachment[];
  onAttachmentsChange: (attachments: EmailAttachment[]) => void;
}

export interface AttachmentUploaderHandle {
  /** Opens the file picker (the Attach button lives in the composer's footer) */
  openPicker: () => void;
}

const isImageFile = (mimeType: string) => {
  return mimeType.startsWith('image/');
};

/**
 * The attached files as a compact strip of chips under the text: takes no room
 * until there is something to show. Dropping files is handled by the composer
 * around it, picking them by `openPicker`.
 */
const AttachmentUploader = forwardRef<AttachmentUploaderHandle, AttachmentUploaderProps>(
  ({ attachments = [], onAttachmentsChange }, ref) => {
  const [, setRejectedFiles] = useState<File[]>([]);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [totalSizeWarning, setTotalSizeWarning] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const toast = useToast();

  // Same shape the email viewer previews; forwarded files carry `content`, uploads `data`
  const previewAttachments = useMemo<PreviewAttachment[]>(
    () =>
      attachments.map((file) => ({
        filename: file.filename,
        mimeType: file.mime_type || '',
        content: file.data ?? file.content,
        size: file.size,
      })),
    [attachments]
  );

  const totalAttachmentSize = attachments.reduce(
    (total, attachment) => total + (attachment.size || 0),
    0
  );

  const isTotalSizeWarning = totalAttachmentSize > MAX_TOTAL_SIZE * 0.8;
  const isTotalSizeExceeded = totalAttachmentSize > MAX_TOTAL_SIZE;

  useEffect(() => {
    if (sizeWarning || totalSizeWarning) {
      const timer = setTimeout(() => {
        setSizeWarning(null);
        setTotalSizeWarning(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sizeWarning, totalSizeWarning]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setRejectedFiles([]);
      setSizeWarning(null);
      setTotalSizeWarning(null);

      const currentTotalSize = totalAttachmentSize;
      const newFilesTotalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);

      if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
        const warningMsg = `Cannot add files. Total attachments size would exceed ${formatFileSize(MAX_TOTAL_SIZE)}. Current total: ${formatFileSize(currentTotalSize)}`;
        setTotalSizeWarning(warningMsg);
        toast.error({
          description: warningMsg,
          duration: 5000,
        });
        return;
      }

      const oversizedFiles = acceptedFiles.filter((file) => file.size > MAX_INDIVIDUAL_FILE_SIZE);
      const nonOversized = acceptedFiles.filter((file) => file.size <= MAX_INDIVIDUAL_FILE_SIZE);
      const emptyFiles = nonOversized.filter((file) => file.size === 0);
      const validFiles = nonOversized.filter((file) => file.size > 0);

      if (oversizedFiles.length > 0) {
        setRejectedFiles(oversizedFiles);
        const fileList = oversizedFiles
          .map((file) => `${file.name} (${formatFileSize(file.size)})`)
          .join(', ');
        const warningMsg =
          oversizedFiles.length === 1
            ? `File "${oversizedFiles[0].name}" (${formatFileSize(oversizedFiles[0].size)}) exceeds the ${formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} limit`
            : `${oversizedFiles.length} files exceed the ${formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} limit: ${fileList}`;
        setSizeWarning(warningMsg);
        toast.error({
          description: warningMsg,
          duration: 5000,
        });
      }

      if (emptyFiles.length > 0) {
        const fileList = emptyFiles.map((f) => `"${f.name}"`).join(', ');
        const warningMsg =
          emptyFiles.length === 1
            ? `File ${fileList} is empty and cannot be attached`
            : `${emptyFiles.length} files are empty and cannot be attached: ${fileList}`;
        toast.error({ description: warningMsg, duration: 5000 });
      }

      if (validFiles.length === 0) return;

      try {
        const base64Attachments: EmailAttachment[] = await Promise.all(
          validFiles.map(async (file) => ({
            filename: file.name,
            mime_type: file.type,
            data: await toBase64(file),
            size: file.size,
          }))
        );

        onAttachmentsChange([...attachments, ...base64Attachments]);

        if (validFiles.length > 0) {
          toast.success({
            description: `Added ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`,
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error processing files:', error);
        toast.error({
          description: 'Failed to process files. Please try again.',
        });
      }
    },
    [attachments, onAttachmentsChange, toast, totalAttachmentSize]
  );

  const removeAttachment = (index: number) => {
    const updated = [...attachments];
    const removedFile = updated[index];
    updated.splice(index, 1);
    onAttachmentsChange(updated);
    setTotalSizeWarning(null);
    setPreviewIndex(null);
    setRenamingIndex((current) =>
      current === null || current === index ? null : current > index ? current - 1 : current
    );
    toast.error({
      description: `Removed "${removedFile.filename}"`,
      duration: 3000,
    });
  };

  const renameAttachment = (index: number, filename: string) => {
    onAttachmentsChange(attachments.map((file, i) => (i === index ? { ...file, filename } : file)));
    setRenamingIndex(null);
    toast.success({ description: `Renamed to "${filename}"`, duration: 3000 });
  };

  const { getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noDrag: true,
    noKeyboard: true,
    multiple: true,
    maxSize: MAX_INDIVIDUAL_FILE_SIZE,
    onDropRejected: (fileRejections: FileRejection[]) => {
      const oversizedRejects = fileRejections.filter((rejection) =>
        rejection.errors.some((error) => error.code === 'file-too-large')
      );

      if (oversizedRejects.length > 0) {
        const fileList = oversizedRejects
          .map((rejection) => `${rejection.file.name} (${formatFileSize(rejection.file.size)})`)
          .join(', ');
        const warningMsg =
          oversizedRejects.length === 1
            ? `File "${oversizedRejects[0].file.name}" (${formatFileSize(oversizedRejects[0].file.size)}) exceeds the ${formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} limit`
            : `${oversizedRejects.length} files exceed the ${formatFileSize(MAX_INDIVIDUAL_FILE_SIZE)} limit: ${fileList}`;
        setSizeWarning(warningMsg);
        toast.error({
          description: warningMsg,
          duration: 5000,
        });
      }
    },
  });

  useImperativeHandle(ref, () => ({ openPicker: open }), [open]);

  const warning = sizeWarning || totalSizeWarning;

  return (
    <>
      <input {...getInputProps()} />

      {(attachments.length > 0 || warning) && (
        <div className="shrink-0 border-t border-[var(--gray-4)] px-3 py-2">
          {warning && (
            <div className="flex items-center gap-2 mb-1.5 text-xs text-[var(--red-11)]">
              <FaExclamationTriangle className="flex-shrink-0" size={12} />
              <span>{warning}</span>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 max-h-[76px] overflow-y-auto custom-scrollbar">
              {attachments.map((file, idx) => {
                const mimeType = normalizeMimeType(file.mime_type ?? '', file.filename);
                const fileData = file.data ?? file.content;
                const imagePreview =
                  isImageFile(mimeType) && fileData ? `data:${mimeType};base64,${fileData}` : null;

                return (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    aria-label={`Preview ${file.filename}`}
                    title={`${file.filename}\n${getFileTypeLabel(mimeType)} • ${formatFileSize(file.size || 0)}\nClick to preview`}
                    onClick={() => setPreviewIndex(idx)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPreviewIndex(idx);
                      } else if (e.key === 'Delete') {
                        e.preventDefault();
                        removeAttachment(idx);
                      }
                    }}
                    className="group flex items-center gap-1.5 h-8 max-w-[260px] pl-1 pr-0.5 rounded-md border border-[var(--gray-5)] bg-[var(--gray-2)] hover:bg-[var(--gray-3)] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded overflow-hidden flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getAttachmentIcon(mimeType, 'text-sm')
                      )}
                    </div>
                    <span className="min-w-0 truncate text-xs font-medium text-[var(--gray-12)]">
                      {file.filename}
                    </span>
                    {/* The pencil takes the place of the size on hover, over it rather than
                        beside it, so the chip keeps its width and the close button stays put.
                        Touch screens have no hover: there it's simply always next to the size. */}
                    <span className="relative flex-shrink-0 inline-flex items-center">
                      <span className="text-[11px] text-[var(--gray-10)] [@media(hover:hover)]:group-hover:invisible [@media(hover:hover)]:group-focus-within:invisible">
                        {formatFileSize(file.size || 0)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingIndex(idx);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto [@media(hover:none)]:static [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto p-1 [@media(pointer:coarse)]:p-2 rounded hover:bg-[var(--gray-4)] text-[var(--gray-11)] hover:text-[var(--gray-12)] transition-colors"
                        title="Rename"
                        aria-label={`Rename ${file.filename}`}
                      >
                        <FaPen size={10} />
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(idx);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="p-1 [@media(pointer:coarse)]:p-2 rounded hover:bg-[var(--red-3)] text-[var(--gray-11)] hover:text-[var(--red-11)] transition-colors"
                      title="Remove attachment"
                      aria-label={`Remove ${file.filename}`}
                    >
                      <FaX size={10} />
                    </button>
                  </div>
                );
              })}

              <span
                className={`px-1 text-[11px] whitespace-nowrap ${
                  isTotalSizeExceeded
                    ? 'font-medium text-[var(--red-11)]'
                    : isTotalSizeWarning
                      ? 'font-medium text-[var(--yellow-11)]'
                      : 'text-[var(--gray-10)]'
                }`}
              >
                {formatFileSize(totalAttachmentSize)} of {formatFileSize(MAX_TOTAL_SIZE)}
                {isTotalSizeExceeded && ' (Limit Exceeded!)'}
                {isTotalSizeWarning && !isTotalSizeExceeded && ' (Approaching Limit)'}
              </span>
            </div>
          )}
        </div>
      )}

      <RenameFileDialog
        filename={renamingIndex !== null ? (attachments[renamingIndex]?.filename ?? null) : null}
        onSave={(name) => renamingIndex !== null && renameAttachment(renamingIndex, name)}
        onClose={() => setRenamingIndex(null)}
      />

      {/* Same preview as received attachments, above the composer */}
      <AttachmentPreviewModal
        attachments={previewAttachments}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onRename={renameAttachment}
        portal
      />

      <style>{`
        @media (max-width: 1280px) {
          .attachment-uploader {
            min-height: 100px !important;
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--gray-3);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--gray-7);
          border-radius: 3px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--gray-8);
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
  }
);

AttachmentUploader.displayName = 'AttachmentUploader';

export default AttachmentUploader;
