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

// utils/folderUtils.ts
export interface FolderNode {
  name: string;
  path: string;
  flags: string[];
  delimiter: string;
  children: FolderNode[];
  unread_count: number;
}

export const buildFolderTree = (
  folders: Array<{
    flags: string[];
    delimiter: string;
    folder_name: string;
    unread_count: number;
  }>
): FolderNode[] => {
  const root: FolderNode[] = [];
  const map = new Map<string, FolderNode>();

  folders.forEach((folder) => {
    const node: FolderNode = {
      name: folder.folder_name.split(folder.delimiter).pop() || folder.folder_name,
      path: folder.folder_name,
      flags: folder.flags,
      delimiter: folder.delimiter,
      children: [],
      unread_count: folder.unread_count,
    };
    map.set(folder.folder_name, node);
  });

  folders.forEach((folder) => {
    const node = map.get(folder.folder_name)!;
    const parts = folder.folder_name.split(folder.delimiter);

    if (parts.length > 1) {
      // This is a child folder
      const parentPath = parts.slice(0, -1).join(folder.delimiter);
      const parent = map.get(parentPath);

      if (parent) {
        parent.children.push(node);
        parent.children.sort((a, b) => a.name.localeCompare(b.name));
        return;
      }
    }

    // This is a root folder
    root.push(node);
  });

  return root.sort((a, b) => a.name.localeCompare(b.name));
};

// src/utils/sortUtils.ts
export const sortFoldersAscending = <T extends { name?: string; displayName?: string }>(
  folders: T[]
) => {
  return [...folders].sort((a, b) => {
    const nameA = (a.name || a.displayName || '').toLowerCase();
    const nameB = (b.name || b.displayName || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
};
