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

const EmailCardSkeleton = () => (
  <Box
    p="3"
    mb="1"
    style={{
      background: 'var(--color-panel)',
      borderRadius: 'var(--radius-3)',
    }}
  >
    <Flex align="center" justify="between" gap="3">
      <Flex align="center" gap="3" style={{ flex: 1 }}>
        {/* Checkbox skeleton */}
        <Skeleton width="16px" height="16px" />

        {/* Avatar skeleton */}
        <Skeleton width="32px" height="32px" style={{ borderRadius: '50%' }} />

        {/* Content area skeleton */}
        <Flex gap="2" style={{ flex: 1 }}>
          {/* Sender name skeleton */}
          <Skeleton width="120px" height="16px" />

          {/* Subject skeleton */}
          <Skeleton style={{ flex: 1, height: '16px' }} />
        </Flex>
      </Flex>

      {/* Date skeleton */}
      <Skeleton width="60px" height="16px" />
    </Flex>
  </Box>
);

export default EmailCardSkeleton;
