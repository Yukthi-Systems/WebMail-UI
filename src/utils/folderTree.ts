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

// utils/folderTree.ts
export interface FolderNode {
  name: string;
  path: string;
  flags: string[];
  delimiter: string;
  children: FolderNode[];
  hasChildren: boolean;
  unread_count?: number;
  count?: number;
}

export const buildFolderTree = (folders: any[]): FolderNode[] => {
  const root: FolderNode[] = [];
  const map = new Map<string, FolderNode>();

  folders.forEach((folder) => {
    const node: FolderNode = {
      name: folder.folder_name,
      path: folder.folder_name,
      flags: folder.flags,
      delimiter: folder.delimiter,
      children: [],
      hasChildren: folder.flags.includes('HasChildren'),
      unread_count: folder.unread_count || 0,
      count: folder.count || 0,
    };
    map.set(folder.folder_name, node);
  });

  folders.forEach((folder) => {
    const node = map.get(folder.folder_name)!;
    const lastDelimiterIndex = folder.folder_name.lastIndexOf(folder.delimiter);

    if (lastDelimiterIndex > -1) {
      const parentPath = folder.folder_name.substring(0, lastDelimiterIndex);
      const parentNode = map.get(parentPath);

      if (parentNode) {
        parentNode.children.push(node);
        // Remove from root if it was added there
        const index = root.findIndex((n) => n.path === node.path);
        if (index > -1) {
          root.splice(index, 1);
        }
      } else {
        root.push(node);
      }
    } else {
      root.push(node);
    }
  });

  return root;
};
