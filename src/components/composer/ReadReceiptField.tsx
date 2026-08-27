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

import { Checkbox, Flex, Text } from '@radix-ui/themes';

type ReadReceiptFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const ReadReceiptField = ({ checked, onChange }: ReadReceiptFieldProps) => {
  return (
    <Flex asChild align="center" gap="2">
      <label className="cursor-pointer select-none whitespace-nowrap">
        <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
        <Text size="2" className="text-[var(--gray-11)]">
          Request read receipt
        </Text>
      </label>
    </Flex>
  );
};

export default ReadReceiptField;
