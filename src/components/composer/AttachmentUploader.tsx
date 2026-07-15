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

import { useDropzone } from 'react-dropzone';
import { useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FaPaperclip,
  FaX,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileZipper,
  FaFileCode,
  FaFileAudio,
  FaFileVideo,
  FaFile,
  FaEye,
  FaImage,
} from 'react-icons/fa6';
import { useToast } from '../ui/ToastComponent';
import { FaExclamationTriangle } from 'react-icons/fa';
import type { EmailAttachment } from '../../state/composer';

interface AttachmentUploaderProps {
  attachments: EmailAttachment[];
  onAttachmentsChange: (attachments: EmailAttachment[]) => void;
  height?: string;
  maxHeight?: string;
  disableDrop?: boolean;
}

export const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const MAX_INDIVIDUAL_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024;

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <FaImage className="w-5 h-5 text-[var(--blue-9)]" />;
  if (mimeType.includes('pdf')) return <FaFilePdf className="w-5 h-5 text-[var(--red-9)]" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FaFileWord className="w-5 h-5 text-[var(--blue-9)]" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return <FaFileExcel className="w-5 h-5 text-[var(--green-9)]" />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return <FaFilePowerpoint className="w-5 h-5 text-[var(--orange-9)]" />;
  if (mimeType.includes('zip') || mimeType.includes('compressed'))
    return <FaFileZipper className="w-5 h-5 text-[var(--gray-11)]" />;
  if (mimeType.includes('audio')) return <FaFileAudio className="w-5 h-5 text-[var(--purple-9)]" />;
  if (mimeType.includes('video')) return <FaFileVideo className="w-5 h-5 text-[var(--pink-9)]" />;
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('html') ||
    mimeType.includes('css')
  )
    return <FaFileCode className="w-5 h-5 text-[var(--cyan-9)]" />;
  return <FaFile className="w-5 h-5 text-[var(--gray-11)]" />;
};

const isImageFile = (mimeType: string) => {
  return mimeType.startsWith('image/');
};

