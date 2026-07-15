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

// components/contacts/ExportModal.tsx
import { useState } from 'react';
import { FaFileCsv, FaFileExcel, FaAddressCard, FaDownload, FaCheckCircle } from 'react-icons/fa';
import DialogWrapper from '../common/Dialoge';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (
    format: 'csv' | 'xlsx' | 'vcard',
    onProgress: (current: number, total: number) => void,
    shouldCancel: () => boolean
  ) => Promise<void>;
}

export function ExportModal({ open, onOpenChange, onExport }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx' | 'vcard'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [shouldCancel, setShouldCancel] = useState(false);

  const formats = [
    {
      key: 'csv' as const,
      label: 'CSV',
      description: 'Comma-separated values for spreadsheets',
      icon: FaFileCsv,
      color: 'green',
    },
    {
      key: 'xlsx' as const,
      label: 'Excel',
      description: 'Microsoft Excel format (.xlsx)',
      icon: FaFileExcel,
      color: 'green',
    },
    {
      key: 'vcard' as const,
      label: 'vCard',
      description: 'Contact cards for mobile devices (.vcf)',
      icon: FaAddressCard,
      color: 'blue',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setExportComplete(false);
    setShouldCancel(false);

    try {
      await onExport(
        selectedFormat,
        (current, total) => {
          setCurrentPage(current);
          setTotalPages(total);
          setProgress(Math.round((current / total) * 100));
        },
        () => shouldCancel
      );

      if (!shouldCancel) {
        setExportComplete(true);
        setTimeout(() => {
          onOpenChange(false);
          resetState();
        }, 1500);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    setShouldCancel(true);
  };

  const resetState = () => {
    setProgress(0);
    setCurrentPage(0);
    setTotalPages(0);
    setExportComplete(false);
    setShouldCancel(false);
  };

  const handleClose = () => {
    if (!isExporting) {
      onOpenChange(false);
      resetState();
    }
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={handleClose}
      title="Export Contacts"
      description="Choose a format to export all your contacts"
      size="3"
      width="500px"
      showCloseButton={!isExporting}
    >
      {!isExporting && !exportComplete ? (
        <>
          {/* Format Selection */}
          <div className="space-y-3 mb-6">
            {formats.map((format) => (
              <button
                key={format.key}
                onClick={() => setSelectedFormat(format.key)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedFormat === format.key
                    ? 'border-[var(--accent-9)] bg-[var(--accent-2)]'
                    : 'border-[var(--gray-6)] bg-[var(--gray-2)] hover:border-[var(--gray-7)] hover:bg-[var(--gray-3)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      format.color === 'green'
                        ? 'bg-[var(--green-3)] text-[var(--green-11)]'
                        : 'bg-[var(--blue-3)] text-[var(--blue-11)]'
                    }`}
                  >
                    <format.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[var(--gray-12)]">{format.label}</div>
                    <div className="text-sm text-[var(--gray-11)] mt-0.5">{format.description}</div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedFormat === format.key
                        ? 'border-[var(--accent-9)] bg-[var(--accent-9)]'
                        : 'border-[var(--gray-7)]'
                    }`}
                  >
                    {selectedFormat === format.key && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-[var(--gray-3)] text-[var(--gray-12)] rounded-lg hover:bg-[var(--gray-4)] transition-colors font-medium border border-[var(--gray-6)]"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-4 py-2.5 bg-[var(--accent-9)] text-white rounded-lg hover:bg-[var(--accent-10)] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <FaDownload className="w-4 h-4" />
              Export
            </button>
          </div>
        </>
      ) : exportComplete ? (
        /* Success State */
        <div className="py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--green-3)] text-[var(--green-11)] flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--gray-12)] mb-2">Export Complete!</h3>
          <p className="text-sm text-[var(--gray-11)]">
            Your contacts have been exported successfully
          </p>
        </div>
      ) : (
        /* Exporting State */
        <div className="py-6">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-[var(--gray-11)]">Exporting contacts...</span>
              <span className="font-semibold text-[var(--gray-12)]">{progress}%</span>
            </div>
            <div className="w-full bg-[var(--gray-4)] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[var(--accent-9)] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            {totalPages > 0 && (
              <div className="text-xs text-[var(--gray-11)] mt-2.5">
                Processing page {currentPage} of {totalPages}
              </div>
            )}
          </div>

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="w-full px-4 py-2.5 bg-[var(--red-9)] text-white rounded-lg hover:bg-[var(--red-10)] transition-colors font-medium"
          >
            Cancel Export
          </button>
        </div>
      )}
    </DialogWrapper>
  );
}
