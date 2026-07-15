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

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
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
  const navigationShortcuts: ShortcutItem[] = [
    { description: 'Next email', keys: ['j', '↓'] },
    { description: 'Previous email', keys: ['k', '↑'] },
    { description: 'Open email', keys: ['Enter', 'o'] },
    { description: 'Back to list', keys: ['Esc'] },
    { description: 'Go to next page', keys: ['n'] },
    { description: 'Go to previous page', keys: ['p'] },
    { description: 'Focus folders', keys: ['Shift', 'g'] },
  ];

  const actionShortcuts: ShortcutItem[] = [
    { description: 'Compose', keys: ['c'] },
    { description: 'Reply', keys: ['r'] },
    { description: 'Reply All', keys: ['a'] },
    { description: 'Forward', keys: ['f'] },
    // { description: 'Search', keys: ['/'] },
    { description: 'Show shortcuts', keys: ['Ctrl', '?'] },
  ];

  const selectionShortcuts: ShortcutItem[] = [
    { description: 'Select conversation', keys: ['x'] },
    { description: 'Select all', keys: ['Shift', '*'] },
    { description: 'Mark as read', keys: ['Shift', 'i'] },
    { description: 'Mark as unread', keys: ['Shift', 'u'] },
    { description: 'Delete', keys: ['#'] },
    { description: 'Mark as Flagged', keys: ['e'] },
    { description: 'Mark as UnFlagged', keys: ['s'] },
  ];

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
