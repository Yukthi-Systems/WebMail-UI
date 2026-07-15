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

// TableMenu.tsx
import { Button, DropdownMenu } from '@radix-ui/themes';
import { Editor } from '@tiptap/core';
import {
  FaTable,
  FaMinus,
  FaArrowRight,
  FaArrowDown,
  FaTrash,
  FaColumns,
  FaBars,
} from 'react-icons/fa';

type TableMenuProps = {
  editor: Editor | null;
};

const TableMenu = ({ editor }: TableMenuProps) => {
  if (!editor) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="soft" size="1" title="Table">
          <FaTable />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content style={{ minWidth: '220px' }}>
        <DropdownMenu.Item
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaTable style={{ width: '14px', height: '14px' }} />
          Insert Table (3x3)
        </DropdownMenu.Item>

        <DropdownMenu.Item
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run()
          }
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FaTable style={{ width: '14px', height: '14px' }} />
          Insert Table (5x5)
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaColumns style={{ width: '12px', height: '12px' }} />
            Columns
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <DropdownMenu.Item
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaArrowRight
                style={{ transform: 'rotate(180deg)', width: '12px', height: '12px' }}
              />
              Add Column Before
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaArrowRight style={{ width: '12px', height: '12px' }} />
              Add Column After
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaMinus style={{ width: '12px', height: '12px' }} />
              Delete Column
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaBars style={{ width: '12px', height: '12px' }} />
            Rows
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            <DropdownMenu.Item
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaArrowDown style={{ transform: 'rotate(180deg)', width: '12px', height: '12px' }} />
              Add Row Before
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaArrowDown style={{ width: '12px', height: '12px' }} />
              Add Row After
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaMinus style={{ width: '12px', height: '12px' }} />
              Delete Row
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <DropdownMenu.Separator />

        <DropdownMenu.Item
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}
        >
          <FaTrash style={{ width: '12px', height: '12px' }} />
          Delete Table
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default TableMenu;
