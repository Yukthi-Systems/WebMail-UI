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
import { FaPen, FaPlus, FaShield, FaTrash } from 'react-icons/fa6';
import { useFoldersFullPath } from '../../../hooks/useFolders';
import {
  useCreateEmailFolder,
  useDeleteEmailFolder,
  useEditEmailFolder,
} from '../../../hooks/useEmails';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../../state/settings';
import { useToast } from '../../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import FolderTable from './FolderTable';
import FolderDialogs from './FolderDialoge';
import ACLManager from './ACLManager';
import { useSettingsBridge } from '../../../hooks/useSettingsBridge';

interface FolderSettings {
  [folder_name: string]: {
    show_in_sidebar: boolean;
    quota?: number;
    description?: string;
  };
}

interface CreateFolderForm {
  folder_name: string;
  parent_folder?: string;
}

interface EditFolderForm {
  new_name: string;
}

const Folders = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const userSettings = useAtomValue(userSettingsAtom);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showACLDialog, setShowACLDialog] = useState(false);

  // Selected folder state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderSettings, setFolderSettings] = useState<FolderSettings>({});

  // API hooks
  const { data: folderData, isLoading, refetch } = useFoldersFullPath();
  const { mutate: createFolder, isPending: isCreating } = useCreateEmailFolder();
  const { mutate: deleteFolder, isPending: isDeleting } = useDeleteEmailFolder();
  const { mutate: editFolder, isPending: isEditing } = useEditEmailFolder();
  const { updateSettings } = useSettingsBridge();

  useEffect(() => {
    if (userSettings?.folders) {
      setFolderSettings(userSettings?.folders);
    }
  }, [userSettings]);

  // FolderDetail's flags/delimiter are optional (server-side type), but every
  // real IMAP folder listing includes them — normalize once here so the child
  // components below (which all declare their own required-field FolderFromAPI)
  // don't each need their own fallback.
  const folders = (folderData?.folders || []).map((f) => ({
    ...f,
    flags: f.flags ?? [],
    delimiter: f.delimiter ?? '.',
  }));

  // --- 1. Event Handlers ---

  const handleSidebarToggle = async (folderName: string, showInSidebar: boolean) => {
    try {
      await updateSettings((prev) => {
        const currentFolders = prev.folders || {};

        return {
          folders: {
            ...currentFolders,
            [folderName]: {
              ...(currentFolders[folderName] || {}),
              show_in_sidebar: showInSidebar,
            },
          },
        };
      });

      toast.success({
        description: `Folder ${showInSidebar ? 'added to' : 'removed from'} sidebar`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error({ description: `Failed to update folder visibility: ${message}` });
    }
  };

  const handleCreateFolder = (data: CreateFolderForm) => {
    let delimiter = '.';
    if (data.parent_folder) {
      const parent = folders.find((f) => f.folder_name === data.parent_folder);
      if (parent?.delimiter) delimiter = parent.delimiter;
    }

    const folderPath = data.parent_folder
      ? `${data.parent_folder}${delimiter}${data.folder_name}`
      : data.folder_name;

    createFolder(
      { path: folderPath },
      {
        onSuccess: () => {
          toast.success({ description: 'Folder created successfully' });
          setShowCreateDialog(false);
          refetch();
          queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
        },
        onError: (error) => {
          toast.error({ description: `Failed to create folder: ${error.message}` });
        },
      }
    );
  };

  const handleEditFolder = (data: EditFolderForm) => {
    if (!selectedFolder) return;

    const folder = folders.find((f) => f.folder_name === selectedFolder);
    const delimiter = folder?.delimiter || '.';

    const pathParts = selectedFolder.split(delimiter);
    pathParts[pathParts.length - 1] = data.new_name;
    const newPath = pathParts.join(delimiter);

    editFolder(
      { oldpath: selectedFolder, newpath: newPath },
      {
        onSuccess: () => {
          toast.success({ description: 'Folder renamed successfully' });
          setShowEditDialog(false);
          setSelectedFolder(null);
          refetch();
          queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
        },
        onError: (error) => {
          toast.error({ description: `Failed to rename folder: ${error.message}` });
        },
      }
    );
  };

  const handleDeleteFolder = () => {
    if (!selectedFolder) return;

    deleteFolder(
      { path: selectedFolder },
      {
        onSuccess: () => {
          toast.success({ description: 'Folder deleted successfully' });
          setShowDeleteDialog(false);
          setSelectedFolder(null);
          refetch();
          queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
        },
        onError: (error) => {
          toast.error({ description: `Failed to delete folder: ${error.message}` });
        },
      }
    );
  };

  // Table event handlers
  const handleEditFolderClick = (folderName: string) => {
    setSelectedFolder(folderName);
    setShowEditDialog(true);
  };

  const handleDeleteFolderClick = (folderName: string) => {
    setSelectedFolder(folderName);
    setShowDeleteDialog(true);
  };

  const handleManageACL = (folderName: string) => {
    setSelectedFolder(folderName);
    setShowACLDialog(true);
  };

  const parentFolders = folders;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-4 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-base text-[var(--gray-11)]">Loading folders...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state when no folders exist
  if (!isLoading && folders.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <FolderDialogs
          showCreateDialog={showCreateDialog}
          setShowCreateDialog={setShowCreateDialog}
          onCreateFolder={handleCreateFolder}
          isCreating={isCreating}
          parentFolders={parentFolders}
          showEditDialog={showEditDialog}
          setShowEditDialog={setShowEditDialog}
          onEditFolder={handleEditFolder}
          isEditing={isEditing}
          selectedFolder={selectedFolder}
          showDeleteDialog={showDeleteDialog}
          setShowDeleteDialog={setShowDeleteDialog}
          onDeleteFolder={handleDeleteFolder}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Header Section */}
        <div className="bg-[var(--color-surface)] rounded-lg p-4 sm:p-6 border border-[var(--gray-5)]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--gray-12)] mb-1">
                Folder Management
              </h1>
              <p className="text-sm sm:text-base text-[var(--gray-11)]">
                Organize your email folders, control sidebar visibility, and manage access
                permissions
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <FaPlus size={14} />
              <span className="text-sm sm:text-base">Create Folder</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <FolderTable
            folders={folders}
            folderSettings={folderSettings}
            onSidebarToggle={handleSidebarToggle}
            onEditFolder={handleEditFolderClick}
            onDeleteFolder={handleDeleteFolderClick}
            onManageACL={handleManageACL}
          />
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden">
          <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--gray-5)] overflow-hidden">
            <div className="p-4 border-b border-[var(--gray-5)] bg-[var(--gray-1)]">
              <h2 className="text-lg font-semibold text-[var(--gray-12)]">
                Folders ({folders.length})
              </h2>
            </div>
            <div className="divide-y divide-[var(--gray-5)]">
              {folders.map((folder) => {
                const showInSidebar = folderSettings[folder.folder_name]?.show_in_sidebar !== false;

                const isRootSystemFolder =
                  (['Trash', 'Sent', 'Drafts', 'Junk'].some((flag) =>
                    folder.flags.includes(flag)
                  ) ||
                    folder.folder_name === 'INBOX') &&
                  !folder.folder_name.includes(folder.delimiter || '.');

                return (
                  <div key={folder.folder_name} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--gray-12)] truncate mb-1">
                          {folder.folder_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-[var(--gray-3)] text-[var(--gray-11)]">
                            {folder.flags.join(', ') || 'Custom'}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              showInSidebar
                                ? 'bg-[var(--green-3)] text-[var(--green-11)]'
                                : 'bg-[var(--gray-4)] text-[var(--gray-11)]'
                            }`}
                          >
                            {showInSidebar ? 'In Sidebar' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      {/* Sidebar Toggle */}
                      <div className="flex items-center justify-between py-2 px-3 bg-[var(--gray-1)] rounded-lg">
                        <span className="text-sm font-medium text-[var(--gray-11)]">
                          Show in Sidebar
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showInSidebar}
                            onChange={(e) =>
                              handleSidebarToggle(folder.folder_name, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[var(--gray-6)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-9)]"></div>
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Rename */}
                        {!isRootSystemFolder ? (
                          <button
                            onClick={() => handleEditFolderClick(folder.folder_name)}
                            className="flex items-center justify-center px-3 py-2 text-[var(--accent-11)] bg-[var(--accent-3)] hover:bg-[var(--accent-4)] rounded-lg transition-colors border border-[var(--accent-6)]"
                            title="Edit folder"
                          >
                            <FaPen size={14} />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center px-3 py-2 text-[var(--gray-8)] bg-[var(--gray-3)] rounded-lg border border-[var(--gray-5)] opacity-50 cursor-not-allowed">
                            <FaPen size={14} />
                          </div>
                        )}

                        {/* ACL */}
                        <button
                          onClick={() => handleManageACL(folder.folder_name)}
                          className="flex items-center justify-center px-3 py-2 text-[var(--blue-11)] bg-[var(--blue-3)] hover:bg-[var(--blue-4)] rounded-lg transition-colors border border-[var(--blue-6)]"
                          title="Manage permissions"
                        >
                          <FaShield size={14} />
                        </button>

                        {/* Delete */}
                        {!isRootSystemFolder ? (
                          <button
                            onClick={() => handleDeleteFolderClick(folder.folder_name)}
                            className="flex items-center justify-center px-3 py-2 text-[var(--red-11)] bg-[var(--red-3)] hover:bg-[var(--red-4)] rounded-lg transition-colors border border-[var(--red-6)]"
                            title="Delete folder"
                          >
                            <FaTrash size={14} />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center px-3 py-2 text-[var(--gray-8)] bg-[var(--gray-3)] rounded-lg border border-[var(--gray-5)] opacity-50 cursor-not-allowed">
                            <FaTrash size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dialogs & ACL */}
        <FolderDialogs
          showCreateDialog={showCreateDialog}
          setShowCreateDialog={setShowCreateDialog}
          onCreateFolder={handleCreateFolder}
          isCreating={isCreating}
          parentFolders={parentFolders}
          showEditDialog={showEditDialog}
          setShowEditDialog={setShowEditDialog}
          onEditFolder={handleEditFolder}
          isEditing={isEditing}
          selectedFolder={selectedFolder}
          showDeleteDialog={showDeleteDialog}
          setShowDeleteDialog={setShowDeleteDialog}
          onDeleteFolder={handleDeleteFolder}
          isDeleting={isDeleting}
        />

        {selectedFolder && (
          <ACLManager
            folderPath={selectedFolder}
            isOpen={showACLDialog}
            onClose={() => setShowACLDialog(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Folders;
