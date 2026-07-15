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

import { Button, Flex, Box } from '@radix-ui/themes';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa6';
import FolderItem from './FolderItem';
import DropdownWrapper, { type DropdownItem } from '../common/DropdownWrapper';
import type { IconType } from 'react-icons/lib';
import { FaEllipsisH } from 'react-icons/fa';

interface FolderRowProps {
  folderPath: string;
  displayName: string;
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  onFolderClick?: () => void;
  menuItems?: DropdownItem[];
  icon?: IconType;
  // Drag and Drop props
  isDragging?: boolean;
  onDrop?: (folderPath: string) => void;
  // Hover/Interaction states managed by parent or internal if simple
  className?: string;
  folderPops?: any; // For passing specific folder config like counts/labels
  isSidebarCollapsed?: boolean;
}

const FolderRow = ({
  folderPath,
  displayName,
  level,
  isExpanded,
  hasChildren,
  onToggleExpand,
  onFolderClick,
  menuItems,
  icon,
  isDragging = false,
  onDrop,
  folderPops,
  isSidebarCollapsed = false,
}: FolderRowProps) => {
  const isSystemFolder = folderPops?.unread_count === -1;
  const isOver = false;

  // Drag handlers specifically for the row wrapper
  const handleDragOver = (e: React.DragEvent) => {
    if (!isDragging || isSystemFolder) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDrop && !isSystemFolder) onDrop(folderPath);
  };

  return (
    <Box
      className={`relative group transition-all duration-200`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Flex align="center" gap="0" className="relative">
        {/* Indentation */}
        <Box style={{ width: `${level * 20}px` }} className="flex-shrink-0" />

        {/* Chevron */}
        {!isSidebarCollapsed && (
          <Box className="w-5 h-5 flex-shrink-0 mt-2 flex justify-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="1"
                className={`w-4 h-4 p-0 rounded border-0 bg-transparent ${isSystemFolder ? 'text-[var(--gray-8)] ' : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]'} flex items-center justify-center`}
                onClick={onToggleExpand}
              >
                {isExpanded ? <FaChevronDown size={8} /> : <FaChevronRight size={8} />}
              </Button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </Box>
        )}

        {/* Folder Content */}
        <Box className="flex-1 min-w-0">
          <FolderItem
            folderPath={folderPath}
            displayName={displayName}
            icon={icon}
            onFolderClick={isSystemFolder ? undefined : onFolderClick}
            px="1"
            onDrop={onDrop}
            isDragging={isDragging}
            // Pass through counts/labels if available
            count={folderPops?.unread_count}
            showCount={folderPops?.show_unread_count !== false}
            showLabel={folderPops?.show_label !== false}
            disabled={isSystemFolder}
          />
        </Box>

        {/* Context Menu - Hidden for system folders */}
        {!isSystemFolder && menuItems && menuItems.length > 0 && (
          <Box
            className={`
              absolute right-2 top-[68%] -translate-y-1/2 z-50 transition-opacity duration-200
              ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100'}
            `}
          >
            <DropdownWrapper
              items={menuItems}
              trigger={
                <Button
                  variant="ghost"
                  size="1"
                  className="transition-colors duration-200 hover:bg-[var(--gray-3)] focus:bg-[var(--gray-3)] active:bg-[var(--gray-4)] border-0 rounded-md min-w-0 p-1"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <FaEllipsisH size={12} />
                </Button>
              }
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default FolderRow;
