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

import { Card, Flex, Separator, Text } from '@radix-ui/themes';
import type { ReactNode } from '@tanstack/react-router';

type SectionProps = {
  title: string | ReactNode;
  children: ReactNode;
  description?: string;
};

export const Section = ({ title, children, description = '' }: SectionProps) => (
  <Card size="2" variant="surface">
    <Flex direction="column" gap="3">
      <Text size="3" weight="bold">
        {title}
      </Text>
      {description && (
        <Text size="1" color="gray">
          {description}
        </Text>
      )}
      <Separator my="2" style={{ width: '100%' }} />
      <Flex direction="column" gap="3">
        {children}
      </Flex>
    </Flex>
  </Card>
);
