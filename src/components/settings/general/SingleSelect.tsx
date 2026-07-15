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

import { Select } from '@radix-ui/themes';

type Option = {
  label?: string;
  value: string;
};

type SingleSelectProps = {
  defaultValue?: string;
  items: Option[];
  onValueChange?: (value: string) => void;
  name?: string;
};

export const SingleSelect = ({ defaultValue, name, items, onValueChange }: SingleSelectProps) => {
  return (
    <Select.Root name={name} defaultValue={defaultValue} onValueChange={onValueChange}>
      <Select.Trigger />
      <Select.Content>
        {items.map((item) => (
          <Select.Item key={item.value} value={item.value}>
            {item.label ?? item.value}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};
