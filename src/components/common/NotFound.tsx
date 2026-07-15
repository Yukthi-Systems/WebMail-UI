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

// src/components/common/NotFound.tsx
import { Link } from '@tanstack/react-router';
import { Box, Flex, Text, Heading, Button, Container } from '@radix-ui/themes';
import { HiOutlineEnvelopeOpen, HiArrowLeft, HiHome } from 'react-icons/hi2';

export const NotFound = () => {
  return (
    <Container size="2">
      <Flex direction="column" align="center" justify="center" gap="5" className="min-h-[70vh]">
        {/* Visual Cue using Radix Accent Colors */}
        <Box
          className="bg-accent-3 p-6 rounded-full"
          style={{ backgroundColor: 'var(--accent-3)' }}
        >
          <HiOutlineEnvelopeOpen
            size={48}
            className="text-accent-9"
            style={{ color: 'var(--accent-9)' }}
          />
        </Box>

        <Flex direction="column" align="center" gap="2">
          <Heading size="8" weight="bold" color="gray">
            404
          </Heading>
          <Heading size="5" align="center">
            This mailbox path doesn't exist.
          </Heading>
          <Text color="gray" align="center">
            The link might be broken, or the email thread has been moved to a different folder.
          </Text>
        </Flex>

        {/* Navigation Actions */}
        <Flex gap="3" mt="4">
          <Button variant="soft" color="gray" highContrast asChild>
            <Link to="..">
              <HiArrowLeft /> Go Back
            </Link>
          </Button>

          <Button variant="solid" asChild>
            <Link to="/">
              <HiHome /> Return to Inbox
            </Link>
          </Button>
        </Flex>
      </Flex>
    </Container>
  );
};
