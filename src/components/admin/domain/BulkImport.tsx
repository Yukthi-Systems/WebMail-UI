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

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import {
  FiUploadCloud,
  FiX,
  FiFile,
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiInfo,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDomain } from '../../../api/admin-domain';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DomainRow {
  domain: string;
  smtp_server: string;
  smtp_port: number;
  imap_server: string;
  imap_port: number;
  sieve_server: string;
  sieve_port: number;
  is_active: boolean;
  is_v2_user: boolean;
}

interface ParsedRow extends DomainRow {
  _rowIndex: number;
  _validationErrors: string[];
}

interface ImportError {
  domain: string;
  rowIndex: number;
  reason: string;
}

type ImportPhase = 'idle' | 'parsed' | 'importing' | 'done';

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_HEADERS = [
  'domain',
  'smtp_server',
  'smtp_port',
  'imap_server',
  'imap_port',
  'sieve_server',
  'sieve_port',
];

const PORT_DEFAULTS: Record<string, number> = {
  smtp_port: 587,
  imap_port: 993,
  sieve_port: 4190,
};

const TEMPLATE_CSV =
  'domain,smtp_server,smtp_port,imap_server,imap_port,sieve_server,sieve_port,is_active,is_v2_user\n' +
  'example.com,smtp.example.com,587,imap.example.com,993,sieve.example.com,4190,true,false\n' +
  'another.org,smtp.another.org,587,imap.another.org,993,sieve.another.org,4190,true,false\n';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateRow(raw: Record<string, string>, rowIndex: number): ParsedRow {
  const errors: string[] = [];

  const domain = (raw.domain ?? '').trim();
  if (!domain) errors.push('domain is required');
  else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain))
    errors.push(`"${domain}" is not a valid domain name`);

  const smtp_server = (raw.smtp_server ?? '').trim();
  if (!smtp_server) errors.push('smtp_server is required');

  const imap_server = (raw.imap_server ?? '').trim();
  if (!imap_server) errors.push('imap_server is required');

  const sieve_server = (raw.sieve_server ?? '').trim();
  if (!sieve_server) errors.push('sieve_server is required');

  const parsePort = (val: string, fieldName: string): number => {
    const n = Number((val ?? '').trim() || PORT_DEFAULTS[fieldName]);
    if (isNaN(n) || n < 1 || n > 65535) {
      errors.push(`${fieldName} must be 1-65535`);
      return PORT_DEFAULTS[fieldName];
    }
    return n;
  };

  const smtp_port = parsePort(raw.smtp_port, 'smtp_port');
  const imap_port = parsePort(raw.imap_port, 'imap_port');
  const sieve_port = parsePort(raw.sieve_port, 'sieve_port');

  const is_active_raw = (raw.is_active ?? 'true').trim().toLowerCase();
  const is_active = is_active_raw !== 'false' && is_active_raw !== '0';

  const is_v2_user_raw = (raw.is_v2_user ?? 'false').trim().toLowerCase();
  const is_v2_user = is_v2_user_raw === 'true' || is_v2_user_raw === '1';

  return {
    domain,
    smtp_server,
    smtp_port,
    imap_server,
    imap_port,
    sieve_server,
    sieve_port,
    is_active,
    is_v2_user,
    _rowIndex: rowIndex,
    _validationErrors: errors,
  };
}

// ─── File Parsing ─────────────────────────────────────────────────────────────

