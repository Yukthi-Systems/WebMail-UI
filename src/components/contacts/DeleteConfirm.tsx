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

import { Dialog, Button, Flex } from '@radix-ui/themes';
import { FaTrash, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import type { Contact } from '../../utils/contact';

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  type: 'single' | 'bulk';
  contact?: Contact;
  selectedCount?: number;
}

export const DeleteConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
  type,
  contact,
  selectedCount = 0,
}: DeleteConfirmationModalProps) => {
  const handleConfirm = () => {
    onConfirm();
    // onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getTitle = () => {
    if (type === 'single') {
      return 'Delete Contact';
    }
    return `Delete ${selectedCount} Contact${selectedCount !== 1 ? 's' : ''}`;
  };

  const getMessage = () => {
    if (type === 'single' && contact) {
      return (
        <div>
          <p className="text-[var(--gray-12)] mb-2">
            Are you sure you want to delete this contact?
          </p>
          <div className="p-3 bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg">
            <p className="font-medium text-[var(--gray-12)]">{contact.name}</p>
            <p className="text-sm text-[var(--gray-11)]">{contact.email}</p>
            {contact.phone && <p className="text-sm text-[var(--gray-11)]">{contact.phone}</p>}
          </div>
        </div>
      );
    }

    return (
      <p className="text-[var(--gray-12)]">
        Are you sure you want to delete {selectedCount} selected contact
        {selectedCount !== 1 ? 's' : ''}?
      </p>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2" style={{ width: '450px', maxWidth: '90vw' }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title className="text-lg font-semibold text-[var(--red-11)]">
            {getTitle()}
          </Dialog.Title>
          <Button variant="ghost" onClick={handleCancel} size="2">
            <FaTimes />
          </Button>
        </Flex>

        {/* Content */}
        <div className="space-y-4">
          {/* Warning Icon and Message */}
          <Flex align="start" gap="3">
            <FaExclamationTriangle className="text-[var(--red-9)] mt-1 flex-shrink-0 w-5 h-5" />
            <div className="flex-1">{getMessage()}</div>
          </Flex>

          {/* Warning Box */}
          <div className="p-4 bg-[var(--red-2)] border border-[var(--red-5)] rounded-lg">
            <Flex align="start" gap="2">
              <FaExclamationTriangle className="text-[var(--red-9)] mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-[var(--red-12)] mb-1">
                  This action cannot be undone
                </p>
                <p className="text-[var(--red-11)]">
                  {type === 'single'
                    ? 'This contact will be permanently removed from your directory.'
                    : `These ${selectedCount} contacts will be permanently removed from your directory.`}
                </p>
              </div>
            </Flex>
          </div>
        </div>

        {/* Action Buttons */}
        <Flex gap="3" justify="end" mt="6">
          <Button variant="soft" onClick={handleCancel} disabled={isLoading} size="3">
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirm} disabled={isLoading} size="3">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="w-4 h-4 mr-2" />
                Delete{' '}
                {type === 'bulk'
                  ? `${selectedCount} Contact${selectedCount !== 1 ? 's' : ''}`
                  : 'Contact'}
              </>
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
