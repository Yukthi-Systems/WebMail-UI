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

import React, { useState, useEffect } from 'react';
import { FaTimes, FaEyeSlash, FaEye, FaLock } from 'react-icons/fa';
import { useAtomValue } from 'jotai';
import { userDetailsAtom } from '../../../state/userDetails';
import DropdownWrapper from '../../common/DropdownWrapper';
import ContentEditor from '../../composer/contentEditor';
import { useIsMobile } from '../../../hooks/use-mobile';
import { getEditorDimensions } from '../../../utils/dimensions';

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface TemplateModalProps {
  isOpen: boolean;
  editingTemplate: Template | null;
  onClose: () => void;
  onSave: (formData: TemplateFormData) => void;
  isLoading?: boolean;
}

export interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
  type: 'private' | 'public';
}

const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  editingTemplate,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const userDetails = useAtomValue(userDetailsAtom);
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    subject: '',
    content: '',
    type: 'private',
  });

  const isOwner = editingTemplate
    ? !editingTemplate.createdBy || editingTemplate.createdBy === userDetails?.email
    : true;
  const isReadOnly: any = editingTemplate && !isOwner;

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        content: editingTemplate.content,
        type: editingTemplate.type,
      });
    } else {
      setFormData({ name: '', subject: '', content: '', type: 'private' });
    }
  }, [editingTemplate, isOpen]);

  const handleSave = () => {
    if (isReadOnly) return;
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[var(--gray-1)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--gray-5)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[var(--gray-12)]">
                {isReadOnly
                  ? 'View Template'
                  : editingTemplate
                    ? 'Edit Template'
                    : 'Create New Template'}
              </h2>
              {isReadOnly && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--gray-3)] text-[var(--gray-11)] text-xs font-medium rounded-md">
                  <FaLock className="w-3 h-3" />
                  <span>Read Only</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-all disabled:opacity-50"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
                  Template Name {!isReadOnly && <span className="text-[var(--red-11)]">*</span>}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                  disabled={isLoading || isReadOnly}
                  readOnly={isReadOnly}
                  className={`w-full px-3 py-2 bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all disabled:opacity-50 ${isReadOnly ? 'cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
                  Visibility {!isReadOnly && <span className="text-[var(--red-11)]">*</span>}
                </label>
                {isReadOnly ? (
                  <div className="w-full px-3 py-2 bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm flex items-center gap-2">
                    {formData.type === 'private' ? (
                      <>
                        <FaEyeSlash className="w-3 h-3 text-[var(--blue-11)]" />
                        <span>Personal</span>
                      </>
                    ) : (
                      <>
                        <FaEye className="w-3 h-3 text-[var(--green-11)]" />
                        <span>Shared</span>
                      </>
                    )}
                  </div>
                ) : (
                  <DropdownWrapper
                    items={[
                      {
                        key: 'private',
                        label: 'Personal',
                        icon: FaEyeSlash,
                        selected: formData.type === 'private',
                        onSelect: () => setFormData({ ...formData, type: 'private' }),
                      },
                      {
                        key: 'public',
                        label: 'Shared',
                        icon: FaEye,
                        selected: formData.type === 'public',
                        onSelect: () => setFormData({ ...formData, type: 'public' }),
                      },
                    ]}
                    trigger={
                      <button
                        type="button"
                        disabled={isLoading}
                        className="w-full px-3 py-2 bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all flex items-center justify-between hover:bg-[var(--gray-3)] disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          {formData.type === 'private' ? (
                            <FaEyeSlash className="w-3 h-3 text-[var(--blue-11)]" />
                          ) : (
                            <FaEye className="w-3 h-3 text-[var(--green-11)]" />
                          )}
                          {formData.type === 'private' ? 'Personal' : 'Shared'}
                        </span>
                        <FaTimes className="w-3 h-3 text-[var(--gray-9)] rotate-45" />
                      </button>
                    }
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
                Email Subject {!isReadOnly && <span className="text-[var(--red-11)]">*</span>}
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter email subject line"
                disabled={isLoading || isReadOnly}
                readOnly={isReadOnly}
                className={`w-full px-3 py-2 bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all disabled:opacity-50 ${isReadOnly ? 'cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
                Email Content {!isReadOnly && <span className="text-[var(--red-11)]">*</span>}
              </label>
              <div
                className={`border border-[var(--gray-5)] rounded-xl overflow-hidden bg-[var(--gray-2)] ${isReadOnly ? 'pointer-events-none opacity-90' : ''}`}
              >
                <ContentEditor
                  value={formData.content}
                  onChange={({ html }) =>
                    !isReadOnly && setFormData({ ...formData, content: html })
                  }
                  height={getEditorDimensions(isMobile, false, false).height}
                  maxheight={getEditorDimensions(isMobile, false, false).maxHeight}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--gray-5)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--gray-3)] hover:bg-[var(--gray-4)] text-[var(--gray-12)] text-sm font-medium rounded-lg transition-all"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
