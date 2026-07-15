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

import { Box, Text } from '@radix-ui/themes';

interface EmailErrorStateProps {
  error: string;
  rawContent: string;
}

const EmailErrorState = ({ error, rawContent }: EmailErrorStateProps) => {
  return (
    <Box>
      <Text color="red" mb="3">
        Failed to parse email: {error}
      </Text>
      <Text size="1" color="gray">
        Showing raw content:
      </Text>
      <Box
        style={{
          height: '300px',
          overflow: 'auto',
          backgroundColor: '#f8f9fa',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          marginTop: '8px',
        }}
      >
        {rawContent}
      </Box>
    </Box>
  );
};

export default EmailErrorState;
