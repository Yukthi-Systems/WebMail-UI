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

// components/email/search/FolderSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaFolder,
  FaFolderOpen,
  FaChevronRight,
} from 'react-icons/fa6';
import { useFoldersDropdown } from '../../../../hooks/useFolders';
import type { FolderNode } from '../../../../utils/folderUtils';

interface FolderSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

const FolderSelect: React.FC<FolderSelectProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const selectRef = useRef<HTMLDivElement>(null);
  const { data: folders = [] } = useFoldersDropdown();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpanded = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) newSet.delete(path);
      else newSet.add(path);
      return newSet;
    });
  };

  const handleSelect = (path: string) => {
    onChange(path);
    setIsOpen(false);
  };

  const getFolderName = (path: string) => {
    if (!path || path === 'INBOX') return 'Inbox';
    return path.split('.').pop() || path;
  };

  const renderFolderItem = (folder: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const isSelected = value === folder.path;
    const hasChildren = folder.children && folder.children.length > 0;
    const isDisabled = folder.unread_count < 0;

    return (
      <div key={folder.path}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 text-xs transition-colors
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--gray-3)]'}
            ${isSelected && !isDisabled ? 'bg-[var(--accent-3)] text-[var(--accent-11)]' : 'text-[var(--gray-12)]'}
          `}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (isDisabled) return;
            handleSelect(folder.path);
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="flex items-center justify-center w-4 h-4 rounded hover:bg-[var(--gray-4)] transition-colors text-[var(--gray-11)]"
              onClick={(e) => toggleExpanded(folder.path, e)}
            >
              {isExpanded ? <FaChevronDown size={8} /> : <FaChevronRight size={8} />}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          {hasChildren && isExpanded ? (
            <FaFolderOpen size={12} className="text-[var(--accent-9)]" />
          ) : (
            <FaFolder size={12} className="text-[var(--accent-9)]" />
          )}
          <span className="flex-1 truncate">{folder.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>{folder.children.map((child) => renderFolderItem(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--gray-6)] rounded text-xs text-[var(--gray-12)] flex items-center justify-between hover:border-[var(--gray-7)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-8)] focus:border-[var(--accent-8)] transition-all"
      >
        <span className="truncate text-left flex items-center gap-2">
          {value === 'INBOX' || value === '' ? (
            <>
              <FaFolder size={12} className="text-[var(--accent-9)]" />
              <span>Inbox</span>
            </>
          ) : (
            <>
              <FaFolder size={12} className="text-[var(--accent-9)]" />
              <span>{getFolderName(value)}</span>
            </>
          )}
        </span>
        {isOpen ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded shadow-lg z-[10000] max-h-48 overflow-y-auto">
          {folders.length > 0 ? (
            folders.map((folder) => renderFolderItem(folder))
          ) : (
            <div className="px-3 py-2 text-xs text-[var(--gray-10)] text-center">
              No custom folders
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FolderSelect;
