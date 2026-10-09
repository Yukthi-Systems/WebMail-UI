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
import { useCallback, useEffect, useRef, useState } from 'react';

import FormattingMenu from './FormattingMenu';
import ControlMenu from './ControlMenu';
import TableMenu from './TableMenu';
import ImageMenu from './ImageMenu';
import AdvancedMenu from './AdvancedMenu';
import LinkMenu from './LinkMenu';
import FontFamilySelect from './FontFamilySelect';
import { userSettingsAtom } from '../../../../state/settings';

type MenuBarProps = {
  editor: Editor | null;
  /**
   * Controls placed right after the font picker (e.g. the spelling & grammar
   * check), early in the row so they stay visible on narrow screens.
   */
  afterFont?: React.ReactNode;
};

// Fade on the edges that have hidden buttons, so a narrow toolbar visibly scrolls
const EDGE_FADE = '24px';
const fadeMask = (left: boolean, right: boolean) => {
  if (!left && !right) return undefined;
  return `linear-gradient(to right, ${left ? 'transparent' : 'black'} 0, black ${
    left ? EDGE_FADE : '0'
  }, black calc(100% - ${right ? EDGE_FADE : '0px'}), ${right ? 'transparent' : 'black'} 100%)`;
};

const MenuBar = ({ editor, afterFont }: MenuBarProps) => {
  const userSettings = useAtomValue(userSettingsAtom);
  const { show_insert_table_button = false } = userSettings?.compose ?? {};
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setOverflow((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [updateOverflow, editor]);

  if (!editor) return null;

  const mask = fadeMask(overflow.left, overflow.right);

  return (
    <div className="flex min-w-0">
      {/* Formatting buttons: scroll sideways when the composer is narrow */}
      <div
        ref={scrollRef}
        onScroll={updateOverflow}
        // Mouse wheel scrolls the toolbar sideways
        onWheel={(e) => {
          const el = e.currentTarget;
          if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
          el.scrollLeft += e.deltaY;
        }}
        // Slim scrollbar (4px, rounded, light) instead of the heavy native one
        className="flex-initial min-w-0 overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--gray-a6)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--gray-a6)] hover:[&::-webkit-scrollbar-thumb]:bg-[var(--gray-a8)]"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        <Flex direction="row" gap="1" align="center" className="min-w-max px-1 py-1">
          <ControlMenu editor={editor} />
          <Separator orientation="vertical" className="hidden sm:block" />
          <FontFamilySelect editor={editor} />
          {afterFont}
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
    </div>
  );
};

export default MenuBar;
