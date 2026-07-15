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

import React, { useState, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  FaChevronDown,
  FaChevronRight,
  FaFolder,
  FaFolderOpen,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import DialogWrapper from '../../common/Dialoge';
import { MAX_FOLDER_DEPTH } from '../../../constants/constant';

// 1. Updated Interfaces to include unread_count
interface FolderFromAPI {
  flags: string[];
  delimiter: string;
  folder_name: string;
  unread_count?: number;
}

interface CreateFolderForm {
  folder_name: string;
  parent_folder?: string;
}

interface EditFolderForm {
  new_name: string;
}

interface FolderDialogsProps {
  // Create Dialog
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  onCreateFolder: (data: CreateFolderForm) => void;
  isCreating: boolean;
  parentFolders: FolderFromAPI[];

  // Edit Dialog
  showEditDialog: boolean;
  setShowEditDialog: (show: boolean) => void;
  onEditFolder: (data: EditFolderForm) => void;
  isEditing: boolean;
  selectedFolder: string | null;

  // Delete Dialog
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  onDeleteFolder: () => void;
  isDeleting: boolean;
}

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  level: number;
  delimiter: string;
  unread_count?: number;
}

// 2. Fixed Tree Builder: Uses dynamic delimiter instead of hardcoded '.'
const buildFolderTree = (folders: FolderFromAPI[]): FolderNode[] => {
  const folderMap = new Map<string, FolderNode>();
  const rootFolders: FolderNode[] = [];

  // Pass 1: Create all nodes
  folders.forEach((folder) => {
    // Safely extract name using the folder's specific delimiter
    const name = folder.folder_name.split(folder.delimiter).pop() || folder.folder_name;

    folderMap.set(folder.folder_name, {
      name,
      path: folder.folder_name,
      children: [],
      level: 0,
      delimiter: folder.delimiter,
      unread_count: folder.unread_count,
    });
  });

  // Pass 2: Build hierarchy
  folders.forEach((folder) => {
    const node = folderMap.get(folder.folder_name)!;
    const parts = folder.folder_name.split(folder.delimiter);

    if (parts.length > 1) {
      // It's a subfolder
      const parentPath = parts.slice(0, -1).join(folder.delimiter);
      const parent = folderMap.get(parentPath);

      if (parent) {
        node.level = parent.level + 1;
        parent.children.push(node);
        // Sort children alphabetically
        parent.children.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Orphaned subfolder (parent might be hidden/missing), treat as root
        rootFolders.push(node);
      }
    } else {
      // It's a root folder
      rootFolders.push(node);
    }
  });

  return rootFolders.sort((a, b) => a.name.localeCompare(b.name));
};

