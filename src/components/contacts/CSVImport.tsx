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

import { useState, useCallback } from 'react';
import { FaDownload, FaFileCsv, FaUpload, FaFileExcel, FaAddressCard } from 'react-icons/fa6';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import type { CreateContactData } from '../../utils/contact';
import { FaExclamationTriangle } from 'react-icons/fa';

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (contacts: CreateContactData[]) => void;
  isLoading: boolean;
}

const CSVImportModal = ({ open, onOpenChange, onImport, isLoading }: CSVImportModalProps) => {
  const [csvData, setCsvData] = useState<CreateContactData[]>([]);
  const [error, setError] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'excel' | 'vcf' | null>(null);

  const sampleCSV = `name,email,phone,notes
John Doe,john.doe@example.com,+1234567890,Sales manager
Jane Smith,jane.smith@example.com,+1987654321,HR department
Mike Johnson,mike.johnson@example.com,+1122334455,Technical lead`;

  const sampleVCF = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john.doe@example.com
TEL:+1234567890
NOTE:Sales manager
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
EMAIL:jane.smith@example.com
TEL:+1987654321
NOTE:HR department
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Mike Johnson
EMAIL:mike.johnson@example.com
TEL:+1122334455
NOTE:Technical lead
END:VCARD`;

  const downloadSampleCSV = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadSampleExcel = () => {
    const data = [
      ['name', 'email', 'phone', 'notes'],
      ['John Doe', 'john.doe@example.com', '+1234567890', 'Sales manager'],
      ['Jane Smith', 'jane.smith@example.com', '+1987654321', 'HR department'],
      ['Mike Johnson', 'mike.johnson@example.com', '+1122334455', 'Technical lead'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
    XLSX.writeFile(workbook, 'contacts_sample.xlsx');
  };

  const downloadSampleVCF = () => {
    const blob = new Blob([sampleVCF], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_sample.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): CreateContactData[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('File must have header and data rows');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    if (!headers.includes('name') || !headers.includes('email')) {
      throw new Error('File must have "name" and "email" columns');
    }

    const contacts: CreateContactData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      if (values.length !== headers.length) continue;

      const contact: CreateContactData = { name: '', email: '', phone: '', notes: '' };
      headers.forEach((header, index) => {
        if (header === 'name') contact.name = values[index] || '';
        if (header === 'email') contact.email = values[index] || '';
        if (header === 'phone') contact.phone = values[index] || '';
        if (header === 'notes') contact.notes = values[index] || '';
      });

      if (contact.name && contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        contacts.push(contact);
      }
    }

    if (contacts.length === 0) throw new Error('No valid contacts found');
    return contacts;
  };

  const parseExcel = (buffer: ArrayBuffer): CreateContactData[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

    if (jsonData.length < 2) throw new Error('Excel file must have header and data rows');

    const headers = jsonData[0].map((h) => String(h).trim().toLowerCase());
    if (!headers.includes('name') || !headers.includes('email')) {
      throw new Error('Excel file must have "name" and "email" columns');
    }

    const contacts: CreateContactData[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      const contact: CreateContactData = { name: '', email: '', phone: '', notes: '' };
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : '';
        if (header === 'name') contact.name = value;
        if (header === 'email') contact.email = value;
        if (header === 'phone') contact.phone = value;
        if (header === 'notes') contact.notes = value;
      });

      if (contact.name && contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        contacts.push(contact);
      }
    }

    if (contacts.length === 0) throw new Error('No valid contacts found in Excel file');
    return contacts;
  };

  const parseVCF = (text: string): CreateContactData[] => {
    const contacts: CreateContactData[] = [];

    // Split by vCard boundaries
    const vcardBlocks = text.split(/BEGIN:VCARD/i).filter((block) => block.trim());

    for (const block of vcardBlocks) {
      if (!block.includes('END:VCARD')) continue;

      const contact: CreateContactData = { name: '', email: '', phone: '', notes: '' };
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line);

      for (const line of lines) {
        // Parse FN (Full Name)
        if (line.startsWith('FN:')) {
          contact.name = line.substring(3).trim();
        }
        // Parse N (Name) as fallback
        else if (line.startsWith('N:') && !contact.name) {
          const nameParts = line
            .substring(2)
            .split(';')
            .filter((p) => p);
          contact.name = nameParts.reverse().join(' ').trim();
        }
        // Parse EMAIL
        else if (line.match(/^EMAIL[;:]?/i)) {
          const emailMatch = line.match(/:(.*?)$/);
          if (emailMatch) {
            contact.email = emailMatch[1].trim();
          }
        }
        // Parse TEL (Phone)
        else if (line.match(/^TEL[;:]?/i)) {
          const telMatch = line.match(/:(.*?)$/);
          if (telMatch) {
            contact.phone = telMatch[1].trim();
          }
        }
        // Parse NOTE
        else if (line.startsWith('NOTE:')) {
          contact.notes = line.substring(5).trim();
        }
        // Parse ORG (Organization) as notes if no note exists
        else if (line.startsWith('ORG:') && !contact.notes) {
          contact.notes = line.substring(4).trim();
        }
      }

      // Validate and add contact
      if (contact.name && contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        contacts.push(contact);
      }
    }

    if (contacts.length === 0) throw new Error('No valid contacts found in VCF file');
    return contacts;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv';
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    const isVCF =
      file.name.endsWith('.vcf') || file.type === 'text/vcard' || file.type === 'text/x-vcard';

    if (!isCSV && !isExcel && !isVCF) {
      setError('Please upload a CSV, Excel, or VCF file');
      return;
    }

    setFileType(isVCF ? 'vcf' : isExcel ? 'excel' : 'csv');

    const reader = new FileReader();

    if (isCSV || isVCF) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsedContacts = isVCF ? parseVCF(text) : parseCSV(text);
          setCsvData(parsedContacts);
          setError('');
        } catch (err) {
          setError(
            err instanceof Error ? err.message : `Failed to parse ${isVCF ? 'VCF' : 'CSV'} file`
          );
          setCsvData([]);
        }
      };
      reader.readAsText(file);
    } else if (isExcel) {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const parsedContacts = parseExcel(buffer);
          setCsvData(parsedContacts);
          setError('');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse Excel file');
          setCsvData([]);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/vcard': ['.vcf'],
      'text/x-vcard': ['.vcf'],
    },
    multiple: false,
  });

  const handleImport = () => {
    if (csvData.length > 0) {
      onImport(csvData);
      handleClose();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCsvData([]);
    setError('');
    setFileType(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[var(--gray-5)] sticky top-0 bg-[var(--color-panel-solid)] z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--accent-3)] rounded-lg flex items-center justify-center">
                {fileType === 'excel' ? (
                  <FaFileExcel className="w-5 h-5 text-[var(--accent-11)]" />
                ) : fileType === 'vcf' ? (
                  <FaAddressCard className="w-5 h-5 text-[var(--accent-11)]" />
                ) : (
                  <FaFileCsv className="w-5 h-5 text-[var(--accent-11)]" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--gray-12)]">Import Contacts</h2>
                <p className="text-sm text-[var(--gray-11)]">
                  Upload CSV, Excel, or VCF file to import multiple contacts
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-md border border-[var(--gray-6)] bg-[var(--gray-2)] hover:bg-[var(--gray-3)] flex items-center justify-center text-[var(--gray-11)] hover:text-[var(--gray-12)] transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Sample Downloads */}
          <div className="mb-6 space-y-3">
            <h3 className="text-sm font-medium text-[var(--gray-12)]">Download Sample Files</h3>
            <div className="grid grid-cols-3 gap-3">
              {/* CSV Sample */}
              <div className="p-3 bg-[var(--blue-2)] border border-[var(--blue-5)] rounded-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <FaFileCsv className="w-4 h-4 text-[var(--blue-11)]" />
                    <div>
                      <h4 className="text-xs font-medium text-[var(--blue-12)]">CSV</h4>
                      <p className="text-[10px] text-[var(--blue-11)]">Comma sep</p>
                    </div>
                  </div>
                  <button
                    onClick={downloadSampleCSV}
                    className="w-full px-2 py-1 bg-[var(--blue-9)] text-white text-xs font-medium rounded hover:bg-[var(--blue-10)] transition-colors flex items-center justify-center gap-1"
                  >
                    <FaDownload className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>

              {/* Excel Sample */}
              <div className="p-3 bg-[var(--green-2)] border border-[var(--green-5)] rounded-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <FaFileExcel className="w-4 h-4 text-[var(--green-11)]" />
                    <div>
                      <h4 className="text-xs font-medium text-[var(--green-12)]">Excel</h4>
                      <p className="text-[10px] text-[var(--green-11)]">XLSX file</p>
                    </div>
                  </div>
                  <button
                    onClick={downloadSampleExcel}
                    className="w-full px-2 py-1 bg-[var(--green-9)] text-white text-xs font-medium rounded hover:bg-[var(--green-10)] transition-colors flex items-center justify-center gap-1"
                  >
                    <FaDownload className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>

              {/* VCF Sample */}
              <div className="p-3 bg-[var(--purple-2)] border border-[var(--purple-5)] rounded-lg">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <FaAddressCard className="w-4 h-4 text-[var(--purple-11)]" />
                    <div>
                      <h4 className="text-xs font-medium text-[var(--purple-12)]">VCF</h4>
                      <p className="text-[10px] text-[var(--purple-11)]">vCard file</p>
                    </div>
                  </div>
                  <button
                    onClick={downloadSampleVCF}
                    className="w-full px-2 py-1 bg-[var(--purple-9)] text-white text-xs font-medium rounded hover:bg-[var(--purple-10)] transition-colors flex items-center justify-center gap-1"
                  >
                    <FaDownload className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--gray-11)]">
              <strong>Required:</strong> name, email | <strong>Optional:</strong> phone, notes
            </p>
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-[var(--accent-8)] bg-[var(--accent-2)]'
                : 'border-[var(--gray-6)] bg-[var(--gray-1)] hover:border-[var(--gray-7)]'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-[var(--gray-3)] rounded-lg flex items-center justify-center">
                <FaUpload className="w-5 h-5 text-[var(--gray-11)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--gray-12)]">
                  {isDragActive ? 'Drop file here' : 'Click or drag file to upload'}
                </p>
                <p className="text-xs text-[var(--gray-11)]">Supports CSV, XLS, XLSX, VCF files</p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-[var(--red-2)] border border-[var(--red-5)] rounded-lg flex items-start gap-2">
              <FaExclamationTriangle className="w-4 h-4 text-[var(--red-11)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--red-11)]">{error}</p>
            </div>
          )}

          {/* Preview */}
          {csvData.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                {fileType === 'excel' ? (
                  <FaFileExcel className="w-4 h-4 text-[var(--green-11)]" />
                ) : fileType === 'vcf' ? (
                  <FaAddressCard className="w-4 h-4 text-[var(--purple-11)]" />
                ) : (
                  <FaFileCsv className="w-4 h-4 text-[var(--blue-11)]" />
                )}
                <h3 className="text-sm font-medium text-[var(--gray-12)]">
                  Preview ({csvData.length} contacts found)
                </h3>
              </div>
              <div className="border border-[var(--gray-5)] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--gray-2)] border-b border-[var(--gray-5)] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--gray-11)]">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--gray-11)]">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--gray-11)]">
                        Phone
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--gray-11)]">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gray-5)]">
                    {csvData.map((contact, index) => (
                      <tr key={index} className="bg-[var(--gray-1)]">
                        <td className="px-3 py-2 text-[var(--gray-12)]">{contact.name}</td>
                        <td className="px-3 py-2 text-[var(--gray-12)]">{contact.email}</td>
                        <td className="px-3 py-2 text-[var(--gray-11)]">{contact.phone || '-'}</td>
                        <td className="px-3 py-2 text-[var(--gray-11)] max-w-24 truncate">
                          {contact.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--gray-5)] flex justify-end gap-3 sticky bottom-0 bg-[var(--color-panel-solid)]">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={csvData.length === 0 || isLoading}
            className="px-4 py-2 text-sm font-medium bg-[var(--accent-9)] text-white rounded-md hover:bg-[var(--accent-10)] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            Import {csvData.length > 0 ? `${csvData.length} ` : ''}Contacts
          </button>
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
