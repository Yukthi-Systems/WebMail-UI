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

import React, { useState, useMemo, useEffect } from 'react';
import { FaChevronDown, FaChevronRight, FaFolder, FaFolderOpen } from 'react-icons/fa6';
import type { FolderDetail } from '../../state/folders';

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  level: number;
}

interface NestedFolderSelectProps {
  folders: FolderDetail[];
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  className?: string;
}

// Build folder tree structure
const buildFolderTree = (folders: FolderDetail[]): FolderNode[] => {
  const folderMap = new Map<string, FolderNode>();
  const rootNodes: FolderNode[] = [];

  // Create nodes for all folders
  folders.forEach((folder) => {
    const folderPath = folder.path || folder.folder_name || folder.name;
    const parts = folderPath.split('.');
    const name = parts[parts.length - 1];

    const node: FolderNode = {
      name,
      path: folderPath,
      children: [],
      level: parts.length - 1,
    };

    folderMap.set(folderPath, node);
  });

  // Build hierarchy
  folders.forEach((folder) => {
    const folderPath = folder.path || folder.folder_name || folder.name;
    const node = folderMap.get(folderPath);
    if (!node) return;

    const parts = folderPath.split('.');
    if (parts.length === 1) {
      rootNodes.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('.');
      const parent = folderMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  });

  return rootNodes;
};

// Nested Folder Dropdown Component
const NestedFolderDropdown: React.FC<{
  folders: FolderNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}> = ({ folders, selectedPath, onSelect, onClose }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleExpanded = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleSelect = (path: string) => {
    onSelect(path);
    onClose();
  };

  const renderFolderItem = (folder: FolderNode) => {
    const isExpanded = expandedFolders.has(folder.path);
    const isSelected = selectedPath === folder.path;
    const hasChildren = folder.children.length > 0;

    return (
      <div key={folder.path}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
            hover:bg-[var(--gray-3)] text-sm
            ${isSelected ? 'bg-[var(--accent-3)] text-[var(--accent-11)]' : 'text-[var(--gray-12)]'}
          `}
          style={{ paddingLeft: `${12 + folder.level * 16}px` }}
          onClick={() => handleSelect(folder.path)}
        >
          {hasChildren ? (
            <button
              className="flex items-center justify-center w-4 h-4 hover:bg-[var(--gray-4)] rounded transition-colors"
              onClick={(e) => toggleExpanded(folder.path, e)}
            >
              {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}

          {hasChildren ? (
            isExpanded ? (
              <FaFolderOpen size={14} />
            ) : (
              <FaFolder size={14} />
            )
          ) : (
            <FaFolder size={14} />
          )}

          <span className="flex-1 truncate">{folder.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div>{folder.children.map((child) => renderFolderItem(child))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
      {folders.map((folder) => renderFolderItem(folder))}
    </div>
  );
};

export const NestedFolderSelect: React.FC<NestedFolderSelectProps> = ({
  folders,
  value,
  onChange,
  placeholder = 'Select folder',
  className = '',
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Reverse the folders array
  const reversedFolders = useMemo(() => {
    if (!Array.isArray(folders) || folders.length === 0) return [];
    return [...folders].reverse();
  }, [folders]);

  const folderTree = useMemo(() => {
    if (reversedFolders.length === 0) return [];
    return buildFolderTree(reversedFolders);
  }, [reversedFolders]);

  // Set default value to first folder if no value is set
  useEffect(() => {
    if (!value && reversedFolders.length > 0) {
      const firstFolder = reversedFolders[0];
      const firstPath = firstFolder.path || firstFolder.folder_name || firstFolder.name;
      if (firstPath) {
        onChange(firstPath);
      }
    }
  }, [value, reversedFolders, onChange]);

  // Format folder path for display (convert dots to slashes)
  const formatFolderPath = (path: string) => {
    if (!path) return placeholder;
    return path.replace(/\./g, '/');
  };

  // Find the selected folder name
  const getDisplayValue = () => {
    if (!value) return placeholder;
    const selectedFolder = reversedFolders.find(
      (f) => (f.path || f.folder_name || f.name) === value
    );
    if (selectedFolder) {
      return formatFolderPath(value);
    }
    return formatFolderPath(value);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--gray-1)] border border-[var(--gray-6)] rounded-md text-[var(--gray-12)] hover:bg-[var(--gray-2)] hover:border-[var(--gray-7)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] focus:border-transparent transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FaFolder className="w-4 h-4 text-[var(--gray-11)] flex-shrink-0" />
          <span className={`truncate text-sm ${!value ? 'text-[var(--gray-9)]' : ''}`}>
            {getDisplayValue()}
          </span>
        </div>
        <FaChevronDown
          className={`w-3 h-3 text-[var(--gray-11)] transition-transform flex-shrink-0 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isDropdownOpen && folderTree.length > 0 && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
          <NestedFolderDropdown
            folders={folderTree}
            selectedPath={value}
            onSelect={(path) => {
              onChange(path);
              setIsDropdownOpen(false);
            }}
            onClose={() => setIsDropdownOpen(false)}
          />
        </>
      )}
    </div>
  );
};
