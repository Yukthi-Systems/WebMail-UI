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

// TableContextMenu.tsx
import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/core';
import { FaMinus, FaArrowRight, FaArrowDown, FaTrash } from 'react-icons/fa';

type TableContextMenuProps = {
  editor: Editor;
};

type MenuPosition = {
  top: number;
  left: number;
};

const TableContextMenu = ({ editor }: TableContextMenuProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Check if the right-click happened inside a table
      const target = e.target as HTMLElement;
      const tableElement = target.closest('table');

      if (tableElement) {
        e.preventDefault();
        setIsVisible(true);
        setPosition({
          top: e.clientY,
          left: e.clientX,
        });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Adjust menu position if it would go off-screen
  useEffect(() => {
    if (isVisible && menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedLeft = position.left;
      let adjustedTop = position.top;

      if (position.left + menuRect.width > viewportWidth) {
        adjustedLeft = viewportWidth - menuRect.width - 10;
      }

      if (position.top + menuRect.height > viewportHeight) {
        adjustedTop = viewportHeight - menuRect.height - 10;
      }

      if (adjustedLeft !== position.left || adjustedTop !== position.top) {
        setPosition({ left: adjustedLeft, top: adjustedTop });
      }
    }
  }, [isVisible, position]);

  const handleAction = (action: () => void) => {
    action();
    setIsVisible(false);
  };

  return (
    <div
      ref={menuRef}
      className={`table-context-menu ${isVisible ? 'visible' : ''}`}
      style={{
        top: `${position.top - 400}px`,
        left: `${position.left < 600 ? position.left - 200 : position.left - 500}px`,
      }}
    >
      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addColumnBefore().run())}
        title="Add column before"
      >
        <FaArrowRight style={{ transform: 'rotate(180deg)' }} />
        Add Column Before
      </button>

      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addColumnAfter().run())}
        title="Add column after"
      >
        <FaArrowRight />
        Add Column After
      </button>

      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().deleteColumn().run())}
        title="Delete column"
      >
        <FaMinus />
        Delete Column
      </button>

      <div className="context-menu-divider"></div>

      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addRowBefore().run())}
        title="Add row before"
      >
        <FaArrowDown style={{ transform: 'rotate(180deg)' }} />
        Add Row Before
      </button>

      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().addRowAfter().run())}
        title="Add row after"
      >
        <FaArrowDown />
        Add Row After
      </button>

      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().deleteRow().run())}
        title="Delete row"
      >
        <FaMinus />
        Delete Row
      </button>

      <div className="context-menu-divider"></div>

      <button
        className="context-menu-item"
        onClick={() => handleAction(() => editor.chain().focus().deleteTable().run())}
        title="Delete table"
        style={{ color: '#ef4444' }}
      >
        <FaTrash />
        Delete Table
      </button>
    </div>
  );
};

export default TableContextMenu;
