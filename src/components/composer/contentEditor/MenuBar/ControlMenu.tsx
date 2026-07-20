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

import { Button } from '@radix-ui/themes';
import { Editor } from '@tiptap/core';
import { FaRedo, FaUndo } from 'react-icons/fa';

const controlList = [
  {
    name: 'Undo',
    action: (editor: Editor) => editor.chain().focus().undo().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().undo().run(),
    icon: <FaUndo />,
  },
  {
    name: 'Redo',
    action: (editor: Editor) => editor.chain().focus().redo().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().redo().run(),
    icon: <FaRedo />,
  },
];

type ControlMenuProps = {
  editor: Editor | null;
};

const ControlMenu = ({ editor }: ControlMenuProps) => {
  if (!editor) return null;
  return (
    <>
      {controlList.map((item) => {
        const isDisabled = item.disabled(editor);
        return (
          <Button
            key={item.name}
            size="1"
            onClick={() => item.action(editor)}
            title={item.name}
            disabled={isDisabled}
            variant="soft"
          >
            {item.icon}
          </Button>
        );
      })}
    </>
  );
};

export default ControlMenu;
