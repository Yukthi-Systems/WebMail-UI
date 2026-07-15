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

import { Flex, Grid, Switch, Text } from '@radix-ui/themes';
import { Controller, type Control } from 'react-hook-form';
import type { GeneralSettings } from '../../../api/user';

type ToggleDef = {
  name: keyof GeneralSettings | string;
  label: string;
  description?: string;
};

type ToggleGroupProps = {
  toggles: ToggleDef[];
  control: Control<GeneralSettings>;
  columns?: number | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | string;
};

export const ToggleGroup = ({ toggles, control, columns = '5' }: ToggleGroupProps) => (
  <Grid columns={columns.toString()} gap="5" mt="3">
    {toggles.map((item) => (
      <Controller
        key={item.name as string}
        name={item.name as keyof GeneralSettings}
        control={control}
        render={({ field }) => (
          <Flex justify="between" align="center" gap="2">
            <Flex direction="column" gap="1" mr="2">
              <Text size="2">{item.label}</Text>
              {item?.description && (
                <Text size="1" color="gray">
                  {item?.description as string}
                </Text>
              )}
            </Flex>
            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </Flex>
        )}
      />
    ))}
  </Grid>
);
