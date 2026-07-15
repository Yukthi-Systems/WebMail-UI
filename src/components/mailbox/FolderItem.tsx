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

import { FaRegFolder, FaRegFolderOpen } from 'react-icons/fa6';
import { Link, useParams } from '@tanstack/react-router';
import type { IconType } from 'react-icons/lib';
import { useState, useMemo } from 'react';

interface FolderItemProps {
  folderPath: string;
  displayName: string;
  icon?: IconType;
  onFolderClick?: () => void;
  count?: number;
  isCollapsed?: boolean;
  level?: number;
  px?: string;
  onDrop?: (folderPath: string) => void;
  isDragging?: boolean;
  discription?: string;
  showCount?: boolean;
  showLabel?: boolean;
  leftSlot?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const FolderItem = ({
  folderPath,
  displayName,
  icon,
  onFolderClick,
  count,
  isCollapsed = false,
  level = 0,
  px = '3',
  onDrop,
  isDragging = false,
  discription = '',
  showCount = true,
  showLabel = true,
  leftSlot,
  className = '',
  disabled = false,
}: FolderItemProps) => {
  const { slug, folder: currentFolder } = useParams({ strict: false });
  // Decode currentFolder from URL to match against folderPath if needed
  const isActive =
    currentFolder === folderPath ||
    (currentFolder && decodeURIComponent(currentFolder) === folderPath);

  const [isHovered, setIsHovered] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const hasNoPadding = px === '1';
  const isSystemFolder = count === -1;

  // --- ADDED: Safe Decoding Logic ---
  const decodedDisplayName = useMemo(() => {
    try {
      return decodeURIComponent(displayName);
    } catch (e) {
      // Fallback to original if decoding fails (e.g. malformed URI)
      return displayName;
    }
  }, [displayName]);
  // ----------------------------------

  const getIcon = () => {
    if (icon) return icon;
    return isActive || (isHovered && !disabled) ? FaRegFolderOpen : FaRegFolder;
  };

  const IconComponent = getIcon();

  // Drag and drop handlers - disabled for system folders
  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || isSystemFolder || !isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled || isSystemFolder) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled || isSystemFolder) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    if (onDrop) {
      onDrop(folderPath);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isSystemFolder) {
      e.preventDefault();
      return;
    }
    if (onFolderClick) {
      onFolderClick();
    }
  };

  const handleMouseEnter = () => {
    if (!disabled && !isSystemFolder) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled && !isSystemFolder) {
      setIsHovered(false);
    }
  };

  return (
    <div
      className={`relative ${className} ${disabled || isSystemFolder ? 'cursor-not-allowed' : ''}`}
      style={{ marginLeft: `${level * 16}px` }}
    >
      {disabled || isSystemFolder ? (
        <div
          className="no-underline block w-full"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          /* UPDATED: Use decoded name for title */
          title={isCollapsed ? decodedDisplayName : ''}
          tabIndex={-1}
        >
          <div
            className={`
              flex items-center gap-2 py-1 rounded-sm relative overflow-hidden
              ${isCollapsed ? 'justify-center px-2' : `px-${px}`}
              ${hasNoPadding ? 'cursor-not-allowed' : 'cursor-not-allowed'}
              opacity-60
            `}
          >
            <IconComponent size={16} className="text-[var(--gray-8)] flex-shrink-0" />

            {!isCollapsed && (
              <>
                <div className="flex-1 text-sm truncate text-[var(--gray-8)]">
                  {showLabel && (
                    <>
                      {/* UPDATED: Use decoded name for display */}
                      <span>{decodedDisplayName}</span>
                      {/* {discription && (
                        <p className="text-[9px] text-[var(--gray-7)] font-medium truncate">
                          {discription}
                        </p>
                      )} */}
                    </>
                  )}
                </div>

                {showCount && count !== undefined && count > 0 && (
                  <div
                    className={`
                      flex items-center justify-center
                      h-5 min-w-[1.25rem] px-1.5 ml-2
                      rounded-full
                      text-xs font-semibold text-nowrap
                      transition-all duration-150
                      group-hover:-translate-x-8
                      ${
                        isActive
                          ? 'bg-[var(--accent-9)] text-white'
                          : isOver && isDragging
                            ? 'bg-[var(--accent-9)] text-white'
                            : 'bg-[var(--gray-6)] text-[var(--gray-12)]'
                      }
                    `}
                  >
                    {count}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <Link
          to={slug ? '/$slug/folder/$folder' : '/folder/$folder'}
          params={slug ? { slug, folder: folderPath } : { folder: folderPath }}
          onClick={handleClick}
          className="no-underline block w-full"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          /* UPDATED: Use decoded name for title */
          title={isCollapsed ? decodedDisplayName : ''}
          data-folder-item
          tabIndex={0}
        >
          <div
            className={`
              flex items-center gap-2 py-1 rounded-lg cursor-pointer transition-all duration-150 ease-out relative overflow-hidden
              ${isCollapsed ? 'justify-center px-2' : `px-${px}`}
              ${
                hasNoPadding
                  ? isActive
                    ? 'font-bold text-[var(--accent-9)]'
                    : isHovered
                      ? 'bg-[var(--gray-3)]'
                      : ''
                  : isActive
                    ? 'bg-[var(--accent-3)] border border-[var(--accent-6)]'
                    : isHovered
                      ? 'bg-[var(--gray-3)] border border-transparent'
                      : 'bg-transparent border border-transparent'
              }
              ${isOver && isDragging ? 'bg-[var(--accent-4)] ring-2 ring-[var(--accent-9)] ring-inset scale-[1.02]' : ''}
              ${isDragging && !isOver ? 'transition-transform duration-200' : ''}
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-9)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gray-1)]
            `}
          >
            {/* Active indicator bar */}
            {isActive && !hasNoPadding && !isCollapsed && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent-9)] rounded-r-sm" />
            )}

            {/* New Left Slot (Chevron) */}
            {leftSlot && !isCollapsed && (
              <div className="flex-shrink-0 flex items-center justify-center text-[var(--gray-10)]">
                {leftSlot}
              </div>
            )}

            <IconComponent
              size={16}
              className={`
                transition-colors duration-150 flex-shrink-0
                ${isActive ? 'text-[var(--accent-11)]' : isOver && isDragging ? 'text-[var(--accent-11)]' : 'text-[var(--gray-11)]'}
              `}
            />

            {!isCollapsed && (
              <>
                <div
                  className={`
                    flex-1 transition-colors duration-150 text-sm truncate
                    ${
                      hasNoPadding && isActive
                        ? 'text-[var(--accent-11)] font-bold'
                        : isActive
                          ? 'text-[var(--accent-12)] font-medium'
                          : isOver && isDragging
                            ? 'text-[var(--accent-11)] font-medium'
                            : 'text-[var(--gray-12)]'
                    }
                  `}
                >
                  {showLabel && (
                    <>
                      {/* UPDATED: Use decoded name for display */}
                      <span>{decodedDisplayName}</span>
                      {/* {discription && (
                        <p className="text-[9px] text-[var(--gray-9)] font-medium truncate">
                          {discription}
                        </p>
                      )} */}
                    </>
                  )}
                </div>

                {showCount && count !== undefined && count > 0 && (
                  <div
                    className={`
                      flex items-center justify-center
                      h-5 min-w-[1.25rem] px-1.5 ml-2
                      rounded-full
                      text-xs font-semibold text-nowrap
                      transition-all duration-150
                      group-hover:-translate-x-8
                      ${
                        isActive
                          ? 'bg-[var(--accent-9)] text-white'
                          : isOver && isDragging
                            ? 'bg-[var(--accent-9)] text-white'
                            : 'bg-[var(--gray-6)] text-[var(--gray-12)]'
                      }
                    `}
                  >
                    {count}
                  </div>
                )}
              </>
            )}

            {/* Drop indicator overlay */}
            {isOver && isDragging && (
              <div className="absolute inset-0 bg-[var(--accent-9)] opacity-10 pointer-events-none" />
            )}
          </div>
        </Link>
      )}
    </div>
  );
};

export default FolderItem;
