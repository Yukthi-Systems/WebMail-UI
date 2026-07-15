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

import React, { useState, useMemo } from 'react';
import { Table, Badge, Text, Flex, Switch, Button, ScrollArea, Box } from '@radix-ui/themes';
import {
  FaTrash,
  FaFolder,
  FaFolderOpen,
  FaInbox,
  FaPaperPlane,
  FaFileLines,
  FaTriangleExclamation,
  FaShield,
  FaChevronRight,
  FaChevronDown,
} from 'react-icons/fa6';
import { FaEdit } from 'react-icons/fa';
import CustomIconButton from '../../ui/IconButton';

interface FolderFromAPI {
  flags: string[];
  delimiter: string;
  folder_name: string;
  unread_count?: number; // Added unread_count
}

interface FolderSettings {
  [folder_name: string]: {
    show_in_sidebar: boolean;
    quota?: number;
    description?: string;
  };
}

interface FolderNode {
  name: string;
  path: string;
  flags: string[];
  delimiter: string;
  children: FolderNode[];
  level: number;
  unread_count?: number; // Added to Node interface
}

interface FolderTableProps {
  folders: FolderFromAPI[];
  folderSettings: FolderSettings;
  onSidebarToggle: (folderName: string, showInSidebar: boolean) => void;
  onEditFolder: (folderName: string) => void;
  onDeleteFolder: (folderName: string) => void;
  onManageACL: (folderName: string) => void;
}

