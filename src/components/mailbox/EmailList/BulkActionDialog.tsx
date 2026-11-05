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

import type { ReactNode } from 'react';
import { Button, Dialog, Flex } from '@radix-ui/themes';
import { FaExclamationTriangle, FaFlag, FaRegFlag } from 'react-icons/fa';
import {
  MdDeleteForever,
  MdDriveFileMoveOutline,
  MdMarkEmailRead,
  MdMarkEmailUnread,
} from 'react-icons/md';
import type { BulkAction } from '../../../api/mailbox';

const ACTION_ICONS: Record<BulkAction, ReactNode> = {
  read: <MdMarkEmailRead size={22} />,
  unread: <MdMarkEmailUnread size={22} />,
  flag: <FaFlag size={17} />,
  unflag: <FaRegFlag size={17} />,
  move: <MdDriveFileMoveOutline size={23} />,
  delete: <MdDeleteForever size={24} />,
};

interface BulkActionDialogProps {
  open: boolean;
  action: BulkAction;
  title: string;
  /** Heading while the action runs */
  progressTitle: string;
  detail?: string;
  confirmLabel: string;
  danger?: boolean;
  /** Set while the action runs: the dialog can't be closed until it finishes */
  progress: { done: number; total: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirms an action on all selected emails, then shows its progress */
const BulkActionDialog = ({
  open,
  action,
  title,
  progressTitle,
  detail,
  confirmLabel,
  danger,
  progress,
  onConfirm,
  onCancel,
}: BulkActionDialogProps) => {
  const color = danger ? 'red' : 'accent';
  const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !progress) onCancel();
      }}
    >
      <Dialog.Content size="3" style={{ width: '460px', maxWidth: '92vw' }}>
        <Flex gap="4" align="start">
          <div
            className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full"
            style={{ background: `var(--${color}-3)`, color: `var(--${color}-11)` }}
          >
            {ACTION_ICONS[action]}
          </div>

          <div className="flex-1 min-w-0">
            <Dialog.Title size="4" mb="1">
              {progress ? progressTitle : title}
            </Dialog.Title>
            <Dialog.Description size="2" color="gray">
              {progress
                ? 'Please keep this page open until it finishes.'
                : danger
                  ? 'Emails that arrive after your selection are not affected.'
                  : detail || 'Emails that arrive after your selection are not affected.'}
            </Dialog.Description>

            {!progress && danger && detail && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 text-sm rounded-lg bg-[var(--red-2)] border border-[var(--red-5)] text-[var(--red-11)]">
                <FaExclamationTriangle size={13} className="flex-shrink-0" />
                <span>{detail}</span>
              </div>
            )}

            {progress && (
              <div className="mt-4">
                <div
                  className="h-2 rounded-full overflow-hidden bg-[var(--gray-4)]"
                  role="progressbar"
                  aria-valuenow={progress.total ? percent : undefined}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {/* The total is known after the server's first reply */}
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      background: `var(--${color}-9)`,
                      ...(progress.total
                        ? { width: `${percent}%` }
                        : { animation: 'pageLoadProgress 1.4s ease-in-out infinite' }),
                    }}
                  />
                </div>
                <Flex justify="between" mt="2" className="text-sm text-[var(--gray-11)]">
                  <span>
                    {progress.total
                      ? `${progress.done.toLocaleString('en-US')} of ${progress.total.toLocaleString('en-US')} emails`
                      : 'Starting…'}
                  </span>
                  {progress.total > 0 && <span className="font-medium">{percent}%</span>}
                </Flex>
              </div>
            )}
          </div>
        </Flex>

        {!progress && (
          <Flex justify="end" gap="3" mt="5">
            <Button variant="soft" color="gray" onClick={onCancel}>
              Cancel
            </Button>
            <Button color={danger ? 'red' : undefined} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default BulkActionDialog;
