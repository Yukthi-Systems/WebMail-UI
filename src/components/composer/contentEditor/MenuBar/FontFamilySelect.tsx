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

type Props = { editor: Editor };

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  // Sans-serif
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Century Gothic', value: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif" },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
  { label: 'Gill Sans', value: "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif" },
  { label: 'Lucida Sans', value: "'Lucida Sans Unicode', 'Lucida Grande', sans-serif" },
  // Serif
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Palatino', value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: 'Garamond', value: 'Garamond, Baskerville, serif' },
  { label: 'Cambria', value: 'Cambria, Cochin, Georgia, serif' },
  { label: 'Book Antiqua', value: "'Book Antiqua', Palatino, serif" },
  // Monospace
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Lucida Console', value: "'Lucida Console', Monaco, monospace" },
  // Display
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
  { label: 'Arial Black', value: "'Arial Black', Gadget, sans-serif" },
];

const FontFamilySelect = ({ editor }: Props) => {
  const activeFontFamily = editor.getAttributes('textStyle')?.fontFamily ?? '';

  const handleChange = (value: string) => {
    // If text is selected apply only to selection; otherwise apply to all content
    if (editor.state.selection.empty) {
      if (value === '') {
        editor.chain().focus().selectAll().unsetFontFamily().run();
      } else {
        editor.chain().focus().selectAll().setFontFamily(value).run();
      }
    } else {
      if (value === '') {
        editor.chain().focus().unsetFontFamily().run();
      } else {
        editor.chain().focus().setFontFamily(value).run();
      }
    }
  };

  return (
    <select
      value={activeFontFamily}
      onChange={(e) => handleChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className="
        h-7 px-1.5 rounded border border-[var(--gray-5)] bg-[var(--gray-1)]
        text-xs text-[var(--gray-11)] cursor-pointer
        hover:border-[var(--gray-7)] hover:bg-[var(--gray-2)]
        focus:outline-none focus:border-[var(--accent-7)]
        transition-colors
      "
      style={{ fontFamily: activeFontFamily || 'inherit' }}
      title="Font family"
    >
      {FONT_FAMILIES.map(({ label, value }) => (
        <option key={label} value={value} style={{ fontFamily: value || 'inherit' }}>
          {label}
        </option>
      ))}
    </select>
  );
};

export default FontFamilySelect;
