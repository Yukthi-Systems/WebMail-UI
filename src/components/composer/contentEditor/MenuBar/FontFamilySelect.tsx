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

import { Button, DropdownMenu } from '@radix-ui/themes';
import { Editor } from '@tiptap/core';
import { Fragment } from 'react';
import { FaFont } from 'react-icons/fa';

type Props = { editor: Editor };

type FontGroup = 'Sans-serif' | 'Serif' | 'Monospace' | 'Display';

const DEFAULT_FONT = 'default'; // radio value for "no font set"

const FONT_FAMILIES: { label: string; value: string; group: FontGroup }[] = [
  { label: 'Arial', value: 'Arial, sans-serif', group: 'Sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif', group: 'Sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif', group: 'Sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif', group: 'Sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif", group: 'Sans-serif' },
  {
    label: 'Century Gothic',
    value: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
    group: 'Sans-serif',
  },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif', group: 'Sans-serif' },
  {
    label: 'Gill Sans',
    value: "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif",
    group: 'Sans-serif',
  },
  {
    label: 'Lucida Sans',
    value: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
    group: 'Sans-serif',
  },
  { label: 'Georgia', value: 'Georgia, serif', group: 'Serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif", group: 'Serif' },
  {
    label: 'Palatino',
    value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    group: 'Serif',
  },
  { label: 'Garamond', value: 'Garamond, Baskerville, serif', group: 'Serif' },
  { label: 'Cambria', value: 'Cambria, Cochin, Georgia, serif', group: 'Serif' },
  { label: 'Book Antiqua', value: "'Book Antiqua', Palatino, serif", group: 'Serif' },
  { label: 'Courier New', value: "'Courier New', Courier, monospace", group: 'Monospace' },
  { label: 'Lucida Console', value: "'Lucida Console', Monaco, monospace", group: 'Monospace' },
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif', group: 'Display' },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive", group: 'Display' },
  { label: 'Arial Black', value: "'Arial Black', Gadget, sans-serif", group: 'Display' },
];

const GROUPS: FontGroup[] = ['Sans-serif', 'Serif', 'Monospace', 'Display'];

/**
 * Label for a font-family value — falls back to its first family (e.g. pasted
 * text).
 */
const fontLabel = (value: string) =>
  FONT_FAMILIES.find((font) => font.value === value)?.label ??
  value.split(',')[0].replace(/['"]/g, '').trim();

const FontFamilySelect = ({ editor }: Props) => {
  const activeFontFamily: string = editor.getAttributes('textStyle')?.fontFamily ?? '';

  const handleChange = (value: string) => {
    // If text is selected apply only to selection; otherwise apply to all content
    const chain = editor.state.selection.empty
      ? editor.chain().focus().selectAll()
      : editor.chain().focus();
    if (value === '') {
      chain.unsetFontFamily().run();
    } else {
      chain.setFontFamily(value).run();
    }
  };

  const activeLabel = activeFontFamily ? fontLabel(activeFontFamily) : 'Default';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button
          variant="soft"
          size="1"
          color="gray"
          title="Font family"
          aria-label={`Font family: ${activeLabel}`}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ width: 132, justifyContent: 'space-between', gap: 6 }}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <FaFont size={10} className="flex-shrink-0 opacity-70" />
            <span
              className="truncate text-[var(--gray-12)]"
              style={{ fontFamily: activeFontFamily || 'inherit' }}
            >
              {activeLabel}
            </span>
          </span>
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        size="2"
        align="start"
        style={{
          minWidth: 220,
          maxHeight: 'min(360px, var(--radix-dropdown-menu-content-available-height))',
        }}
        // Keep the editor's selection (focus returns to it on select)
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DropdownMenu.RadioGroup
          value={activeFontFamily || DEFAULT_FONT}
          onValueChange={(value) => handleChange(value === DEFAULT_FONT ? '' : value)}
        >
          <DropdownMenu.RadioItem value={DEFAULT_FONT}>
            <span className="flex items-baseline gap-2">
              Default
              <span className="text-[11px] text-[var(--gray-10)]">email font</span>
            </span>
          </DropdownMenu.RadioItem>

          {/* A font not in the list (e.g. from pasted text) — still shown as selected */}
          {activeFontFamily && !FONT_FAMILIES.some((font) => font.value === activeFontFamily) && (
            <DropdownMenu.RadioItem value={activeFontFamily}>
              <span style={{ fontFamily: activeFontFamily }}>{fontLabel(activeFontFamily)}</span>
            </DropdownMenu.RadioItem>
          )}

          {GROUPS.map((group) => (
            <Fragment key={group}>
              <DropdownMenu.Separator />
              <DropdownMenu.Label>{group}</DropdownMenu.Label>
              {FONT_FAMILIES.filter((font) => font.group === group).map((font) => (
                <DropdownMenu.RadioItem key={font.value} value={font.value} textValue={font.label}>
                  <span style={{ fontFamily: font.value, fontSize: 14 }}>{font.label}</span>
                </DropdownMenu.RadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default FontFamilySelect;
