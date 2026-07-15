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

import { Flex, Text, Button, Select } from '@radix-ui/themes';
import type { ContactsResponse } from '../../utils/contact';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PaginationProps {
  perPage: number;
  data: ContactsResponse;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export const Pagination = ({
  perPage = 15,
  data,
  onPageChange,
  onPerPageChange,
}: PaginationProps) => {
  // Mobile compact view for small screens
  const MobilePagination = () => (
    <Flex direction="column" gap="3" width="100%">
      {/* Top row - Results count and page size */}
      <Flex justify="between" align="center" width="100%">
        <Text size="1" weight="medium" className="whitespace-nowrap">
          {data.total_count} contacts
        </Text>

        <Flex gap="2" align="center">
          <Text size="1">Show</Text>
          <Select.Root
            value={perPage?.toString() || data.page_size?.toString() || '15'}
            onValueChange={(value) => onPerPageChange(Number(value))}
          >
            <Select.Trigger
              variant="soft"
              className="min-w-[60px] max-w-[80px]"
              style={{ maxWidth: '80px' }}
            />
            <Select.Content>
              <Select.Item value="10">10</Select.Item>
              <Select.Item value="15">15</Select.Item>
              <Select.Item value="20">20</Select.Item>
              <Select.Item value="25">25</Select.Item>
              <Select.Item value="50">50</Select.Item>
              <Select.Item value="100">100</Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>

      {/* Bottom row - Page navigation */}
      <Flex justify="between" align="center" width="100%">
        <Button
          size="1"
          variant="soft"
          disabled={!data.has_previous}
          onClick={() => onPageChange(data.previous_page || 1)}
          className="flex items-center gap-1"
        >
          <FaChevronLeft className="w-3 h-3" />
          <span className="hidden xs:inline">Previous</span>
        </Button>

        <Text size="1" weight="medium" className="px-2">
          Page {data.current_page} of {data.total_pages}
        </Text>

        <Button
          size="1"
          variant="soft"
          disabled={!data.has_next}
          onClick={() => onPageChange(data.next_page || data.current_page + 1)}
          className="flex items-center gap-1"
        >
          <span className="hidden xs:inline">Next</span>
          <FaChevronRight className="w-3 h-3" />
        </Button>
      </Flex>
    </Flex>
  );

  // Desktop view
  const DesktopPagination = () => (
    <Flex justify="between" align="center" width="100%">
      <Text size="2">Total: {data.total_count} contacts</Text>

      <Flex gap="3" align="center">
        <Button
          size="1"
          variant="soft"
          disabled={!data.has_previous}
          onClick={() => onPageChange(data.previous_page || 1)}
          className="flex items-center gap-1"
        >
          <FaChevronLeft className="w-3 h-3" />
          Previous
        </Button>

        <Text size="2" weight="medium">
          Page {data.current_page} of {data.total_pages}
        </Text>

        <Button
          size="1"
          variant="soft"
          disabled={!data.has_next}
          onClick={() => onPageChange(data.next_page || data.current_page + 1)}
          className="flex items-center gap-1"
        >
          Next
          <FaChevronRight className="w-3 h-3" />
        </Button>
      </Flex>

      <Flex gap="2" align="center">
        <Text size="2">Show</Text>
        <Select.Root
          value={perPage?.toString() || data.page_size?.toString() || '15'}
          onValueChange={(value) => onPerPageChange(Number(value))}
        >
          <Select.Trigger variant="soft" />
          <Select.Content>
            <Select.Item value="10">10</Select.Item>
            <Select.Item value="15">15</Select.Item>
            <Select.Item value="20">20</Select.Item>
            <Select.Item value="25">25</Select.Item>
            <Select.Item value="50">50</Select.Item>
            <Select.Item value="100">100</Select.Item>
          </Select.Content>
        </Select.Root>
        <Text size="2">per page</Text>
      </Flex>
    </Flex>
  );

  return (
    <div className="pagination-container">
      {/* Mobile - hidden on medium screens and above */}
      <div className="block lg:hidden">
        <MobilePagination />
      </div>

      {/* Desktop - hidden on small screens */}
      <div className="hidden lg:block w-full">
        <DesktopPagination />
      </div>
    </div>
  );
};
