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

// components/common/FolderDropdownWrapper.tsx
import { DropdownMenu } from '@radix-ui/themes';
import { type ReactNode } from 'react';

export interface DropdownItem {
  key: string;
  label?: string;
  selected?: boolean;
  onSelect?: () => void;
  children?: DropdownItem[];
  type?: string;
}

interface FolderDropdownWrapperProps {
  items: DropdownItem[];
  trigger: ReactNode;
  className?: string;
}

const FolderDropdownWrapper = ({ items, trigger, className }: FolderDropdownWrapperProps) => {
  const renderItem = (item: DropdownItem, level = 0) => {
    if (item.type === 'separator') {
      return <DropdownMenu.Separator key={item.key} />;
    }

    // Add padding to create indentation for nested items
    const paddingStyle = { paddingLeft: `${level * 20 + 12}px` };

    if (item.children) {
      return (
        <DropdownMenu.Sub key={item.key}>
          <DropdownMenu.SubTrigger
            style={paddingStyle}
            onSelect={(e) => {
              // Prevent default to allow custom selection
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Select the parent folder when clicked
              if (item.onSelect) {
                item.onSelect();
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <span>{item.label || '-'}</span>
              {/* <span className="ml-2 text-gray-500">›</span> */}
            </div>
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            {/* First, add a selectable item for the parent folder itself */}
            {/* <DropdownMenu.Item
              style={paddingStyle}
              onSelect={(e) => {
                e.preventDefault();
                if (item.onSelect) {
                  item.onSelect();
                }
              }}
              className={item.selected ? 'bg-accent' : ''}
            >
              {/* {item.label || "-"} 
            </DropdownMenu.Item> */}
            {/* Then render all children with increased indentation */}
            {item.children.map((child) => renderItem(child, level + 1))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      );
    }

    return (
      <DropdownMenu.Item
        key={item.key}
        onSelect={item.onSelect}
        style={paddingStyle}
        className={item.selected ? 'bg-accent' : ''}
      >
        {item.label}
      </DropdownMenu.Item>
    );
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Content className={className}>
        {items.map((item) => renderItem(item))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default FolderDropdownWrapper;
