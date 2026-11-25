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

import { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Checkbox, Text } from '@radix-ui/themes';
import { FaTrash, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { MdDeleteForever } from 'react-icons/md';

interface PermanentDeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // dontAskAgain (either button): later deletes go to Trash without this prompt, for this session
  onPermanentDelete: (dontAskAgain: boolean) => void;
  onMoveToTrash: (dontAskAgain: boolean) => void;
  emailCount: number;
  isLoading?: boolean;
  quotaPercent?: number;
}

const PermanentDeleteConfirm = ({
  open,
  onOpenChange,
  onPermanentDelete,
  onMoveToTrash,
  emailCount,
  isLoading = false,
  quotaPercent,
}: PermanentDeleteConfirmProps) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    if (!open) setDontAskAgain(false);
  }, [open]);

  const handlePermanentDelete = () => {
    onPermanentDelete(dontAskAgain);
    onOpenChange(false);
  };

  const handleMoveToTrash = () => {
    onMoveToTrash(dontAskAgain);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2" style={{ width: '480px', maxWidth: '92vw' }}>
        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title className="text-lg font-semibold text-[var(--red-11)]">
            <Flex align="center" gap="2">
              <MdDeleteForever size={22} />
              Delete {emailCount === 1 ? 'Email' : `${emailCount} Emails`}
            </Flex>
          </Dialog.Title>
          <Button variant="ghost" onClick={handleCancel} size="2">
            <FaTimes />
          </Button>
        </Flex>

        <Dialog.Description className="sr-only">
          Choose how to delete the selected emails
        </Dialog.Description>

        {/* Content */}
        <div className="space-y-4">
          {/* Quota Warning */}
          <div className="p-3 bg-[var(--orange-2)] border border-[var(--orange-6)] rounded-lg">
            <Flex align="start" gap="2">
              <FaExclamationTriangle className="text-[var(--orange-9)] mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-[var(--orange-12)] mb-1">
                  Storage is almost full
                  {quotaPercent !== undefined && ` (${quotaPercent.toFixed(0)}% used)`}
                </p>
                <p className="text-[var(--orange-11)]">
                  Moving to Trash won&apos;t free up space. Consider permanently deleting to reclaim
                  storage.
                </p>
              </div>
            </Flex>
          </div>

          {/* Permanent Delete Section */}
          <div className="p-4 bg-[var(--red-2)] border border-[var(--red-5)] rounded-lg">
            <Flex align="start" gap="2" mb="3">
              <FaExclamationTriangle className="text-[var(--red-9)] mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-[var(--red-12)] mb-1">
                  Permanent deletion cannot be undone
                </p>
                <p className="text-[var(--red-11)]">
                  {emailCount === 1
                    ? 'This email will be permanently removed and cannot be recovered.'
                    : `These ${emailCount} emails will be permanently removed and cannot be recovered.`}
                </p>
              </div>
            </Flex>
          </div>
        </div>

        <Flex asChild align="center" gap="2" mt="4">
          <label className="cursor-pointer select-none">
            <Checkbox
              checked={dontAskAgain}
              onCheckedChange={(value) => setDontAskAgain(value === true)}
            />
            <Text size="2" className="text-[var(--gray-11)]">
              Don&apos;t ask again this session, just move to Trash
            </Text>
          </label>
        </Flex>

        {/* Action Buttons */}
        <Flex gap="3" justify="end" mt="4" wrap="wrap">
          <Button variant="soft" onClick={handleCancel} disabled={isLoading} size="3">
            Cancel
          </Button>

          <Button variant="soft" onClick={handleMoveToTrash} disabled={isLoading} size="3">
            <FaTrash className="w-3.5 h-3.5" />
            Move to Trash
          </Button>

          <Button color="red" onClick={handlePermanentDelete} disabled={isLoading} size="3">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                Deleting...
              </>
            ) : (
              <>
                <MdDeleteForever className="w-4.5 h-4.5" />
                Permanent Delete
              </>
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default PermanentDeleteConfirm;