function parseFile(file: File): Promise<{ rows: ParsedRow[]; missingHeaders: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: '',
        });

        if (raw.length === 0) return reject(new Error('File is empty or has no data rows.'));

        const headers = Object.keys(raw[0]).map((h) => h.trim().toLowerCase());
        const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));

        if (missingHeaders.length > 0) return resolve({ rows: [], missingHeaders });

        // Normalise header keys
        const normalised = raw.map((row) =>
          Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]))
        );

        const rows = normalised.map((row, i) => validateRow(row, i + 2)); // +2 for header + 1-based
        resolve({ rows, missingHeaders: [] });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`Failed to parse file: ${message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsBinaryString(file);
  });
}

// ─── Helper: download CSV ─────────────────────────────────────────────────────

function downloadErrorCSV(errors: ImportError[]) {
  const header = 'row,domain,reason\n';
  const body = errors
    .map((e) => `${e.rowIndex},"${e.domain}","${e.reason.replace(/"/g, '""')}"`)
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `domain-import-errors-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'domain-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="rotate-[-90deg]">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--gray-4)" strokeWidth="6" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="var(--accent-9)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function DomainBulkImportModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const createMutation = useMutation({ mutationFn: createDomain });

  // ── State
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [missingHeaders, setMissingHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Import progress
  const [importedCount, setImportedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const abortRef = useRef(false);

  const validRows = rows.filter((r) => r._validationErrors.length === 0);
  const invalidRows = rows.filter((r) => r._validationErrors.length > 0);
  const totalToImport = validRows.length;
  const pct = totalToImport > 0 ? Math.round((importedCount / totalToImport) * 100) : 0;

  // ── Dropzone
  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setParseError(null);
    setMissingHeaders([]);
    setRows([]);
    setPhase('idle');
    setShowPreview(false);
    try {
      const { rows: parsed, missingHeaders: missing } = await parseFile(f);
      if (missing.length > 0) {
        setMissingHeaders(missing);
        setPhase('idle');
        return;
      }
      setRows(parsed);
      setPhase('parsed');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: phase === 'importing',
  });

  // ── Import
  const startImport = async () => {
    abortRef.current = false;
    setPhase('importing');
    setImportedCount(0);
    setSuccessCount(0);
    setImportErrors([]);

    const errors: ImportError[] = [];
    let successes = 0;

    for (let i = 0; i < validRows.length; i++) {
      if (abortRef.current) break;
      const row = validRows[i];
      setCurrentDomain(row.domain);

      try {
        await new Promise<void>((resolve) => {
          createMutation.mutate(
            {
              domain: row.domain,
              smtp_server: row.smtp_server,
              smtp_port: row.smtp_port,
              imap_server: row.imap_server,
              imap_port: row.imap_port,
              sieve_server: row.sieve_server,
              sieve_port: row.sieve_port,
              is_active: row.is_active,
              is_v2_user: row.is_v2_user,
            },
            {
              onSuccess: () => {
                successes++;
                resolve();
              },
              onError: (err) => {
                errors.push({
                  domain: row.domain,
                  rowIndex: row._rowIndex,
                  reason: err?.message ?? 'Unknown error',
                });
                resolve(); // don't reject — continue loop
              },
            }
          );
        });
      } catch {
        errors.push({ domain: row.domain, rowIndex: row._rowIndex, reason: 'Unexpected error' });
      }

      setImportedCount(i + 1);
      setSuccessCount(successes);
      setImportErrors([...errors]);
    }

    setCurrentDomain('');
    // Single invalidation after all domains are processed
    queryClient.invalidateQueries({ queryKey: ['domains'] });
    setPhase('done');
  };

  const resetModal = () => {
    setPhase('idle');
    setFile(null);
    setParseError(null);
    setMissingHeaders([]);
    setRows([]);
    setImportedCount(0);
    setSuccessCount(0);
    setImportErrors([]);
    setCurrentDomain('');
    setShowPreview(false);
  };

  const handleClose = () => {
    if (phase === 'importing') return; // block close while importing
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  // ── Render helpers
  const renderIdle = () => (
    <div className="space-y-5">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200
          ${
            isDragActive
              ? 'border-[var(--accent-9)] bg-[var(--accent-2)] scale-[1.01]'
              : 'border-[var(--gray-6)] hover:border-[var(--accent-8)] hover:bg-[var(--gray-2)]'
          }
          ${phase === 'importing' ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-[var(--accent-4)]' : 'bg-[var(--gray-3)]'}`}
        >
          <FiUploadCloud
            className={`w-7 h-7 transition-colors ${isDragActive ? 'text-[var(--accent-11)]' : 'text-[var(--gray-10)]'}`}
          />
        </div>
        {isDragActive ? (
          <p className="text-sm font-semibold text-[var(--accent-11)]">Drop it here!</p>
        ) : (
          <>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--gray-12)]">
                Drop a CSV or Excel file, or{' '}
                <span className="text-[var(--accent-11)] hover:underline">browse</span>
              </p>
              <p className="text-xs text-[var(--gray-10)] mt-1">Supports .csv, .xlsx, .xls</p>
            </div>
          </>
        )}
      </div>

      {/* Template download */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
        <FiInfo className="w-4 h-4 text-[var(--accent-10)] shrink-0" />
        <p className="text-xs text-[var(--gray-11)] flex-1">
          Need a starting point? Download the template with correct column headers.
        </p>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-11)] hover:text-[var(--accent-12)] transition-colors shrink-0"
        >
          <FiDownload className="w-3.5 h-3.5" />
          Template
        </button>
      </div>

      {/* Parse errors */}
      {parseError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--red-2)] border border-[var(--red-6)]">
          <FiAlertCircle className="w-4 h-4 text-[var(--red-9)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--red-11)]">{parseError}</p>
        </div>
      )}

      {/* Missing headers */}
      {missingHeaders.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[var(--red-2)] border border-[var(--red-6)]">
          <FiAlertCircle className="w-4 h-4 text-[var(--red-9)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--red-11)] mb-1">
              Missing required columns:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingHeaders.map((h) => (
                <code
                  key={h}
                  className="text-xs px-1.5 py-0.5 rounded bg-[var(--red-3)] text-[var(--red-11)] font-mono"
                >
                  {h}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Required columns info */}
      <div className="px-4 py-3 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
        <p className="text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wider mb-2">
          Required columns
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REQUIRED_HEADERS.map((h) => (
            <code
              key={h}
              className="text-xs px-1.5 py-0.5 rounded bg-[var(--gray-4)] text-[var(--gray-12)] font-mono"
            >
              {h}
            </code>
          ))}
          <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--gray-3)] text-[var(--gray-10)] font-mono">
            is_active <span className="text-[var(--gray-9)]">(optional)</span>
          </code>
          <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--gray-3)] text-[var(--gray-10)] font-mono">
            is_v2_user <span className="text-[var(--gray-9)]">(optional)</span>
          </code>
        </div>
      </div>
    </div>
  );

  const renderParsed = () => (
    <div className="space-y-4">
      {/* File badge */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--gray-3)] border border-[var(--gray-5)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-3)] flex items-center justify-center">
          <FiFile className="w-4 h-4 text-[var(--accent-11)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--gray-12)] truncate">{file?.name}</p>
          <p className="text-xs text-[var(--gray-10)]">
            {rows.length} row{rows.length !== 1 ? 's' : ''} detected
          </p>
        </div>
        <button
          onClick={resetModal}
          className="p-1.5 hover:bg-[var(--gray-5)] rounded-lg transition-colors"
        >
          <FiX className="w-4 h-4 text-[var(--gray-10)]" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="px-4 py-3 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)] text-center">
          <p className="text-2xl font-bold text-[var(--gray-12)]">{rows.length}</p>
          <p className="text-xs text-[var(--gray-10)] mt-0.5">Total rows</p>
        </div>
        <div className="px-4 py-3 rounded-lg bg-[var(--green-2)] border border-[var(--green-6)] text-center">
          <p className="text-2xl font-bold text-[var(--green-11)]">{validRows.length}</p>
          <p className="text-xs text-[var(--green-10)] mt-0.5">Ready to import</p>
        </div>
        <div
          className={`px-4 py-3 rounded-lg text-center ${invalidRows.length > 0 ? 'bg-[var(--red-2)] border border-[var(--red-6)]' : 'bg-[var(--gray-2)] border border-[var(--gray-5)]'}`}
        >
          <p
            className={`text-2xl font-bold ${invalidRows.length > 0 ? 'text-[var(--red-11)]' : 'text-[var(--gray-10)]'}`}
          >
            {invalidRows.length}
          </p>
          <p
            className={`text-xs mt-0.5 ${invalidRows.length > 0 ? 'text-[var(--red-9)]' : 'text-[var(--gray-9)]'}`}
          >
            Invalid (skipped)
          </p>
        </div>
      </div>

      {/* Validation errors accordion */}
      {invalidRows.length > 0 && (
        <div className="rounded-lg border border-[var(--red-6)] overflow-hidden">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[var(--red-2)] hover:bg-[var(--red-3)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 text-[var(--red-9)]" />
              <span className="text-sm font-semibold text-[var(--red-11)]">
                {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} with validation errors
              </span>
            </div>
            {showPreview ? (
              <FiChevronUp className="w-4 h-4 text-[var(--red-9)]" />
            ) : (
              <FiChevronDown className="w-4 h-4 text-[var(--red-9)]" />
            )}
          </button>
          {showPreview && (
            <div className="max-h-44 overflow-y-auto divide-y divide-[var(--red-4)]">
              {invalidRows.map((row) => (
                <div key={row._rowIndex} className="px-4 py-2.5 bg-[var(--gray-1)]">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[var(--gray-9)] font-mono mt-0.5 shrink-0">
                      Row {row._rowIndex}
                    </span>
                    <span className="text-xs font-semibold text-[var(--gray-12)] font-mono shrink-0">
                      {row.domain || '(empty)'}
                    </span>
                    <span className="text-xs text-[var(--red-10)] leading-relaxed">
                      — {row._validationErrors.join('; ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {validRows.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--amber-2)] border border-[var(--amber-6)]">
          <FiAlertCircle className="w-4 h-4 text-[var(--amber-9)] shrink-0" />
          <p className="text-sm text-[var(--amber-11)]">
            No valid rows to import. Fix validation errors and re-upload.
          </p>
        </div>
      )}
    </div>
  );

  const renderImporting = () => (
    <div className="space-y-6 py-2">
      {/* Progress ring + stats */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <ProgressRing pct={pct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[var(--gray-12)]">{pct}%</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--gray-12)]">
            Importing {importedCount} of {totalToImport}
          </p>
          {currentDomain && (
            <p className="text-xs text-[var(--gray-10)] mt-1 font-mono truncate max-w-[280px]">
              ↳ {currentDomain}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-2 bg-[var(--gray-4)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-9)] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Live counters */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="px-3 py-3 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
          <p className="text-xl font-bold text-[var(--gray-12)]">{importedCount}</p>
          <p className="text-xs text-[var(--gray-10)]">Processed</p>
        </div>
        <div className="px-3 py-3 rounded-lg bg-[var(--green-2)] border border-[var(--green-5)]">
          <p className="text-xl font-bold text-[var(--green-11)]">{successCount}</p>
          <p className="text-xs text-[var(--green-10)]">Succeeded</p>
        </div>
        <div
          className={`px-3 py-3 rounded-lg ${importErrors.length > 0 ? 'bg-[var(--red-2)] border border-[var(--red-5)]' : 'bg-[var(--gray-2)] border border-[var(--gray-5)]'}`}
        >
          <p
            className={`text-xl font-bold ${importErrors.length > 0 ? 'text-[var(--red-11)]' : 'text-[var(--gray-10)]'}`}
          >
            {importErrors.length}
          </p>
          <p
            className={`text-xs ${importErrors.length > 0 ? 'text-[var(--red-9)]' : 'text-[var(--gray-9)]'}`}
          >
            Failed
          </p>
        </div>
      </div>

      {/* Live error feed */}
      {importErrors.length > 0 && (
        <div className="rounded-lg border border-[var(--gray-5)] overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-[var(--gray-11)] bg-[var(--gray-3)] uppercase tracking-wider">
            Live errors
          </p>
          <div className="max-h-28 overflow-y-auto divide-y divide-[var(--gray-4)]">
            {importErrors
              .slice(-6)
              .reverse()
              .map((e, i) => (
                <div key={i} className="px-4 py-2 flex items-start gap-2 bg-[var(--gray-1)]">
                  <FiAlertCircle className="w-3.5 h-3.5 text-[var(--red-9)] mt-0.5 shrink-0" />
                  <span className="text-xs font-mono text-[var(--red-11)]">{e.domain}</span>
                  <span className="text-xs text-[var(--gray-10)]">— {e.reason}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDone = () => {
    const allFailed = successCount === 0 && importErrors.length > 0;
    const allSucceeded = importErrors.length === 0;
    return (
      <div className="space-y-5 py-2">
        {/* Result header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${allFailed ? 'bg-[var(--red-3)]' : allSucceeded ? 'bg-[var(--green-3)]' : 'bg-[var(--amber-3)]'}`}
          >
            {allFailed ? (
              <FiAlertCircle className="w-8 h-8 text-[var(--red-9)]" />
            ) : allSucceeded ? (
              <FiCheckCircle className="w-8 h-8 text-[var(--green-9)]" />
            ) : (
              <FiCheckCircle className="w-8 h-8 text-[var(--amber-9)]" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--gray-12)]">
              {allFailed
                ? 'Import Failed'
                : allSucceeded
                  ? 'Import Complete'
                  : 'Import Finished with Errors'}
            </h3>
            <p className="text-sm text-[var(--gray-10)] mt-1">
              {successCount} of {totalToImport} domain{totalToImport !== 1 ? 's' : ''} imported
              successfully
            </p>
          </div>
        </div>

        {/* Final counters */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="px-3 py-3 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
            <p className="text-xl font-bold text-[var(--gray-12)]">{totalToImport}</p>
            <p className="text-xs text-[var(--gray-10)]">Attempted</p>
          </div>
          <div className="px-3 py-3 rounded-lg bg-[var(--green-2)] border border-[var(--green-5)]">
            <p className="text-xl font-bold text-[var(--green-11)]">{successCount}</p>
            <p className="text-xs text-[var(--green-10)]">Succeeded</p>
          </div>
          <div
            className={`px-3 py-3 rounded-lg ${importErrors.length > 0 ? 'bg-[var(--red-2)] border border-[var(--red-5)]' : 'bg-[var(--gray-2)] border border-[var(--gray-5)]'}`}
          >
            <p
              className={`text-xl font-bold ${importErrors.length > 0 ? 'text-[var(--red-11)]' : 'text-[var(--gray-10)]'}`}
            >
              {importErrors.length}
            </p>
            <p
              className={`text-xs ${importErrors.length > 0 ? 'text-[var(--red-9)]' : 'text-[var(--gray-9)]'}`}
            >
              Failed
            </p>
          </div>
        </div>

        {/* Error list */}
        {importErrors.length > 0 && (
          <div className="rounded-lg border border-[var(--red-6)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--red-2)]">
              <div className="flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 text-[var(--red-9)]" />
                <span className="text-sm font-semibold text-[var(--red-11)]">
                  {importErrors.length} failed domain{importErrors.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => downloadErrorCSV(importErrors)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--red-11)] hover:text-[var(--red-12)] px-2.5 py-1.5 rounded-md hover:bg-[var(--red-3)] transition-colors"
              >
                <FiDownload className="w-3.5 h-3.5" />
                Download errors
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto divide-y divide-[var(--gray-4)]">
              {importErrors.map((e, i) => (
                <div key={i} className="px-4 py-2.5 bg-[var(--gray-1)] flex items-start gap-2">
                  <span className="text-xs text-[var(--gray-9)] font-mono mt-0.5 shrink-0">
                    Row {e.rowIndex}
                  </span>
                  <span className="text-xs font-semibold text-[var(--gray-12)] font-mono shrink-0">
                    {e.domain}
                  </span>
                  <span className="text-xs text-[var(--red-10)] leading-relaxed">— {e.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Also-skipped reminder */}
        {invalidRows.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
            <FiInfo className="w-3.5 h-3.5 text-[var(--gray-9)] shrink-0" />
            <p className="text-xs text-[var(--gray-10)]">
              {invalidRows.length} row{invalidRows.length !== 1 ? 's were' : ' was'} skipped before
              import due to validation errors.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Footer buttons
  const renderFooter = () => {
    if (phase === 'idle') {
      return (
        <button
          onClick={handleClose}
          className="px-5 py-2.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
        >
          Cancel
        </button>
      );
    }
    if (phase === 'parsed') {
      return (
        <>
          <button
            onClick={resetModal}
            className="px-5 py-2.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={startImport}
            disabled={validRows.length === 0}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            <FiUploadCloud className="w-4 h-4" />
            Import {validRows.length} Domain{validRows.length !== 1 ? 's' : ''}
          </button>
        </>
      );
    }
    if (phase === 'importing') {
      return (
        <button
          onClick={() => {
            abortRef.current = true;
          }}
          className="px-5 py-2.5 text-sm font-medium text-[var(--red-11)] hover:bg-[var(--red-3)] rounded-lg transition-colors"
        >
          Abort
        </button>
      );
    }
    if (phase === 'done') {
      return (
        <>
          <button
            onClick={resetModal}
            className="px-5 py-2.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
          >
            Import more
          </button>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-colors shadow-sm"
          >
            Done
          </button>
        </>
      );
    }
    return null;
  };

  const phaseTitle: Record<ImportPhase, string> = {
    idle: 'Bulk Import Domains',
    parsed: 'Review & Import',
    importing: 'Importing Domains…',
    done: 'Import Complete',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={phase !== 'importing' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-[var(--gray-1)] rounded-2xl shadow-2xl border border-[var(--gray-5)] w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--gray-5)] shrink-0">
          <div className="flex items-center gap-3">
            {phase === 'importing' && (
              <div className="w-5 h-5 border-2 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
            )}
            <h2 className="text-lg font-bold text-[var(--gray-12)]">{phaseTitle[phase]}</h2>
          </div>
          {phase !== 'importing' && (
            <button
              onClick={handleClose}
              className="p-2 hover:bg-[var(--gray-4)] rounded-lg transition-colors"
            >
              <FiX className="w-4 h-4 text-[var(--gray-10)]" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {phase === 'idle' && renderIdle()}
          {phase === 'parsed' && renderParsed()}
          {phase === 'importing' && renderImporting()}
          {phase === 'done' && renderDone()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--gray-5)] flex justify-end gap-2 shrink-0">
          {renderFooter()}
        </div>
      </div>
    </div>
  );
}
