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

import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-[var(--red-3)] text-[var(--red-11)]',
      button: 'bg-[var(--red-9)] hover:bg-[var(--red-10)]',
    },
    warning: {
      icon: 'bg-[var(--orange-3)] text-[var(--orange-11)]',
      button: 'bg-[var(--orange-9)] hover:bg-[var(--orange-10)]',
    },
    info: {
      icon: 'bg-[var(--blue-3)] text-[var(--blue-11)]',
      button: 'bg-[var(--blue-9)] hover:bg-[var(--blue-10)]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[var(--gray-1)] rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-[var(--gray-5)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--gray-12)]">{title}</h2>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-all disabled:opacity-50"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${styles.icon}`}
            >
              <FaExclamationTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[var(--gray-12)] leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4   flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-[var(--gray-3)] hover:bg-[var(--gray-4)] text-[var(--gray-12)] text-sm font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 ${styles.button}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
