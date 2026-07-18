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

import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { FiInbox, FiRefreshCw, FiSearch } from 'react-icons/fi';

interface EmailNoDataStateProps {
  title?: string;
  message?: string;
  showActionButton?: boolean;
  actionButtonText?: string;
  onAction?: () => void;
  variant?: 'default' | 'search' | 'error';
}

const EmailNoDataState = ({
  title = 'No email data available',
  message = "There doesn't seem to be any email content to display.",
  showActionButton = false,
  actionButtonText = 'Try Again',
  onAction,
  variant = 'default',
}: EmailNoDataStateProps) => {
  const getIcon = () => {
    switch (variant) {
      case 'search':
        return <FiSearch size={32} color="var(--gray-9)" />;
      case 'error':
        return <FiInbox size={32} color="var(--red-9)" />;
      default:
        return <FiInbox size={32} color="var(--gray-9)" />;
    }
  };

  const getColor = () => {
    switch (variant) {
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box
      p="6"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
      }}
    >
      <Flex direction="column" align="center" gap="4" style={{ maxWidth: '300px' }}>
        <Box
          style={{
            color: variant === 'error' ? 'var(--red-9)' : 'var(--gray-9)',
            opacity: 0.8,
          }}
        >
          {getIcon()}
        </Box>

        <Box style={{ textAlign: 'center' }}>
          <Text
            as="div"
            size="4"
            weight="medium"
            color={getColor()}
            style={{ marginBottom: 'var(--space-1)' }}
          >
            {title}
          </Text>
          <Text as="div" size="2" color="gray">
            {message}
          </Text>
        </Box>

        {showActionButton && (
          <Button variant="soft" onClick={onAction} color={variant === 'error' ? 'red' : 'gray'}>
            <FiRefreshCw style={{ marginRight: 'var(--space-1)' }} />
            {actionButtonText}
          </Button>
        )}
      </Flex>
    </Box>
  );
};

export default EmailNoDataState;
