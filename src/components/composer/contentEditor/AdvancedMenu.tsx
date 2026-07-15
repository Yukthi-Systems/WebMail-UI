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

/**
 * AdvancedMenu.tsx.
 *
 * A "more options" dropdown (⋯) that lives in the composer toolbar. Provides: •
 * Text alignment (paragraph-level, merged into existing style) • Font size
 * (inline TextStyle extension attribute) • Background / highlight color (inline
 * TextStyle extension attribute) • Clear all formatting.
 */

import { Editor } from '@tiptap/core';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  BsThreeDots,
  BsTextLeft,
  BsTextCenter,
  BsTextRight,
  BsJustify,
  BsEraser,
} from 'react-icons/bs';
import { Button } from '@radix-ui/themes';

type Props = { editor: Editor };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Merge a single CSS property into an existing inline style string. */
function mergeStyle(
  existing: string | null | undefined,
  property: string,
  value: string | null
): string {
  const base = (existing || '').trim();
  // Strip the existing occurrence of this property
  const cleaned = base
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.toLowerCase().startsWith(property.toLowerCase()))
    .join('; ');

  if (!value) return cleaned;
  return cleaned ? `${cleaned}; ${property}: ${value}` : `${property}: ${value}`;
}

/** Get the current text-align value from the focused paragraph/heading. */
function getActiveAlign(editor: Editor): string {
  for (const type of ['paragraph', 'heading']) {
    const attrs = editor.getAttributes(type);
    if (attrs.style) {
      const m = attrs.style.match(/text-align\s*:\s*(left|center|right|justify)/i);
      if (m) return m[1];
    }
  }
  return 'left';
}

/**
 * Apply text-align to the current paragraph or heading, preserving other
 * styles.
 */
function setAlign(editor: Editor, align: string) {
  for (const type of ['paragraph', 'heading']) {
    if (editor.isActive(type)) {
      const attrs = editor.getAttributes(type);
      const newStyle = mergeStyle(attrs.style, 'text-align', align);
      editor.chain().focus().updateAttributes(type, { style: newStyle }).run();
      return;
    }
  }
  // Fallback – paragraph
  const attrs = editor.getAttributes('paragraph');
  const newStyle = mergeStyle(attrs.style, 'text-align', align);
  editor.chain().focus().updateAttributes('paragraph', { style: newStyle }).run();
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT_SIZES = [
  { label: 'Small', value: '11px' },
  { label: 'Normal', value: '14px' },
  { label: 'Large', value: '18px' },
  { label: 'X-Large', value: '24px' },
  { label: 'Huge', value: '36px' },
];

const BG_COLORS = [
  // Row 1 – light pastels
  '#FFFF99',
  '#FFEB99',
  '#FFCCCC',
  '#FFD9B3',
  '#D4EDDA',
  '#CCE5FF',
  '#E2CCFF',
  '#FADADD',
  // Row 2 – vivid / saturated
  '#FFFF00',
  '#FFA500',
  '#FF4444',
  '#FF8C00',
  '#28A745',
  '#007BFF',
  '#6F42C1',
  '#E91E8C',
  // Row 3 – neutrals
  '#FFFFFF',
  '#F0F0F0',
  '#D0D0D0',
  '#A0A0A0',
  '#707070',
  '#404040',
  '#202020',
  '#000000',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-9)] select-none">
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdvancedMenu = ({ editor }: Props) => {
  const activeAlign = getActiveAlign(editor);

  const activeFontSize = editor.getAttributes('textStyle')?.fontSize ?? null;
  const activeBgColor = editor.getAttributes('textStyle')?.backgroundColor ?? null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="soft" size="1" title="More formatting options">
          <BsThreeDots size={15} />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          className="
            z-50 min-w-[220px] rounded-lg border border-[var(--gray-5)]
            bg-[var(--gray-1)] shadow-xl shadow-black/10
            py-1 outline-none
            data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
          "
        >
          {/* ── Text alignment ─────────────────────────────────────────── */}
          <SectionLabel>Alignment</SectionLabel>
          <div className="flex items-center gap-0.5 px-2 pb-2">
            {(
              [
                { align: 'left', Icon: BsTextLeft, title: 'Align left' },
                { align: 'center', Icon: BsTextCenter, title: 'Align center' },
                { align: 'right', Icon: BsTextRight, title: 'Align right' },
                { align: 'justify', Icon: BsJustify, title: 'Justify' },
              ] as const
            ).map(({ align, Icon, title }) => (
              <button
                key={align}
                title={title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setAlign(editor, align);
                }}
                className={`
                  flex items-center justify-center w-8 h-8 rounded transition-colors
                  ${
                    activeAlign === align
                      ? 'bg-[var(--accent-4)] text-[var(--accent-11)]'
                      : 'text-[var(--gray-11)] hover:bg-[var(--gray-3)]'
                  }
                `}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          <DropdownMenu.Separator className="h-px bg-[var(--gray-4)] my-1" />

          {/* ── Font size ──────────────────────────────────────────────── */}
          <SectionLabel>Font size</SectionLabel>
          <div className="flex flex-wrap gap-1 px-2 pb-2">
            {FONT_SIZES.map(({ label, value }) => (
              <button
                key={value}
                title={`${label} (${value})`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (activeFontSize === value) {
                    editor.commands.unsetFontSize?.();
                  } else {
                    editor.commands.setFontSize?.(value);
                  }
                }}
                style={{ fontSize: value }}
                className={`
                  px-2 py-0.5 rounded border text-xs leading-tight transition-colors
                  ${
                    activeFontSize === value
                      ? 'border-[var(--accent-7)] bg-[var(--accent-3)] text-[var(--accent-11)]'
                      : 'border-[var(--gray-5)] text-[var(--gray-11)] hover:bg-[var(--gray-3)]'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          <DropdownMenu.Separator className="h-px bg-[var(--gray-4)] my-1" />

          {/* ── Background / highlight color ───────────────────────────── */}
          <SectionLabel>Highlight color</SectionLabel>
          <div className="grid grid-cols-8 gap-1 px-2 pb-2">
            {BG_COLORS.map((color) => (
              <button
                key={color}
                title={color}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (activeBgColor === color) {
                    (editor.commands as any).unsetBackgroundColor?.();
                  } else {
                    (editor.commands as any).setBackgroundColor?.(color);
                  }
                }}
                style={{ backgroundColor: color }}
                className={`
                  w-6 h-6 rounded border transition-all
                  ${
                    activeBgColor === color
                      ? 'border-[var(--accent-9)] ring-2 ring-[var(--accent-7)] scale-110'
                      : 'border-[var(--gray-5)] hover:scale-110 hover:border-[var(--gray-8)]'
                  }
                `}
              />
            ))}
          </div>

          {/* Remove highlight */}
          {activeBgColor && (
            <div className="px-2 pb-1">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  (editor.commands as any).unsetBackgroundColor?.();
                }}
                className="w-full text-left text-xs text-[var(--red-11)] hover:text-[var(--red-12)] px-1 py-0.5 rounded hover:bg-[var(--red-2)] transition-colors"
              >
                ✕ Remove highlight
              </button>
            </div>
          )}

          <DropdownMenu.Separator className="h-px bg-[var(--gray-4)] my-1" />

          {/* ── Clear formatting ───────────────────────────────────────── */}
          <div className="px-1 pb-1">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().clearNodes().unsetAllMarks().run();
              }}
              className="
                flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm
                text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)]
                transition-colors
              "
            >
              <BsEraser size={13} />
              Clear all formatting
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default AdvancedMenu;
