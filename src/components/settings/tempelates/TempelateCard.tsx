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

import React, { useState } from 'react';
import { FaEdit, FaTrash, FaLock } from 'react-icons/fa';
import { useAtomValue } from 'jotai';
import { userDetailsAtom } from '../../../state/userDetails';
import ConfirmationModal from '../../common/ConfirmationModal';

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

interface TemplateCardProps {
  template: Template;
  copiedId: string | null;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  copiedId,
  onCopy,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const userDetails = useAtomValue(userDetailsAtom);

  const isOwner = !template.createdBy || template.createdBy === userDetails?.email;
  const canEdit = isOwner;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(template.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        onClick={onEdit}
        className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-xl p-4 hover:border-[var(--gray-7)] transition-all group cursor-pointer hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-[var(--gray-12)] truncate">
                {template.name}
              </h3>
              {!canEdit && (
                <FaLock className="w-3 h-3 text-[var(--gray-9)] flex-shrink-0" title="Read-only" />
              )}
            </div>
            <p className="text-xs text-[var(--gray-10)] mb-2">
              {canEdit ? 'Click to edit' : 'Click to view'}
            </p>
            <span className="text-[10px] text-[var(--gray-9)]">
              Updated {new Date(template.updatedAt).toLocaleDateString()}
            </span>
          </div>

          {canEdit && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1.5 text-[var(--gray-11)] hover:text-[var(--blue-11)] hover:bg-[var(--blue-3)] rounded transition-all"
                title="Edit template"
              >
                <FaEdit className="w-3 h-3" />
              </button>
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="p-1.5 text-[var(--gray-11)] hover:text-[var(--red-11)] hover:bg-[var(--red-3)] rounded transition-all disabled:opacity-50"
                title="Delete template"
              >
                <FaTrash className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
};

export default TemplateCard;
