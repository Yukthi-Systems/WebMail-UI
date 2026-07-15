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

import { Box } from '@radix-ui/themes';

interface EmailRawContentProps {
  rawContent: string;
}

const EmailRawContent = ({ rawContent }: EmailRawContentProps) => {
  return (
    <Box
      style={{
        overflow: 'auto',
        backgroundColor: '#f8f9fa',
        padding: '12px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        margin: '16px',
      }}
    >
      {rawContent}
    </Box>
  );
};

export default EmailRawContent;
