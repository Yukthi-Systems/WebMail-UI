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
import { FaBold, FaItalic, FaStrikethrough, FaCode, FaUnderline, FaListUl } from 'react-icons/fa';

const formatingList = [
  {
    name: 'Bold',
    action: (editor: Editor) => editor.chain().focus().toggleBold().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().toggleBold().run(),
    icon: <FaBold />,
    isActive: (editor: Editor) => editor.isActive('bold'),
  },
  {
    name: 'Italic',
    action: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().toggleItalic().run(),
    isActive: (editor: Editor) => editor.isActive('italic'),
    icon: <FaItalic />,
  },
  {
    name: 'Strike',
    action: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().toggleStrike().run(),
    isActive: (editor: Editor) => editor.isActive('strike'),
    icon: <FaStrikethrough />,
  },
  {
    name: 'Underline',
    action: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().toggleUnderline().run(),
    isActive: (editor: Editor) => editor.isActive('underline'),
    icon: <FaUnderline />,
  },
  {
    name: 'Code',
    action: (editor: Editor) => editor.chain().focus().toggleCode().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().toggleCode().run(),
    isActive: (editor: Editor) => editor.isActive('code'),
    icon: <FaCode />,
  },
  {
    name: 'Bullet List',
    action: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
    disabled: (editor: Editor) => !editor.can().chain().focus().toggleBulletList().run(),
    isActive: (editor: Editor) => editor.isActive('bulletList'),
    icon: <FaListUl />,
  },
];

type FormattingMenuProps = {
  editor: Editor | null;
};
const FormattingMenu = ({ editor }: FormattingMenuProps) => {
  if (!editor) return null;
  return (
    <>
      {formatingList.map((item) => {
        const isDisabled = item.disabled(editor);
        const isActive = item.isActive ? item.isActive(editor) : false;
        return (
          <Button
            key={item.name}
            variant={isActive ? 'solid' : 'soft'}
            size="1"
            disabled={isDisabled}
            onClick={() => item.action(editor)}
            title={item.name}
            radius="small"
          >
            {item.icon}
          </Button>
        );
      })}
    </>
  );
};

export default FormattingMenu;