const AttachmentUploader = ({
  attachments = [],
  onAttachmentsChange,
  height,
  maxHeight,
  disableDrop = false,
}: AttachmentUploaderProps) => {
  const [rejectedFiles, setRejectedFiles] = useState<File[]>([]);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [totalSizeWarning, setTotalSizeWarning] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const toast = useToast();

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewImage]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[], event?: any) => {
      // If we are in a parent dropzone (disableDrop === true) AND this was a drop event,
      // let the parent handle it to avoid duplicates.
      // Picked files (via file explorer) use a change event, not a drop event.
      if (disableDrop && event?.type === 'drop') return;
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
            ? `File "${oversizedFiles[0].name}" (${formatFileSize(oversizedFiles[0].size)}) exceeds the 20MB limit`
            : `${oversizedFiles.length} files exceed the 20MB limit: ${fileList}`;
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
    [attachments, onAttachmentsChange, toast, totalAttachmentSize, disableDrop]
  );

  const removeAttachment = (index: number) => {
    const updated = [...attachments];
    const removedFile = updated[index];
    updated.splice(index, 1);
    onAttachmentsChange(updated);
    setTotalSizeWarning(null);
    toast.error({
      description: `Removed "${removedFile.filename}"`,
      duration: 3000,
    });
  };

  const handlePreviewClick = (attachment: EmailAttachment) => {
    if (isImageFile(attachment.mime_type ?? '')) {
      setPreviewImage(`data:${attachment.mime_type};base64,${attachment.data}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: MAX_INDIVIDUAL_FILE_SIZE,
    onDropRejected: (fileRejections: any[]) => {
      const oversizedRejects = fileRejections.filter((rejection: any) =>
        rejection.errors.some((error: any) => error.code === 'file-too-large')
      );

      if (oversizedRejects.length > 0) {
        const fileList = oversizedRejects
          .map(
            (rejection: any) => `${rejection.file.name} (${formatFileSize(rejection.file.size)})`
          )
          .join(', ');
        const warningMsg =
          oversizedRejects.length === 1
            ? `File "${oversizedRejects[0].file.name}" (${formatFileSize(oversizedRejects[0].file.size)}) exceeds the 20MB limit`
            : `${oversizedRejects.length} files exceed the 20MB limit: ${fileList}`;
        setSizeWarning(warningMsg);
        toast.error({
          description: warningMsg,
          duration: 5000,
        });
      }
    },
  });

  return (
    <>
      {/* Main Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative min-h-[120px] h-full p-3 rounded-lg cursor-pointer
          border-2 border-dashed transition-all overflow-auto
          ${maxHeight ? `max-h-[${maxHeight}]` : 'max-h-[300px]'}
          ${
            isDragActive
              ? 'border-[var(--accent-8)] bg-[var(--accent-2)]'
              : 'border-[var(--gray-7)] bg-[var(--gray-1)] hover:border-[var(--gray-8)] hover:bg-[var(--gray-2)]'
          }
        `}
        style={{ maxHeight: maxHeight || '300px' }}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-2 h-full">
          {/* Icon */}
          <div className="text-[var(--gray-11)]">
            <FaPaperclip size={24} />
          </div>

          {/* Main Text */}
          <p className="text-sm font-medium text-[var(--gray-12)] text-center">
            {isDragActive ? 'Drop files here…' : 'Click or drag files to attach'}
          </p>

          {/* Subtitle */}
          <p className="text-xs text-[var(--gray-10)] text-center">
            Maximum total size: {formatFileSize(MAX_TOTAL_SIZE)}
          </p>

          {/* Individual File Warning */}
          {sizeWarning && (
            <div className="w-full mt-2 p-3 bg-[var(--red-3)] border border-[var(--red-5)] rounded-lg">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-[var(--red-9)] flex-shrink-0" size={16} />
                <p className="text-xs text-[var(--red-11)]">{sizeWarning}</p>
              </div>
            </div>
          )}

          {/* Total Size Warning */}
          {totalSizeWarning && (
            <div className="w-full mt-2 p-3 bg-[var(--red-3)] border border-[var(--red-5)] rounded-lg">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="text-[var(--red-9)] flex-shrink-0" size={16} />
                <p className="text-xs text-[var(--red-11)]">{totalSizeWarning}</p>
              </div>
            </div>
          )}

          {/* Total Size Display */}
          {attachments.length > 0 && (
            <div className="mt-1">
              <p
                className={`text-xs font-medium ${
                  isTotalSizeExceeded
                    ? 'text-[var(--red-11)]'
                    : isTotalSizeWarning
                      ? 'text-[var(--yellow-11)]'
                      : 'text-[var(--gray-11)]'
                }`}
              >
                Total: {formatFileSize(totalAttachmentSize)} / {formatFileSize(MAX_TOTAL_SIZE)}
                {isTotalSizeExceeded && ' (Limit Exceeded!)'}
                {isTotalSizeWarning && !isTotalSizeExceeded && ' (Approaching Limit)'}
              </p>
            </div>
          )}

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="w-full mt-3">
              <p className="text-xs font-semibold text-[var(--gray-12)] mb-2">
                Attachments ({attachments.length}):
              </p>

              {/* Scrollable List */}
              <div className="max-h-[175px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {attachments.map((file, idx) => {
                  const isImage = isImageFile(file.mime_type ?? '');
                  const imagePreview = isImage
                    ? `data:${file.mime_type};base64,${file.data}`
                    : null;

                  return (
                    <div
                      key={idx}
                      title={file.filename}
                      className="flex items-center gap-3 p-2 bg-[var(--gray-2)] rounded-lg hover:bg-[var(--gray-3)] transition-colors group"
                    >
                      {/* Thumbnail/Icon */}
                      <div className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden bg-[var(--gray-4)] flex items-center justify-center border border-[var(--gray-6)]">
                        {isImage && imagePreview ? (
                          <img
                            src={imagePreview}
                            alt={file.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getFileIcon(file.mime_type ?? '')
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--gray-12)] truncate">
                          {file.filename}
                        </p>
                        <p className="text-xs text-[var(--gray-10)] mt-0.5">
                          {formatFileSize(file.size || 0)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isImage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewClick(file);
                            }}
                            className="p-1.5 rounded hover:bg-[var(--gray-4)] text-[var(--gray-11)] hover:text-[var(--gray-12)] transition-colors"
                            title="Preview image"
                          >
                            <FaEye size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(idx);
                          }}
                          className="p-1.5 rounded hover:bg-[var(--red-3)] text-[var(--gray-11)] hover:text-[var(--red-11)] transition-colors"
                          title="Remove attachment"
                        >
                          <FaX size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal via Portal */}
      {previewImage &&
        createPortal(
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-zoom-out"
          >
            {/* Close Button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 z-[100000] border border-white/20 shadow-2xl"
              title="Close (Esc)"
            >
              <FaX size={20} />
            </button>

            {/* Image Container */}
            <div className="relative max-w-full max-h-full flex items-center justify-center pointer-events-none">
              <img
                src={previewImage}
                alt="Preview"
                onClick={(e) => e.stopPropagation()}
                className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-scale-in pointer-events-auto cursor-default"
              />

              {/* Optional: Add a subtle caption if filename was available, but here we just have data URL */}
            </div>
          </div>,
          document.body
        )}

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
};

export default AttachmentUploader;
