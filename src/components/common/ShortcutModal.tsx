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

import { Dialog, Table, Kbd, Flex, Text, Button, Grid, Box } from '@radix-ui/themes';
import { RxCross1 } from 'react-icons/rx';
import {
  actionShortcuts,
  navigationShortcuts,
  selectionShortcuts,
  type ShortcutItem,
} from '../../constants/keyboardShortcuts';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShortcutSection = ({ title, shortcuts }: { title: string; shortcuts: ShortcutItem[] }) => (
  <Box className="space-y-3">
    <Text size="2" weight="bold" color="gray" className="uppercase tracking-wider">
      {title}
    </Text>
    <Table.Root variant="surface">
      <Table.Body>
        {shortcuts.map((shortcut, index) => (
          <Table.Row key={index}>
            <Table.Cell py="2">
              <Text size="2">{shortcut.description}</Text>
            </Table.Cell>
            <Table.Cell py="2" align="right">
              <Flex gap="2" justify="end">
                {shortcut.keys.map((key, i) => (
                  <Kbd key={i} size="2">
                    {key}
                  </Kbd>
                ))}
              </Flex>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  </Box>
);

const ShortcutsModal = ({ open, onOpenChange }: ShortcutsModalProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 800 }}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title size="6" mb="0">
            Keyboard Shortcuts
          </Dialog.Title>
          <Dialog.Close>
            <Button variant="ghost" color="gray">
              <RxCross1 />
            </Button>
          </Dialog.Close>
        </Flex>

        <Grid
          columns={{ initial: '1', sm: '2' }}
          gap="6"
          className="max-h-[60vh] overflow-y-auto pr-2"
        >
          <div className="space-y-6">
            <ShortcutSection title="Navigation" shortcuts={navigationShortcuts} />
            <ShortcutSection title="Selection" shortcuts={selectionShortcuts} />
          </div>
          <div className="space-y-6">
            <ShortcutSection title="Actions" shortcuts={actionShortcuts} />
          </div>
        </Grid>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ShortcutsModal;
