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

import { Box, Dialog } from '@radix-ui/themes';
import type { ReactNode } from '@tanstack/react-router';
import { FaArrowsLeftRightToLine, FaArrowsToCircle, FaXmark } from 'react-icons/fa6';

interface DialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: '1' | '2' | '3' | '4';
  maxWidth?: string;
  width?: string;
  showCloseButton?: boolean;
  className?: string;
  showFullView?: boolean;
  viewMode?: boolean;
  toggleFullView?: () => void;
}

const DialogWrapper = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = '3',
  maxWidth = '95vw',
  width,
  showCloseButton = true,
  className = '',
  showFullView = false,
  viewMode = false,
  toggleFullView = () => {},
}: DialogWrapperProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size={size}
        className={`bg-[var(--gray-1)] border border-[var(--gray-5)] ${className}`}
        style={{
          width,
          maxWidth,
          height: showFullView && viewMode ? '90vh' : 'auto',
          boxShadow: 'var(--shadow-6)',
        }}
      >
        <Dialog.Title className="text-[var(--gray-12)] text-lg font-semibold !mb-2">
          {title}
        </Dialog.Title>

        {description && (
          <Dialog.Description className="text-[var(--gray-11)] text-sm !mb-4">
            {description}
          </Dialog.Description>
        )}

        <Box className="relative">{children}</Box>

        {showCloseButton && (
          <Dialog.Close>
            <Box
              className="absolute top-3 right-3 p-2 rounded-md cursor-pointer transition-colors duration-200 hover:bg-[var(--gray-3)] text-[var(--gray-11)] hover:text-[var(--gray-12)]"
              style={{
                position: 'absolute',
                top: '0.75rem',
                right: '0.75rem',
              }}
            >
              <FaXmark className="w-4 h-4" />
            </Box>
          </Dialog.Close>
        )}
        {showFullView && (
          <Box
            className="absolute top-3 right-9 p-2 rounded-md cursor-pointer transition-colors duration-200 hover:bg-[var(--gray-3)] text-[var(--gray-11)] hover:text-[var(--gray-12)]"
            onClick={toggleFullView}
          >
            {viewMode ? (
              <FaArrowsToCircle className="w-4 h-4" />
            ) : (
              <FaArrowsLeftRightToLine className="w-4 h-4" />
            )}
          </Box>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default DialogWrapper;
