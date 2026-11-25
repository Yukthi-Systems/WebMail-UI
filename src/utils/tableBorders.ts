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

import { QUOTE_ATTR } from './emailQuote';

// Same look as the composer's table CSS, so the email shows what was written
const CELL_BORDER = 'border: 1px solid #ddd';
const CELL_PADDING = 'padding: 8px';

const declares = (element: Element, property: string) =>
  new RegExp(`(^|;)\\s*${property}\\s*:`, 'i').test(element.getAttribute('style') ?? '');

/**
 * Any border line (border, border-top, border-width...), not border-collapse /
 * border-spacing.
 */
const declaresBorder = (element: Element) =>
  /(^|;)\s*border(-(top|right|bottom|left|width|style|color)[a-z-]*)?\s*:/i.test(
    element.getAttribute('style') ?? ''
  );

const addStyle = (element: Element, declarations: string[]) => {
  const own = element.getAttribute('style')?.trim().replace(/;$/, '');
  element.setAttribute('style', [own, ...declarations].filter(Boolean).join('; '));
};

/**
 * The composer draws a border around every table cell, but a pasted table
 * (Excel, a web page) has no border of its own, so the email arrived without
 * one. Before sending, such tables get the same border the composer showed.
 *
 * Left as they are: quoted emails (a layout table must not gain borders),
 * tables with images or tables inside (signatures, layouts), and tables that
 * set any border themselves.
 */
export const addMissingTableBorders = (html: string): string => {
  if (!/<table[\s>]/i.test(html)) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  let changed = false;

  doc.querySelectorAll('table').forEach((table) => {
    if (table.closest(`[${QUOTE_ATTR}], blockquote`)) return;
    if (table.querySelector('img, table')) return;
    if (Number(table.getAttribute('border')) > 0 || declaresBorder(table)) return;

    const cells = Array.from(table.querySelectorAll('td, th')).filter(
      (cell) => cell.closest('table') === table
    );
    if (cells.length === 0 || cells.some(declaresBorder)) return;

    if (!declares(table, 'border-collapse')) addStyle(table, ['border-collapse: collapse']);
    cells.forEach((cell) =>
      addStyle(
        cell,
        /(^|;)\s*padding/i.test(cell.getAttribute('style') ?? '')
          ? [CELL_BORDER]
          : [CELL_BORDER, CELL_PADDING]
      )
    );
    // The composer shows a cell's paragraphs without margins; mail clients add one line above and below
    table.querySelectorAll('td > p, th > p').forEach((paragraph) => {
      if (!/(^|;)\s*margin/i.test(paragraph.getAttribute('style') ?? '')) {
        addStyle(paragraph, ['margin: 0']);
      }
    });
    changed = true;
  });

  return changed ? doc.body.innerHTML : html;
};