const FolderTable: React.FC<FolderTableProps> = ({
  folders,
  folderSettings,
  onSidebarToggle,
  onEditFolder,
  onDeleteFolder,
  onManageACL,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const folderTree = useMemo(() => {
    const buildTree = (folders: FolderFromAPI[]): FolderNode[] => {
      const folderMap = new Map<string, FolderNode>();
      const rootFolders: FolderNode[] = [];

      folders.forEach((folder) => {
        folderMap.set(folder.folder_name, {
          name: folder.folder_name,
          path: folder.folder_name,
          flags: folder.flags,
          delimiter: folder.delimiter,
          children: [],
          level: 0,
          unread_count: folder.unread_count,
        });
      });

      // Build hierarchy
      folders.forEach((folder) => {
        const parts = folder.folder_name.split(folder.delimiter);
        const node = folderMap.get(folder.folder_name)!;

        if (parts.length === 1) {
          // Root level folder
          rootFolders.push(node);
        } else {
          // Find parent
          const parentPath = parts.slice(0, -1).join(folder.delimiter);
          const parent = folderMap.get(parentPath);
          if (parent) {
            node.level = parent.level + 1;
            parent.children.push(node);
          } else {
            // Parent not found, treat as root
            rootFolders.push(node);
          }
        }
      });

      return rootFolders;
    };

    return buildTree(folders);
  }, [folders]);

  const flattenedFolders = useMemo(() => {
    const flatten = (nodes: FolderNode[], result: FolderNode[] = []): FolderNode[] => {
      nodes.forEach((node) => {
        result.push(node);
        if (expandedFolders.has(node.path) && node.children.length > 0) {
          flatten(node.children, result);
        }
      });
      return result;
    };

    return flatten(folderTree);
  }, [folderTree, expandedFolders]);

  const toggleExpanded = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const getFolderIcon = (folderName: string, flags: string[]) => {
    if (flags.includes('Trash')) return FaTrash;
    if (flags.includes('Sent')) return FaPaperPlane;
    if (flags.includes('Drafts')) return FaFileLines;
    if (flags.includes('Junk')) return FaTriangleExclamation;
    if (folderName === 'INBOX') return FaInbox;
    if (flags.includes('HasChildren')) return FaFolderOpen;
    return FaFolder;
  };

  // Get folder type badge
  const getFolderTypeBadge = (flags: string[], folderName: string, isDeleted: boolean) => {
    if (isDeleted) return { label: 'Deleted / Ghost', color: 'gray' as const };
    if (folderName === 'INBOX') return { label: 'Inbox', color: 'green' as const };
    if (flags.includes('Trash')) return { label: 'Trash', color: 'red' as const };
    if (flags.includes('Sent')) return { label: 'Sent', color: 'blue' as const };
    if (flags.includes('Drafts')) return { label: 'Drafts', color: 'orange' as const };
    if (flags.includes('Junk')) return { label: 'Spam', color: 'yellow' as const };
    if (flags.includes('HasChildren')) return { label: 'Parent', color: 'purple' as const };
    return { label: 'Custom', color: 'gray' as const };
  };

  // Check if folder is system folder
  const isSystemFolder = (flags: string[], folderName: string) => {
    return (
      flags.some((flag) => ['Trash', 'Sent', 'Drafts', 'Junk'].includes(flag)) ||
      folderName === 'INBOX'
    );
  };

  // Get display name (last part of path)
  const getDisplayName = (folderName: string, delimiter: string) => {
    return folderName.split(delimiter).pop() || folderName;
  };

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <Table.Root className="w-full">
        <Table.Header>
          <Table.Row className="border-b border-[var(--gray-5)]">
            <Table.ColumnHeaderCell className="text-[var(--gray-12)] font-semibold">
              Folder
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-[var(--gray-12)] font-semibold">
              Type
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-[var(--gray-12)] font-semibold">
              Path
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-[var(--gray-12)] font-semibold">
              Visible
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-[var(--gray-12)] font-semibold">
              Permissions
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell className="text-[var(--gray-12)] font-semibold">
              Actions
            </Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {flattenedFolders.map((folder, index) => {
            // Determine if the folder is logically deleted/ghost
            const isDeleted = (folder.unread_count ?? 0) < 0;

            const Icon = getFolderIcon(folder.name, folder.flags);
            const badge = getFolderTypeBadge(folder.flags, folder.name, isDeleted);
            const isSystem = isSystemFolder(folder.flags, folder.name);
            const showInSidebar = folderSettings[folder.name]?.show_in_sidebar !== false;
            const displayName = getDisplayName(folder.name, folder.delimiter);
            const hasChildren = folder.children.length > 0;
            const isExpanded = expandedFolders.has(folder.path);

            return (
              <Table.Row
                key={folder.path}
                className="hover:bg-[var(--gray-2)] transition-colors border-b border-[var(--gray-4)]"
              >
                <Table.Cell>
                  <Flex align="center" gap="2" className="py-2">
                    {/* Indentation for hierarchy */}
                    <Box style={{ width: `${folder.level * 20}px` }} className="flex-shrink-0" />

                    {/* Expand/Collapse button */}
                    <Box className="w-5 flex-shrink-0 flex justify-center">
                      {hasChildren ? (
                        <Button
                          variant="ghost"
                          size="1"
                          className="w-4 h-4 p-0 rounded border-0 !bg-transparent !text-[var(--gray-10)] !hover:text-[var(--gray-12)] flex items-center justify-center"
                          onClick={() => toggleExpanded(folder.path)}
                        >
                          {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </Button>
                      ) : (
                        <Box className="w-4 h-4" />
                      )}
                    </Box>

                    {/* Folder icon and name */}
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${isDeleted ? 'text-[var(--gray-8)]' : 'text-[var(--gray-11)]'}`}
                    />
                    <Box className="min-w-0">
                      <Text
                        weight="medium"
                        size="3"
                        className={
                          isDeleted ? 'text-[var(--gray-9)] italic' : 'text-[var(--gray-12)]'
                        }
                      >
                        {displayName}
                      </Text>
                      {hasChildren && (
                        <Text size="1" className="text-[var(--gray-9)] block">
                          {folder.children.length} subfolder
                          {folder.children.length !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={badge.color} variant="soft" size="2">
                    {badge.label}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text
                    size="2"
                    className={`font-mono px-2 py-1 rounded ${isDeleted ? 'text-[var(--gray-8)] bg-[var(--gray-2)]' : 'text-[var(--gray-9)] bg-[var(--gray-3)]'}`}
                  >
                    {folder.path}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Flex align="center" gap="3">
                    <Switch
                      checked={showInSidebar}
                      onCheckedChange={(checked) => onSidebarToggle(folder.name, checked)}
                      // Disable if system folder OR if deleted
                      disabled={isDeleted}
                      size="2"
                    />
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="ghost"
                    size="2"
                    // Disable ACL management for deleted folders
                    disabled={isDeleted}
                    onClick={() => onManageACL(folder.name)}
                    className="text-[var(--blue-11)] hover:bg-[var(--blue-3)] disabled:text-[var(--gray-8)]"
                  >
                    <FaShield className="w-3 h-3 mr-2" />
                    Manage ACL
                  </Button>
                </Table.Cell>
                <Table.Cell>
                  {!isSystem && !isDeleted && (
                    <Flex gap="4">
                      <CustomIconButton
                        variant="ghost"
                        size="2"
                        title="Edit"
                        onClick={() => onEditFolder(folder.name)}
                        ariaLabel="Edit folder"
                        icon={<FaEdit style={{ width: '16px', height: '16px' }} />}
                        color="blue"
                        style={{ color: 'var(--blue-11)' }}
                      />

                      <CustomIconButton
                        variant="ghost"
                        title="Delete"
                        size="2"
                        onClick={() => onDeleteFolder(folder.name)}
                        ariaLabel="Delete folder"
                        icon={<FaTrash style={{ width: '16px', height: '16px' }} />}
                        color="red"
                        style={{ color: 'var(--red-11)' }}
                      />
                    </Flex>
                  )}
                  {isDeleted && (
                    <Text size="1" color="gray" className="italic">
                      Actions unavailable
                    </Text>
                  )}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </ScrollArea>
  );
};

export default FolderTable;
