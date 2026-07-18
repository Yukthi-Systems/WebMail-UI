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

import { useState } from 'react';
import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import { FaTrash, FaPlus } from 'react-icons/fa6';
import { useForm } from 'react-hook-form';
import type { FolderNode } from '../../utils/folderTree';
import type { DropdownItem } from '../common/DropdownWrapper';
import DialogWrapper from '../common/Dialoge';
import FolderRow from './FolderRow';
import { FaEdit } from 'react-icons/fa';
import { MAX_FOLDER_DEPTH } from '../../constants/constant';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { sortFoldersAscending } from '../../utils/folderUtils';
import { folderSchema } from './folderSchema';

const cleanFolderName = (folderName: string): string => {
  return folderName.replace(/^"(.+)"$/, '$1').replace(/\\"/g, '"');
};

interface CustomFolderProps {
  folderNode: FolderNode;
  onFolderClick?: () => void;
  onEdit?: (oldName: string, newName: string) => void;
  onDelete?: (folderName: string) => void;
  onAddFolder?: (parentFolder: string, newFolderName: string) => void;
  level?: number;
  isCollapsed?: boolean;
  onDropdownOpenChange?: (isOpen: boolean) => void;
  onDrop?: (folderPath: string) => void;
  isDragging?: boolean;
}

type FolderFormData = yup.InferType<typeof folderSchema>;

const CustomFolder = ({
  folderNode,
  onFolderClick,
  onEdit,
  onDelete,
  onAddFolder,
  level = 0,
  isCollapsed = false,
  onDropdownOpenChange,
  onDrop,
  isDragging = false,
}: CustomFolderProps) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const canAddSubfolder = level < MAX_FOLDER_DEPTH;

  // Logic to determine if we should show expander
  const hasChildren = folderNode.hasChildren || folderNode.children.length > 0;

  const displayName = cleanFolderName(
    folderNode.name.split(folderNode.delimiter).pop() || folderNode.name
  );

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { folderName: displayName },
  });

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    formState: { errors: errorsAdd },
    reset: resetAdd,
  } = useForm<FolderFormData>({
    resolver: yupResolver(folderSchema),
    mode: 'onChange',
  });

  const handleEdit = (data: { folderName: string }) => {
    onEdit?.(folderNode.path, data.folderName);
    setEditModalOpen(false);
    reset();
  };

  const handleDelete = () => {
    onDelete?.(folderNode.path);
    setDeleteModalOpen(false);
  };

  const handleAddFolder = (data: { newFolderName: string }) => {
    onAddFolder?.(folderNode.path, data.newFolderName);
    setAddModalOpen(false);
    resetAdd();
  };

  const dropdownItems: DropdownItem[] = [
    ...(canAddSubfolder
      ? [
          {
            key: 'add',
            label: 'Add Folder',
            icon: FaPlus,
            onSelect: () => setAddModalOpen(true),
          },
        ]
      : []),
    {
      key: 'edit',
      label: 'Rename',
      icon: FaEdit,
      onSelect: () => setEditModalOpen(true),
    },
    {
      key: 'separator2',
      label: '',
      separator: true,
    },
    {
      key: 'delete',
      label: 'Delete',
      color: 'red',
      icon: FaTrash,
      onSelect: () => setDeleteModalOpen(true),
    },
  ];

  if (isCollapsed && level > 0) return null;

  return (
    <>
      <FolderRow
        folderPath={folderNode.path}
        displayName={displayName}
        level={level}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onToggleExpand={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        onFolderClick={onFolderClick}
        menuItems={dropdownItems}
        isDragging={isDragging}
        onDrop={onDrop}
        folderPops={folderNode}
        isSidebarCollapsed={isCollapsed}
      />

      {/* Recursive Children */}
      {isExpanded && hasChildren && (
        <div className="">
          {sortFoldersAscending(folderNode.children).map((childNode) => (
            <CustomFolder
              key={childNode.path}
              folderNode={childNode}
              onFolderClick={onFolderClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddFolder={onAddFolder}
              level={level + 1}
              isCollapsed={isCollapsed}
              onDropdownOpenChange={onDropdownOpenChange}
              onDrop={onDrop}
              isDragging={isDragging}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <DialogWrapper
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) resetAdd(); // Clear errors and input on close
        }}
        title="Add New Folder"
        description={`Create a new folder inside "${displayName}".`}
        width="400px"
      >
        <form onSubmit={handleSubmitAdd(handleAddFolder)} className="space-y-4">
          <div className="space-y-2">
            <TextField.Root
              {...registerAdd('newFolderName')}
              placeholder="Enter folder name"
              size="3"
              color={errorsAdd.newFolderName ? 'red' : undefined}
              className="w-full"
            />
            {/* Validation Error Message */}
            {errorsAdd.newFolderName && (
              <Text color="red" size="1">
                {errorsAdd.newFolderName.message}
              </Text>
            )}
          </div>

          <Flex gap="3" justify="end" className="pt-2">
            <Button
              variant="soft"
              color="gray"
              onClick={() => setAddModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">Create Folder</Button>
          </Flex>
        </form>
      </DialogWrapper>

      <DialogWrapper
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Rename Folder"
        description="Change the name of your folder."
        width="400px"
      >
        <form onSubmit={handleSubmit(handleEdit)} className="space-y-5">
          <TextField.Root
            {...register('folderName', { required: true })}
            placeholder="Enter folder name"
            size="3"
            className="w-full"
          />
          <Flex gap="3" justify="end" className="pt-2">
            <Button
              variant="soft"
              color="gray"
              onClick={() => setEditModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </Flex>
        </form>
      </DialogWrapper>

      <DialogWrapper
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Folder"
        description={`Are you sure you want to delete "${displayName}"?`}
        width="400px"
      >
        <Flex gap="3" justify="end" className="pt-4">
          <Button
            variant="soft"
            color="gray"
            onClick={() => setDeleteModalOpen(false)}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={handleDelete} color="red">
            Delete Folder
          </Button>
        </Flex>
      </DialogWrapper>
    </>
  );
};

export default CustomFolder;
