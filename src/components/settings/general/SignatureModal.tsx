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

// SignatureModal.tsx
import { useState, useEffect } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import ContentEditor from '../../composer/contentEditor';

type Signature = {
  name: string;
  content: string;
};

type SignatureModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: Signature) => void;
  editingSignature?: Signature | null;
};

const SignatureModal = ({ isOpen, onClose, onSave, editingSignature }: SignatureModalProps) => {
  const [signatureName, setSignatureName] = useState('');
  const [signatureContent, setSignatureContent] = useState('');

  useEffect(() => {
    if (editingSignature) {
      setSignatureName(editingSignature.name);
      setSignatureContent(editingSignature.content);
    } else {
      setSignatureName('');
      setSignatureContent('');
    }
  }, [editingSignature, isOpen]);

  const handleSave = () => {
    if (!signatureName.trim()) {
      alert('Please enter a signature name');
      return;
    }

    onSave({ name: signatureName.trim(), content: signatureContent });
    handleClose();
  };

  const handleClose = () => {
    setSignatureName('');
    setSignatureContent('');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gray-5)]">
          <h3 className="text-lg font-bold text-[var(--gray-12)]">
            {editingSignature ? 'Edit Signature' : 'Add New Signature'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--gray-3)] rounded-lg transition-all text-[var(--gray-11)] hover:text-[var(--gray-12)]"
            title="Close"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Signature Name Field */}
          <div>
            <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
              Signature Name <span className="text-[var(--red-11)]">*</span>
            </label>
            <input
              type="text"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="e.g., Professional, Personal"
              className="w-full px-3 py-2 bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {/* Signature Content Field */}
          <div>
            <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
              Signature Content <span className="text-[var(--red-11)]">*</span>
            </label>
            <div className="border border-[var(--gray-5)] rounded-xl overflow-hidden bg-[var(--gray-2)]">
              <ContentEditor
                value={signatureContent}
                onChange={({ html }) => setSignatureContent(html)}
              />
            </div>
          </div>

          {/* Content Stats */}
          <div className="flex items-center gap-4 text-xs text-[var(--gray-10)] pt-2 border-t border-[var(--gray-5)]">
            <span>Characters: {signatureContent.length}</span>
            <span>•</span>
            <span>
              Words:{' '}
              {signatureContent.trim()
                ? signatureContent
                    .trim()
                    .replace(/<[^>]*>/g, '')
                    .split(/\s+/).length
                : 0}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--gray-5)]">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-[var(--gray-3)] hover:bg-[var(--gray-4)] text-[var(--gray-12)] text-sm font-medium rounded-lg transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={!signatureName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] disabled:bg-[var(--gray-6)] text-white rounded-lg transition-all font-semibold disabled:cursor-not-allowed disabled:opacity-60 shadow-sm hover:shadow"
          >
            <FaSave className="w-3 h-3" />
            {editingSignature ? 'Update' : 'Save'} Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
