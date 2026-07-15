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

import { Box, Flex, Skeleton } from '@radix-ui/themes';

const FolderSkeleton = () => (
  <Box px="3" py="2" style={{ borderRadius: '8px' }}>
    <Flex align="center" gap="2">
      <Skeleton style={{ borderRadius: '4px' }}>
        <Box style={{ width: '16px', height: '16px' }} />
      </Skeleton>
      <Skeleton style={{ borderRadius: '4px', flex: 1 }}>
        <Box style={{ width: '100%', height: '16px' }} />
      </Skeleton>
    </Flex>
  </Box>
);

export default FolderSkeleton;
