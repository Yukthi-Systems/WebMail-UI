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

import { Box, Flex, Text } from '@radix-ui/themes';
import { FiInbox, FiLoader } from 'react-icons/fi';

interface EmailLoadingStateProps {
  message?: string;
  showIcon?: boolean;
}

const EmailLoadingState = ({
  message = 'Loading email content...',
  showIcon = true,
}: EmailLoadingStateProps) => {
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
      <Flex direction="column" align="center" gap="4">
        {showIcon && (
          <Box style={{ position: 'relative' }}>
            <FiInbox size={32} color="var(--gray-8)" style={{ opacity: 0.7 }} />
            <FiLoader
              size={16}
              color="var(--accent-9)"
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                animation: 'spin 1.5s linear infinite',
              }}
            />
          </Box>
        )}

        <Text
          size="3"
          color="gray"
          style={{
            textAlign: 'center',
            maxWidth: '300px',
          }}
        >
          {message}
        </Text>

        <Box
          style={{
            display: 'flex',
            gap: '4px',
            marginTop: 'var(--space-2)',
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-9)',
                opacity: 0.6,
                animation: `pulse 1.5s infinite ${i * 0.3}s`,
              }}
            />
          ))}
        </Box>
      </Flex>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0.6; transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
};

export default EmailLoadingState;