// 3. Updated Nested Dropdown with Ghost Logic and Depth Limit
const NestedFolderDropdown: React.FC<{
  folders: FolderNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}> = ({ folders, selectedPath, onSelect, onClose }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpanded = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent form submit
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleSelect = (path: string, isDeleted: boolean, isMaxDepth: boolean) => {
    if (isDeleted || isMaxDepth) return; // Prevent selection of ghost folders and max depth folders
    onSelect(path);
    onClose();
  };

  const renderFolderItem = (folder: FolderNode) => {
    const isExpanded = expandedFolders.has(folder.path);
    const isSelected = selectedPath === folder.path;
    const hasChildren = folder.children.length > 0;

    // Ghost Logic: Check if unread_count is negative
    const isDeleted = (folder.unread_count ?? 0) < 0;

    // Depth Logic: Check if folder is at max depth
    const isMaxDepth = folder.level >= MAX_FOLDER_DEPTH;
    const isDisabled = isDeleted || isMaxDepth;

    return (
      <div key={folder.path}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 transition-colors text-sm
            ${
              isDisabled
                ? 'cursor-not-allowed opacity-60 bg-[var(--gray-2)]' // Disabled styling
                : 'cursor-pointer hover:bg-[var(--gray-3)]'
            }
            ${
              isSelected && !isDisabled
                ? 'bg-[var(--accent-3)] text-[var(--accent-11)]'
                : 'text-[var(--gray-12)]'
            }
          `}
          style={{ paddingLeft: `${12 + folder.level * 16}px` }}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(folder.path, isDeleted, isMaxDepth);
          }}
          title={
            isMaxDepth
              ? 'Maximum folder depth reached (5 levels)'
              : isDeleted
                ? 'Deleted folder'
                : ''
          }
        >
          {/* Expand Toggle */}
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              <button
                type="button"
                className="w-full h-full flex items-center justify-center hover:bg-[var(--gray-4)] rounded transition-colors text-[var(--gray-11)]"
                onClick={(e) => toggleExpanded(folder.path, e)}
              >
                {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              </button>
            ) : null}
          </div>

          {/* Folder Icon */}
          {isDeleted ? (
            <FaTriangleExclamation
              size={14}
              className="text-[var(--gray-8)]"
              title="Deleted Folder"
            />
          ) : hasChildren && isExpanded ? (
            <FaFolderOpen
              size={14}
              className={
                isMaxDepth
                  ? 'text-[var(--gray-8)]'
                  : isSelected
                    ? 'text-[var(--accent-9)]'
                    : 'text-[var(--gray-10)]'
              }
            />
          ) : (
            <FaFolder
              size={14}
              className={
                isMaxDepth
                  ? 'text-[var(--gray-8)]'
                  : isSelected
                    ? 'text-[var(--accent-9)]'
                    : 'text-[var(--gray-10)]'
              }
            />
          )}

          {/* Folder Name */}
          <span className={`flex-1 truncate ${isDisabled ? 'italic text-[var(--gray-9)]' : ''}`}>
            {folder.name}
            {isMaxDepth && !isDeleted && (
              <span className="ml-1 text-[var(--gray-9)]">(Max depth)</span>
            )}
          </span>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>{folder.children.map((child) => renderFolderItem(child))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
      {/* Root Option */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--gray-3)] text-sm border-b border-[var(--gray-5)]"
        onClick={() => handleSelect('', false, false)}
      >
        <div className="w-4 h-4" />
        <FaFolder size={14} className="text-[var(--gray-10)]" />
        <span
          className={`flex-1 ${
            selectedPath === '' ? 'font-semibold text-[var(--accent-11)]' : 'text-[var(--gray-12)]'
          }`}
        >
          Root Level (no parent)
        </span>
      </div>

      {/* Folder Tree */}
      {folders.map((folder) => renderFolderItem(folder))}
    </div>
  );
};

const FolderDialogs: React.FC<FolderDialogsProps> = ({
  showCreateDialog,
  setShowCreateDialog,
  onCreateFolder,
  isCreating,
  parentFolders,
  showEditDialog,
  setShowEditDialog,
  onEditFolder,
  isEditing,
  selectedFolder,
  showDeleteDialog,
  setShowDeleteDialog,
  onDeleteFolder,
  isDeleting,
}) => {
  const createForm = useForm<CreateFolderForm>();
  const editForm = useForm<EditFolderForm>();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Recalculate tree when parentFolders change
  const folderTree = useMemo(() => buildFolderTree(parentFolders), [parentFolders]);

  const handleCreateSubmit = (data: CreateFolderForm) => {
    onCreateFolder(data);
    createForm.reset();
    setIsDropdownOpen(false); // Ensure dropdown is closed
  };

  const handleEditSubmit = (data: EditFolderForm) => {
    onEditFolder(data);
    editForm.reset();
  };

  // Helper to format path for display (just for header/desc)
  const formatFolderPath = (path: string) => {
    // We try to find the delimiter from the folder list if possible, defaulting to slash
    const folder = parentFolders.find((f) => f.folder_name === path);
    if (folder) {
      return path.split(folder.delimiter).join('/');
    }
    return path.replace(/[./\\]/g, '/');
  };

  // Helper to get simple name for display in input
  const getFolderName = (path: string) => {
    const folder = parentFolders.find((f) => f.folder_name === path);
    if (folder) {
      return path.split(folder.delimiter).pop() || path;
    }
    return path;
  };

  React.useEffect(() => {
    if (showEditDialog && selectedFolder) {
      // Extract just the name for editing
      // We need the delimiter to split correctly
      const folder = parentFolders.find((f) => f.folder_name === selectedFolder);
      const delimiter = folder?.delimiter || '.';
      const folderName = selectedFolder.split(delimiter).pop() || selectedFolder;

      editForm.setValue('new_name', folderName);
    }
  }, [showEditDialog, selectedFolder, editForm, parentFolders]);

  return (
    <>
      {/* Create Folder Dialog */}
      <DialogWrapper
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        title="Create New Folder"
        className="no-scrollbar"
        description="Create a new email folder to organize your messages. You can create it as a standalone folder or place it inside an existing parent folder."
        width="min(90vw, 500px)"
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div>
            <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
              Folder Name
            </label>
            <input
              {...createForm.register('folder_name', {
                required: 'Folder name is required',
                minLength: { value: 1, message: 'Folder name must not be empty' },
                pattern: {
                  value: /^[a-zA-Z0-9._\- ]+$/, // Added space to allowed chars
                  message: 'Only letters, numbers, dots, hyphens, underscores and spaces allowed',
                },
              })}
              type="text"
              placeholder="Enter folder name (e.g., Projects, Archive)"
              className="w-full px-3 py-2.5 sm:py-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent text-base sm:text-sm"
            />
            <p className="text-xs text-[var(--gray-9)] mt-1">
              Use letters, numbers, dots, hyphens and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
              Parent Folder (Optional)
            </label>
            <Controller
              name="parent_folder"
              control={createForm.control}
              render={({ field }) => {
                // Get display name for the selected value
                const displayPath = field.value
                  ? getFolderName(field.value)
                  : 'Root Level (no parent)';

                return (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between px-3 py-2.5 sm:py-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] hover:bg-[var(--gray-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FaFolder className="w-4 h-4 text-[var(--gray-11)] flex-shrink-0" />
                        <span className="truncate">{displayPath}</span>
                      </div>
                      <FaChevronDown
                        className={`w-3 h-3 transition-transform ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <NestedFolderDropdown
                        folders={folderTree}
                        selectedPath={field.value || ''}
                        onSelect={(path) => {
                          field.onChange(path);
                          setIsDropdownOpen(false);
                        }}
                        onClose={() => setIsDropdownOpen(false)}
                      />
                    )}
                  </div>
                );
              }}
            />
            <p className="text-xs text-[var(--gray-9)] mt-1">
              Choose a parent folder to create a subfolder (max 5 levels deep)
            </p>
          </div>

          <div className="p-3 bg-[var(--accent-2)] border border-[var(--accent-5)] rounded-lg">
            <p className="text-xs sm:text-sm text-[var(--accent-11)]">
              <span className="font-bold">Tip:</span> Folder names should be descriptive and follow
              your organization system. Maximum nesting depth is 5 levels.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sm:mt-6 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            type="button"
            onClick={() => setShowCreateDialog(false)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--gray-3)] text-[var(--gray-11)] hover:bg-[var(--gray-4)] font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={createForm.handleSubmit(handleCreateSubmit)}
            disabled={isCreating}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </DialogWrapper>

      {/* Edit Folder Dialog */}
      <DialogWrapper
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        title="Rename Folder"
        description={`Change the name of "${
          selectedFolder ? formatFolderPath(selectedFolder) : ''
        }". The folder path and any subfolders will be updated automatically.`}
        width="min(90vw, 450px)"
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6">
          <div>
            <label className="block text-sm font-bold text-[var(--gray-12)] mb-2">
              New Folder Name
            </label>
            <input
              {...editForm.register('new_name', {
                required: 'Folder name is required',
                minLength: { value: 1, message: 'Folder name must not be empty' },
                pattern: {
                  value: /^[a-zA-Z0-9._\- ]+$/,
                  message: 'Only letters, numbers, dots, hyphens, underscores and spaces allowed',
                },
              })}
              type="text"
              placeholder="Enter new folder name"
              className="w-full px-3 py-2.5 sm:py-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent text-base sm:text-sm"
            />
          </div>

          <div className="p-3 bg-[var(--orange-2)] border border-[var(--orange-5)] rounded-lg">
            <p className="text-xs sm:text-sm text-[var(--orange-11)]">
              <span className="font-bold">Warning:</span> Renaming this folder will affect any email
              filters or rules that reference this folder name.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sm:mt-6 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            type="button"
            onClick={() => setShowEditDialog(false)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--gray-3)] text-[var(--gray-11)] hover:bg-[var(--gray-4)] font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={editForm.handleSubmit(handleEditSubmit)}
            disabled={isEditing}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Renaming...' : 'Rename Folder'}
          </button>
        </div>
      </DialogWrapper>

      {/* Delete Confirmation Dialog */}
      <DialogWrapper
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Folder"
        description={`Are you sure you want to permanently delete "${
          selectedFolder ? formatFolderPath(selectedFolder) : ''
        }"?`}
        width="min(90vw, 500px)"
      >
        <div className="p-4 sm:p-6">
          <div className="p-4 bg-[var(--red-2)] border border-[var(--red-5)] rounded-lg">
            <p className="text-sm text-[var(--red-11)]">
              <span className="font-bold">This action cannot be undone.</span> All emails in this
              folder will be permanently deleted. Any subfolders will also be removed.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <button
            type="button"
            onClick={() => setShowDeleteDialog(false)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--gray-3)] text-[var(--gray-11)] hover:bg-[var(--gray-4)] font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDeleteFolder}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--red-9)] hover:bg-[var(--red-10)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </DialogWrapper>
    </>
  );
};

export default FolderDialogs;
