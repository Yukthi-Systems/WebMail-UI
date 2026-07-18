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

import type { EmailFolder } from '../../api/mailbox';
import type { IconType } from 'react-icons/lib';
import type { FolderNode } from '../../utils/folderTree';
import type { UserSettings } from '../../api/user';
import FolderItem from './FolderItem';
import CustomFolder from './CustomFolder';
import { folderSchema } from './folderSchema';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Flex, TextField } from '@radix-ui/themes';
import DialogWrapper from '../common/Dialoge';
import { FaPlus, FaChevronDown, FaChevronRight } from 'react-icons/fa6';
import DropdownWrapper, { type DropdownItem } from '../common/DropdownWrapper';
import { FaEllipsisH } from 'react-icons/fa';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { sortFoldersAscending } from '../../utils/folderUtils';

interface FolderProps {
  folder: EmailFolder;
  icon?: IconType;
  onFolderClick?: () => void;
  count?: number;
  isCollapsed?: boolean;
  onDrop?: (folderPath: string) => void;
  isDragging?: boolean;
  folderPops?: Partial<UserSettings['folders'][string]>;
  folderNode?: FolderNode;
  onAddFolder?: (parentFolder: string, newFolderName: string) => void;
  onEdit?: (oldName: string, newName: string) => void;
  onDelete?: (folderName: string) => void;
}

const DefaultFolder = ({
  folder,
  icon,
  onFolderClick,
  count = 0,
  isCollapsed = false,
  onDrop,
  isDragging = false,
  folderPops = {},
  folderNode,
  onAddFolder,
  onEdit,
  onDelete,
}: FolderProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const folderPath = folder?.path || folder?.name;
  const hasChildren = folderNode ? folderNode.hasChildren || folderNode.children.length > 0 : false;

  type FolderFormData = yup.InferType<typeof folderSchema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FolderFormData>({
    resolver: yupResolver(folderSchema),
    mode: 'onChange',
  });

  const handleAddFolder = (data: { newFolderName: string }) => {
    if (folderNode && onAddFolder) {
      onAddFolder(folderNode.path, data.newFolderName);
      setAddModalOpen(false);
      reset();
      setIsExpanded(true);
    }
  };

  const menuItems: DropdownItem[] = [
    {
      key: 'add',
      label: 'Add Subfolder',
      icon: FaPlus,
      onSelect: () => setAddModalOpen(true),
    },
  ];

  // Prevent toggle click from navigating to the folder
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div className="relative group">
        <FolderItem
          folderPath={folderPath}
          displayName={folderPops.label || folder?.name}
          icon={icon}
          onFolderClick={onFolderClick}
          count={count}
          discription={folderPops?.description ? folderPops?.description : ''}
          isCollapsed={isCollapsed}
          onDrop={onDrop}
          isDragging={isDragging}
          showCount={folderPops?.show_unread_count !== false}
          showLabel={folderPops?.show_label !== false}
          px={hasChildren ? '2' : '3'}
          leftSlot={
            hasChildren ? (
              <div
                className="w-5 h-5 flex items-center justify-center rounded-sm hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                onClick={handleToggle}
                role="button"
              >
                {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
              </div>
            ) : null
          }
        />

        {/* Hover Menu for Add Subfolder - Only show if not dragging */}
        {!isDragging && !isCollapsed && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-[var(--gray-2)] dark:bg-[var(--gray-3)] rounded-md shadow-sm">
            <DropdownWrapper
              items={menuItems}
              trigger={
                <button
                  className="p-1.5 rounded-md text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] transition-colors flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <FaEllipsisH size={14} />
                </button>
              }
            />
          </div>
        )}
      </div>

      {/* Render Subfolders */}
      {isExpanded && hasChildren && folderNode && (
        <div className="mt-[1px]">
          {sortFoldersAscending(folderNode.children).map((childNode) => (
            <CustomFolder
              key={childNode.path}
              folderNode={childNode}
              onFolderClick={onFolderClick}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddFolder={onAddFolder}
              level={1}
              isCollapsed={isCollapsed}
              onDrop={onDrop}
              isDragging={isDragging}
            />
          ))}
        </div>
      )}

      {/* Add Folder Dialog */}
      <DialogWrapper
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) reset(); // Reset form state when closing
        }}
        title="Add New Folder"
        description={`Create a new folder inside "${folder?.name}".`}
        width="400px"
      >
        <form onSubmit={handleSubmit(handleAddFolder)} className="space-y-4">
          <div className="space-y-2">
            <TextField.Root
              {...register('newFolderName')}
              placeholder="Enter folder name"
              size="3"
              className="w-full"
              color={errors.newFolderName ? 'red' : undefined}
            />
            {errors.newFolderName && (
              <p className="text-xs text-[var(--red-9)] px-1">{errors.newFolderName.message}</p>
            )}
          </div>

          <Flex gap="3" justify="end" className="pt-2">
            <Button
              variant="soft"
              color="gray"
              onClick={() => {
                setAddModalOpen(false);
                reset();
              }}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">Create Folder</Button>
          </Flex>
        </form>
      </DialogWrapper>
    </>
  );
};

export default DefaultFolder;
