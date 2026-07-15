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
import { useFoldersFullPath } from '../../../hooks/useFolders';
import {
  FaFolder,
  FaInbox,
  FaRegFolder,
  FaTrash,
  FaTriangleExclamation,
  FaChevronRight,
  FaChevronDown,
} from 'react-icons/fa6';
import { FaFileAlt, FaTelegramPlane } from 'react-icons/fa';
import { MdOutlineRefresh } from 'react-icons/md';
import FolderSelectField from '../../composer/FolderSelectField';

interface Folder {
  flags: string[];
  delimiter: string;
  folder_name: string;
  unread_count: number;
}

interface ApiResponse {
  message: string;
  folders: Folder[];
}

interface TreeNode {
  id: string;
  name: string;
  fullPath: string;
  folder: Folder;
  children: TreeNode[];
  level: number;
  hasChildren: boolean;
  isExpanded?: boolean;
}

// Special flags that can be moved
const SPECIAL_FLAGS = ['Trash', 'Drafts', 'Sent', 'Junk', 'INBOX'];

const FolderManager: React.FC = () => {
  const { data: folderData, isLoading, refetch } = useFoldersFullPath();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<string>('');
  const [targetFolder, setTargetFolder] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (folderData) {
      setData(folderData);
    }
  }, [folderData]);

  const buildFolderTree = (): TreeNode[] => {
    if (!data) return [];

    const folders = [...data.folders].sort((a, b) => a.folder_name.localeCompare(b.folder_name));
    const rootNodes: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();

    folders.forEach((folder) => {
      const node: TreeNode = {
        id: folder.folder_name,
        name: folder.folder_name.split(folder.delimiter).pop() || folder.folder_name,
        fullPath: folder.folder_name,
        folder: folder,
        children: [],
        level: 0,
        hasChildren: false,
      };
      nodeMap.set(folder.folder_name, node);
    });

    folders.forEach((folder) => {
      const node = nodeMap.get(folder.folder_name)!;
      const parts = folder.folder_name.split(folder.delimiter);

      if (parts.length === 1) {
        // Root level node
        rootNodes.push(node);
      } else {
        // Child node - find parent
        const parentPath = parts.slice(0, -1).join(folder.delimiter);
        const parentNode = nodeMap.get(parentPath);

        if (parentNode) {
          parentNode.children.push(node);
          parentNode.hasChildren = true;
          parentNode.children.sort((a, b) => a.name.localeCompare(b.name));
          node.level = parentNode.level + 1;
        } else {
          // If parent doesn't exist, treat as root
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const FolderTreeNode: React.FC<{ node: TreeNode }> = ({ node }) => {
    const isExpanded = expandedFolders.has(node.fullPath);
    const hasActualChildren = node.children.length > 0;

    return (
      <div className="ml-4 my-3">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg  shadow-[0_3px_10px_rgb(0,0,0,0.2)] hover:bg-gray-50 cursor-pointer transition-colors ${
            node.level === 0 ? 'border-l-2 border-blue-500' : ''
          }`}
          onClick={() => toggleFolder(node.fullPath)}
        >
          {hasActualChildren ? (
            <button className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700">
              {isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
            </button>
          ) : (
            <div className="w-4 h-4"></div> // Spacer for alignment
          )}

          <span className="text-lg text-gray-600">{getFolderIcon(node.folder)}</span>

          <div className="flex-1 min-w-0 ">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-800 truncate">{node.name}</span>

              {node.folder.unread_count > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                  {node.folder.unread_count}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Delimiter: '{node.folder.delimiter}'
              </span>

              {node.folder.flags
                .filter((flag) => SPECIAL_FLAGS.includes(flag))
                .map((flag) => (
                  <span
                    key={flag}
                    className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300"
                  >
                    {flag}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {hasActualChildren && isExpanded && (
          <div className="border-l-2 border-gray-200 ml-2">
            {node.children.map((child) => (
              <FolderTreeNode key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const getAvailableFlags = (): string[] => {
    if (!data) return [];
    const allFlags = data.folders.flatMap((folder) => folder.flags);
    return SPECIAL_FLAGS.filter((flag) => allFlags.includes(flag));
  };

  const moveFlag = async () => {
    if (!selectedFlag || !targetFolder || !data) return;

    setIsMoving(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    setData((prevData) => {
      if (!prevData) return prevData;

      const newFolders = prevData.folders.map((folder) => {
        // Remove the flag from all folders
        const filteredFlags = folder.flags.filter((flag) => flag !== selectedFlag);

        // Add the flag to the target folder
        if (folder.folder_name === targetFolder && !filteredFlags.includes(selectedFlag)) {
          return {
            ...folder,
            flags: [...filteredFlags, selectedFlag],
          };
        }

        return {
          ...folder,
          flags: filteredFlags,
        };
      });

      return {
        ...prevData,
        folders: newFolders,
      };
    });

    // Reset selections
    setSelectedFlag('');
    setTargetFolder('');
    setIsMoving(false);
  };

  const hasFlag = (folder: Folder, flag: string): boolean => {
    return folder.flags.includes(flag);
  };

  const getFolderIcon = (folder: Folder) => {
    if (folder.flags.includes('Trash')) return <FaTrash />;
    if (folder.flags.includes('Sent')) return <FaTelegramPlane />;
    if (folder.flags.includes('Drafts')) return <FaFileAlt />;
    if (folder.flags.includes('Junk')) return <FaTriangleExclamation />;
    if (folder.folder_name === 'INBOX') return <FaInbox />;
    return folder.flags.includes('HasNoChildren') ? <FaFolder /> : <FaRegFolder />;
  };

  // Expand/Collapse all folders
  const toggleAllFolders = (expand: boolean) => {
    if (!data) return;

    if (expand) {
      // Expand all - get all folder paths
      const allPaths = data.folders.map((folder) => folder.folder_name);
      setExpandedFolders(new Set(allPaths));
    } else {
      // Collapse all
      setExpandedFolders(new Set());
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Folder Flag Manager</h1>
            <p className="text-gray-600">Loading folders...</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (no data)
  if (!data) {
    return (
      <div className="min-h-screen p-6">
        <div className="w-full mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Folder Flag Manager</h1>
            <p className="text-gray-600">Failed to load folders</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-gray-700 mb-4">Unable to load folder data</p>
              <button
                onClick={refetch}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const folderTree = buildFolderTree();

  return (
    <div className="min-h-screen p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-gray-800">Folder Flag Manager</h1>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
            >
              <MdOutlineRefresh />
              Refresh
            </button>
          </div>
          <p className="text-gray-600 text-left">
            Dynamically manage and organize your folder flags
          </p>
        </div>

        {/* Move Flag Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Move Special Flag</h2>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Flag to Move
              </label>
              <select
                value={selectedFlag}
                onChange={(e) => setSelectedFlag(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                disabled={isMoving}
              >
                <option value="">Choose a flag...</option>
                {getAvailableFlags().map((flag) => (
                  <option key={flag} value={flag} className="py-2">
                    {flag}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Folder</label>
              <FolderSelectField
                width="w-1/2"
                showText={false}
                folder={targetFolder}
                onChange={setTargetFolder}
              />
              {/* <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
                disabled={isMoving}
              >
                <option value="">Select destination...</option>
                {data.folders.map(folder => (
                  <option key={folder.folder_name} value={folder.folder_name} className="py-2">
                    {folder.folder_name}
                  </option>
                ))}
              </select> */}
            </div>

            <button
              onClick={moveFlag}
              disabled={!selectedFlag || !targetFolder || isMoving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2"
            >
              {isMoving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Moving...
                </>
              ) : (
                <>
                  <span>Move Flag</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Folder Tree Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Folder Tree Structure</h2>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAllFolders(true)}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={() => toggleAllFolders(false)}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 min-h-[400px]">
            {folderTree.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No folders found</div>
            ) : (
              folderTree.map((node) => <FolderTreeNode key={node.id} node={node} />)
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600 flex justify-between items-center">
            <span>Total folders: {data.folders.length}</span>
            <span>Delimiter: '{data.folders[0]?.delimiter || '/'}'</span>
          </div>
        </div>

        {/* Current Assignment Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Current Flag Assignments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {SPECIAL_FLAGS.map((flag) => {
              const folderWithFlag = data.folders.find((folder) => hasFlag(folder, flag));
              return (
                <div
                  key={flag}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-300 hover:border-blue-300 transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">{flag}</span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Assigned to:</span>
                    <div className="font-medium text-gray-800 mt-1 bg-white px-3 py-2 rounded-lg border border-gray-200">
                      {folderWithFlag ? (
                        <div className="flex items-center gap-2">
                          <span>{getFolderIcon(folderWithFlag)}</span>
                          <span className="capitalize">
                            {folderWithFlag.folder_name.toLowerCase()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-500">Not assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Total folders: {data.folders.length} • Special flags: {SPECIAL_FLAGS.length} • Last
            updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FolderManager;
