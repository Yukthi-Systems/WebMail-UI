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

import { Editor } from '@tiptap/core';
import { Flex, Separator } from '@radix-ui/themes';
import { useAtomValue } from 'jotai';

import FormattingMenu from './FormattingMenu';
import ControlMenu from './ControlMenu';
import TableMenu from './TableMenu';
import ImageMenu from './ImageMenu';
import AdvancedMenu from './AdvancedMenu';
import LinkMenu from './LinkMenu';
import FontFamilySelect from './FontFamilySelect';
import { userSettingsAtom } from '../../../../state/settings';

type MenuBarProps = { editor: Editor | null };

const MenuBar = ({ editor }: MenuBarProps) => {
  const userSettings = useAtomValue(userSettingsAtom);
  const { show_insert_table_button = false } = userSettings?.compose ?? {};

  if (!editor) return null;

  return (
    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
      <Flex direction="row" gap="1" align="center" className="min-w-max px-1 py-1">
        <ControlMenu editor={editor} />
        <Separator orientation="vertical" className="hidden sm:block" />
        <FontFamilySelect editor={editor} />
        <Separator orientation="vertical" className="hidden sm:block" />
        <FormattingMenu editor={editor} />
        <Separator orientation="vertical" className="hidden sm:block" />
        <LinkMenu editor={editor} />
        {show_insert_table_button && (
          <>
            <Separator orientation="vertical" className="hidden sm:block" />
            <TableMenu editor={editor} />
          </>
        )}
        <Separator orientation="vertical" className="hidden sm:block" />
        <ImageMenu editor={editor} />
        {/* Advanced options live at the far right, separated visually */}
        <Separator orientation="vertical" className="hidden sm:block" />
        <AdvancedMenu editor={editor} />
      </Flex>
    </div>
  );
};

export default MenuBar;
