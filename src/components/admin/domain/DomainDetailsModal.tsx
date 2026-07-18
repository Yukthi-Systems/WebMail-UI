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

import { FiX, FiServer, FiShield, FiMail, FiCalendar, FiGlobe } from 'react-icons/fi';
import { formatEmailDate } from '../../../utils/dateFormat';
import type { Domain } from '../../../api/admin-domain';

interface DomainDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Domain | null;
}

const DomainDetailsModal = ({ isOpen, onClose, data }: DomainDetailsModalProps) => {
  if (!isOpen || !data) return null;

  const DetailGroup = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <div className="bg-[var(--gray-2)] p-5 rounded-xl border border-[var(--gray-5)] hover:border-[var(--gray-6)] transition-colors">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--gray-5)]">
        <div className="p-1.5 bg-[var(--accent-3)] rounded-lg">
          <Icon size={16} className="text-[var(--accent-11)]" />
        </div>
        <h3 className="text-[var(--gray-12)] font-bold text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-3 text-sm">{children}</div>
    </div>
  );

  const DetailRow = ({ label, value }: { label: string; value?: string | number }) => (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[var(--gray-11)] font-medium min-w-[80px]">{label}</span>
      <span className="text-[var(--gray-12)] font-semibold text-right break-all font-mono text-xs">
        {value || <span className="text-[var(--gray-9)]">-</span>}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--gray-1)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-[var(--gray-5)] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-[var(--gray-5)] bg-gradient-to-r from-[var(--accent-2)] to-transparent">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[var(--accent-9)] rounded-lg shadow-lg shadow-[var(--accent-9)]/20">
                <FiGlobe className="text-white" size={20} />
              </div>
              <h2 className="text-2xl font-bold text-[var(--gray-12)]">{data.domain}</h2>
            </div>
            <p className="text-sm text-[var(--gray-11)] font-medium ml-14">
              Domain Configuration Details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-lg transition-colors ml-4"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--gray-5)] bg-gradient-to-r from-[var(--gray-2)] to-[var(--gray-1)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--accent-3)] rounded-lg">
                <FiCalendar size={16} className="text-[var(--accent-11)]" />
              </div>
              <div>
                <span className="text-xs text-[var(--gray-11)] font-medium uppercase tracking-wide block mb-0.5">
                  Created
                </span>
                <span className="text-sm text-[var(--gray-12)] font-bold">
                  {formatEmailDate(data.created_at)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.is_active ? (
                <span className="px-4 py-2 text-xs font-bold rounded-full bg-[var(--green-9)] text-white shadow-lg shadow-[var(--green-9)]/20 uppercase tracking-wide">
                  Active
                </span>
              ) : (
                <span className="px-4 py-2 text-xs font-bold rounded-full bg-[var(--red-9)] text-white shadow-lg shadow-[var(--red-9)]/20 uppercase tracking-wide">
                  Inactive
                </span>
              )}
              {data.is_v2_user && (
                <span className="px-4 py-2 text-xs font-bold rounded-full bg-[var(--green-9)] text-white shadow-lg shadow-[var(--green-9)]/20 uppercase tracking-wide">
                  V2 User
                </span>
              )}
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DetailGroup title="SMTP Configuration" icon={FiMail}>
              <DetailRow label="Server" value={data.smtp_server} />
              <DetailRow label="Port" value={data.smtp_port} />
            </DetailGroup>

            <DetailGroup title="IMAP Configuration" icon={FiServer}>
              <DetailRow label="Server" value={data.imap_server} />
              <DetailRow label="Port" value={data.imap_port} />
            </DetailGroup>
          </div>
          <DetailGroup title="Sieve Configuration" icon={FiShield}>
            <DetailRow label="Server" value={data.sieve_server} />
            <DetailRow label="Port" value={data.sieve_port} />
          </DetailGroup>
        </div>
      </div>
    </div>
  );
};

export default DomainDetailsModal;
