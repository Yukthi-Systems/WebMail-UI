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

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Editor, Range } from '@tiptap/core';

export interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: Editor; range: Range }) => boolean | string;
}

interface SlashCommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
  editor: Editor;
  range: Range;
}

export interface SlashCommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        // Let the suggestion system handle execution through its command callback
        // This prevents double execution
        props.command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((selectedIndex + 1) % props.items.length);
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!props.items.length) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow-xl border border-[var(--gray-5)] overflow-hidden w-64 max-h-[300px] overflow-y-auto z-[99999]">
        <div className="text-xs font-semibold text-[var(--gray-9)] px-3 py-2 uppercase tracking-wider bg-[var(--gray-1)]">
          Basic Blocks
        </div>
        {props.items.map((item, index) => (
          <button
            type="button"
            className={`flex items-center w-full px-3 py-2 text-left transition-colors ${
              index === selectedIndex ? 'bg-[var(--gray-3)]' : 'hover:bg-[var(--gray-2)]'
            }`}
            key={index}
            onMouseDown={(e) => {
              // CRITICAL: Prevent editor blur, and execute immediately!
              e.preventDefault();
              e.stopPropagation();
              selectItem(index);
            }}
            onTouchStart={(e) => {
              // CRITICAL: Prevent touchstart from blurring input on iOS/Android
              e.preventDefault();
              e.stopPropagation();
              selectItem(index);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded border border-[var(--gray-5)] bg-white text-[var(--gray-11)] mr-3 flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--gray-12)]">{item.title}</div>
              <div className="text-xs text-[var(--gray-10)]">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

SlashCommandList.displayName = 'SlashCommandList';
