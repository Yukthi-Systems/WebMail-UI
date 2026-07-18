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

import * as React from 'react';
import {
  FaFolder,
  FaFolderOpen,
  FaChevronDown,
  FaChevronRight,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import { buildFolderTree, type FolderNode } from '../../utils/folderTree';
import { useParams } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { folderDetailsAtom } from '../../state/folders';

interface Folder {
  id: string;
  name: string;
  path: string;
  total_count: number;
  unread_count: number;
  color?: string;
  children?: Folder[];
  delimiter: string;
  flags: string[];
}

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderSelect: (folder: Folder) => void;
  // Callers each have their own locally-typed "folder" shape (this file's Folder
  // is one of at least three slightly different versions across the app) — only
  // `.path` is ever read from it here, so accept anything with that shape.
  currentFolder?: { path?: string } | string | null;
  title?: string;
  isQuotaExceeded?: boolean;
}

const FolderDialog: React.FC<FolderDialogProps> = ({
  open,
  onOpenChange,
  onFolderSelect,
  currentFolder,
  title = 'Move to folder',
  isQuotaExceeded = false,
}) => {
  const folderDetails = useAtomValue(folderDetailsAtom);
  const { folder: currentFolderPath } = useParams({ strict: false });

  const customFoldersTree = React.useMemo(() => {
    if (!Array.isArray(folderDetails) || folderDetails.length === 0) return [];
    return buildFolderTree(folderDetails);
  }, [folderDetails]);

  const transformFolderNode = (node: FolderNode): Folder => ({
    id: node.path,
    name: node.name.split(node.delimiter).pop() || node.name,
    path: node.path,
    total_count: node.count || 0,
    unread_count: node.unread_count || 0,
    color: 'var(--gray-10)',
    delimiter: node.delimiter,
    flags: node.flags,
    children: node.children ? node.children.map(transformFolderNode) : [],
  });

  const transformedCustomFolders = React.useMemo(() => {
    return customFoldersTree.map(transformFolderNode);
  }, [customFoldersTree]);

  const [selectedFolder, setSelectedFolder] = React.useState<Folder | null>(null);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      setSelectedFolder(null);
      setExpandedFolders(new Set());
    }
  }, [open]);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  const isSourceFolder = (folder: Folder) => {
    // currentFolder is sometimes passed as a plain path string (not a Folder) —
    // .path on a string is always undefined, same as before this was typed.
    const currentFolderObjPath =
      currentFolder && typeof currentFolder === 'object' ? currentFolder.path : undefined;
    return (
      (currentFolder && folder.path === currentFolderObjPath) ||
      (currentFolderPath && folder.path === currentFolderPath)
    );
  };

  const isFolderSelectable = (folder: Folder) => {
    if (folder.unread_count === -1) return false;
    if (isSourceFolder(folder)) return false;
    return true;
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleFolderClick = (folder: Folder) => {
    if (!isFolderSelectable(folder)) return;

    // If folder has children, expand/collapse it
    if (folder.children && folder.children.length > 0) {
      toggleFolder(folder.id);
    }

    // Always select on click if selectable
    setSelectedFolder(folder);
  };

  const handleSelect = async () => {
    if (selectedFolder && isFolderSelectable(selectedFolder)) {
      onFolderSelect(selectedFolder);
      onOpenChange(false);
      setSelectedFolder(null);
    }
  };

  const isCopyDialog = title.toLowerCase().includes('copy');
  const showQuotaWarning = isCopyDialog && isQuotaExceeded;

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isSelected = selectedFolder?.id === folder.id;
    const isDeleted = folder.unread_count === -1;
    const isCurrent = isSourceFolder(folder);
    const isDisabled = showQuotaWarning || isDeleted || isCurrent;
    const hasUnread = folder.unread_count > 0;
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);

    return (
      <div key={folder.id} className="w-full">
        <div
          className={`
            flex items-center gap-2 py-2 px-3 transition-all duration-150
            ${isSelected && !isDisabled ? 'bg-[var(--accent-4)] border-l-4 border-[var(--accent-9)]' : 'border-l-4 border-transparent'}
            ${!isDisabled ? 'hover:bg-[var(--gray-4)]' : ''}
          `}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* Expand/Collapse Icon */}
          <div className="flex-shrink-0 w-5 flex items-center justify-center z-10">
            {hasChildren ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="text-[var(--gray-11)] hover:text-[var(--gray-12)] transition-colors cursor-pointer p-1 rounded hover:bg-[var(--gray-5)] flex items-center justify-center"
              >
                {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              </div>
            ) : null}
          </div>

          {/* Folder Content (Selectable area) */}
          <div
            className={`flex items-center gap-2 flex-1 min-w-0 py-1 transition-all duration-150 ${
              isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            onClick={() => {
              if (!isDisabled) {
                handleFolderClick(folder);
              }
            }}
          >
            {/* Folder Icon */}
            <div
              className={`flex-shrink-0 ${
                isDisabled
                  ? 'text-[var(--gray-8)]'
                  : isSelected
                    ? 'text-[var(--accent-10)]'
                    : 'text-[var(--gray-10)]'
              }`}
            >
              {isExpanded && hasChildren ? <FaFolderOpen size={16} /> : <FaFolder size={16} />}
            </div>

            {/* Folder Name and Info */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span
                className={`text-sm truncate ${
                  hasUnread && !isDisabled ? 'font-semibold' : 'font-normal'
                } ${
                  isDisabled
                    ? 'text-[var(--gray-9)]'
                    : isSelected
                      ? 'text-[var(--accent-12)]'
                      : 'text-[var(--gray-12)]'
                }`}
              >
                {folder.name}
              </span>

              {isDeleted && (
                <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[var(--red-3)] text-[var(--red-11)] border border-[var(--red-6)] font-medium">
                  Deleted
                </span>
              )}
              {isCurrent && (
                <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[var(--blue-3)] text-[var(--blue-11)] border border-[var(--blue-6)] font-medium">
                  Current
                </span>
              )}
            </div>

            {/* Unread Badge */}
            {hasUnread && !isDeleted && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-9)] text-white min-w-[24px] text-center">
                {folder.unread_count}
              </span>
            )}

            {/* Selection Indicator */}
            {isSelected && !isDisabled && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent-9)] flex items-center justify-center">
                <FaCheck size={10} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>{folder.children!.map((child) => renderFolder(child, level + 1))}</div>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[9998] backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-[600px] max-h-[80vh] bg-[var(--color-background)] rounded-xl shadow-2xl z-[9999] flex flex-col border border-[var(--gray-6)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--gray-6)] flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold m-0 text-[var(--gray-12)]">{title}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-[var(--gray-4)] rounded-lg transition-colors text-[var(--gray-11)] hover:text-[var(--gray-12)]"
            aria-label="Close dialog"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Quota Warning */}
        {showQuotaWarning && (
          <div className="mx-6 mt-4 p-3 bg-[var(--amber-3)] border border-[var(--amber-7)] rounded-lg flex items-start gap-3">
            <FaExclamationTriangle
              className="text-[var(--amber-10)] mt-0.5 flex-shrink-0"
              size={16}
            />
            <p className="text-sm text-[var(--amber-12)] m-0 leading-relaxed">
              <strong>Storage quota exceeded.</strong> Please free up space before copying emails.
            </p>
          </div>
        )}

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto min-h-0 mx-6 my-4  rounded-lg ">
          {transformedCustomFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-4">
              <FaFolder className="text-[var(--gray-8)] mb-3" size={32} />
              <span className="text-sm text-[var(--gray-11)] font-medium">
                No folders available
              </span>
            </div>
          ) : (
            <div>{transformedCustomFolders.map((folder) => renderFolder(folder, 0))}</div>
          )}
        </div>

        {/* Selected Folder Info */}
        {selectedFolder && isFolderSelectable(selectedFolder) && (
          <div className="mx-6 mb-4 p-4 bg-[var(--accent-3)] border border-[var(--accent-7)] rounded-lg">
            <div className="flex items-start gap-3">
              <FaFolder className="text-[var(--accent-10)] mt-0.5 flex-shrink-0" size={16} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[var(--accent-12)] truncate">
                    {selectedFolder.name}
                  </span>
                  {selectedFolder.children && selectedFolder.children.length > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--accent-5)] text-[var(--accent-11)] border border-[var(--accent-7)]">
                      {selectedFolder.children.length} subfolder
                      {selectedFolder.children.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--accent-11)] m-0 leading-relaxed">
                  {selectedFolder.children && selectedFolder.children.length > 0
                    ? 'This folder contains subfolders. The action will apply to all nested content.'
                    : 'Ready to proceed with this folder.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--gray-6)] bg-[var(--gray-2)] rounded-b-xl shrink-0">
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 rounded-lg bg-[var(--gray-4)] text-[var(--gray-12)] hover:bg-[var(--gray-5)] transition-colors font-medium text-sm border border-[var(--gray-7)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedFolder || showQuotaWarning || !isFolderSelectable(selectedFolder)}
              className="px-5 py-2.5 rounded-lg bg-[var(--accent-9)] text-white hover:bg-[var(--accent-10)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
            >
              {title.toLowerCase().includes('copy') ? 'Copy Here' : 'Move Here'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FolderDialog;
