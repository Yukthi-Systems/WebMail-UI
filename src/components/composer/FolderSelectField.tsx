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

// components/FolderSelectField.tsx
import { Button, DropdownMenu, Skeleton } from '@radix-ui/themes';
import { useFoldersDropdown } from '../../hooks/useFolders';
import { useMemo } from 'react';
import type { FolderNode } from '../../utils/folderUtils';
import FolderDropdownWrapper from '../common/FolderDropdownWrapper';
import type { DropdownItem } from '../common/FolderDropdownWrapper';

type FolderSelectFieldProps = {
  folder: string;
  onChange: (folder: string) => void;
  trigger?: React.ReactNode;
  width?: string | number;
  showText?: boolean;
};

// Add function to check if folder is a default folder
const isDefaultFolder = (node: FolderNode): boolean => {
  const defaultFolderNames = ['inbox', 'sent', 'drafts', 'junk', 'trash'];
  return defaultFolderNames.includes(node.name.toLowerCase());
};

const FolderSelectField = ({
  folder,
  onChange,
  trigger,
  width,
  showText = true,
}: FolderSelectFieldProps) => {
  const { data: folderTree, isFetching } = useFoldersDropdown();

  const findFolderByPath = (node: FolderNode, path: string): FolderNode | null => {
    if (node.path === path) return node;
    for (const child of node.children) {
      const found = findFolderByPath(child, path);
      if (found) return found;
    }
    return null;
  };

  const selectedFolderName = useMemo(() => {
    if (!folder) return 'Select folder';

    if (folderTree && folderTree.length > 0) {
      for (const rootFolder of folderTree) {
        const found = findFolderByPath(rootFolder, folder);
        if (found) return found.name;
      }
    }

    return folder;
  }, [folder, folderTree]);

  // REMOVED: The logic that hid the component if no custom folders existed.
  // We want to show the dropdown even if only default folders exist.

  const renderDropdownItems = (nodes: FolderNode[]): DropdownItem[] => {
    // Separate default and custom folders
    const defaultFolders: FolderNode[] = [];
    const customFolders: FolderNode[] = [];

    nodes.forEach((node) => {
      if (isDefaultFolder(node)) {
        defaultFolders.push(node);
      } else {
        customFolders.push(node);
      }
    });

    // Create dropdown items for default folders
    const defaultItems: DropdownItem[] = defaultFolders.map((node) => ({
      key: node.path,
      label: node.name,
      selected: node.path === folder,
      onSelect: () => onChange(node.path),
      children: node.children.length > 0 ? renderDropdownItems(node.children) : undefined,
    }));

    // Create dropdown items for custom folders
    const customItems: DropdownItem[] = customFolders.map((node) => ({
      key: node.path,
      label: node.name,
      selected: node.path === folder,
      onSelect: () => onChange(node.path),
      children: node.children.length > 0 ? renderDropdownItems(node.children) : undefined,
    }));

    // Combine with separator only if there are custom folders
    if (customItems.length > 0) {
      return [
        ...defaultItems,
        { type: 'separator', key: 'separator' } as DropdownItem,
        ...customItems,
      ];
    }

    return defaultItems;
  };

  const dropdownItems = useMemo(() => {
    if (!folderTree || folderTree.length === 0) return [];

    return renderDropdownItems(folderTree);
  }, [folderTree, folder, onChange]);

  if (isFetching) {
    return (
      <div>
        <Skeleton width="120px" height="32px" />
      </div>
    );
  }

  const triggerElem = trigger || (
    <Button variant="soft" className={`${width ? width : 'min-w-[200px]'} justify-between`}>
      <span className="truncate">
        {showText && 'Save to:'} {selectedFolderName}
      </span>
      <DropdownMenu.TriggerIcon />
    </Button>
  );

  return (
    <div>
      <FolderDropdownWrapper
        items={dropdownItems}
        trigger={triggerElem}
        className="folder-select-field"
      />
    </div>
  );
};

export default FolderSelectField;
