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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';

const fetchWithAuth = vi.fn();
vi.mock('../../src/api/fetchWrapper.ts', () => ({ fetchWithAuth }));

const { createEditorExtensions } = await import('../../src/components/composer/contentEditor');
const { sendMailV2 } = await import('../../src/api/composer');
const { addMissingTableBorders } = await import('../../src/utils/tableBorders');
const { QUOTE_ATTR } = await import('../../src/utils/emailQuote');

// jsdom has no ClipboardEvent; the editor creates one when pasting
(globalThis as { ClipboardEvent?: unknown }).ClipboardEvent ??= class extends Event {
  clipboardData = null;
};

// A table copied from a web page (like the admin users list): no borders of its own
const WEB_PAGE_TABLE = `<meta charset="utf-8"><table><thead><tr>
<th>Email Prefix</th><th>Domain</th><th>First Name</th></tr></thead><tbody>
<tr><td>saif</td><td><a href="https://devtest1.example.com">devtest1.example.com</a></td><td>Saif</td></tr>
<tr><td>joe</td><td><a href="https://devtest1.example.com">devtest1.example.com</a></td><td>joe</td></tr>
</tbody></table>`;

// What Excel puts on the clipboard: the borders are classes in a <style> block
const EXCEL_TABLE = `<html><head><style><!--
td { mso-ignore: padding; font-size: 11pt; }
.xl65 { border: .5pt solid windowtext; }
--></style></head><body><!--StartFragment-->
<table border=0 cellpadding=0 cellspacing=0 style="border-collapse:collapse">
<tr><td class=xl65 style="height:15pt">Ficus</td><td class=xl65>VADODARA391440</td></tr>
<tr><td class=xl65 style="height:15pt">Ficus</td><td class=xl65>51,750</td></tr>
</table><!--EndFragment--></body></html>`;

let editor: Editor | undefined;
afterEach(() => editor?.destroy());

/** Pastes into the composer's editor, returns its html (what the composer sends) */
const composeByPasting = (clipboardHtml: string) => {
  editor = new Editor({ extensions: createEditorExtensions(), content: '<p></p>' });
  editor.view.pasteHTML(clipboardHtml);
  return editor.getHTML();
};

/** Sends like the composer does, returns the body_html that reaches the API. */
const send = async (bodyHtml: string) => {
  await sendMailV2({
    from_id: { email: 'sender@example.com' },
    to: [{ email: 'recipient@example.com' }],
    cc: [],
    bcc: [],
    subject: 'Table',
    body_html: bodyHtml,
    attachments: [],
    in_line_attachments: [],
    is_draft: false,
    draft_saved: false,
  });
  const form = fetchWithAuth.mock.calls[0][1].body as FormData;
  return JSON.parse(form.get('data') as string).body_html as string;
};

const cellsOf = (html: string, selector = 'table') => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll(`${selector} td, ${selector} th`)) as HTMLElement[];
};
const bordered = (cell: HTMLElement) => cell.style.borderTopStyle === 'solid';
// Line breaks added after closing tags change nothing in how it looks
const unbroken = (html: string) => html.replace(/>\n/g, '>');

describe('a pasted table in the sent email', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
    fetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('before the fix: the composer html of a pasted table has no borders (the bug)', () => {
    const cells = cellsOf(composeByPasting(WEB_PAGE_TABLE));
    expect(cells).toHaveLength(9);
    expect(cells.some(bordered)).toBe(false);
  });

  it('a table pasted from a web page is sent with a border on every cell', async () => {
    const sent = await send(composeByPasting(WEB_PAGE_TABLE));
    const cells = cellsOf(sent);
    expect(cells).toHaveLength(9);
    expect(cells.every(bordered)).toBe(true);
    expect(sent).toContain('devtest1.example.com');
    expect(sent).toContain('Email Prefix');
  });

  it('rows are as tall as in the composer (no extra space around the cell text)', async () => {
    const sent = await send(composeByPasting(WEB_PAGE_TABLE));
    const paragraphs = Array.from(
      new DOMParser().parseFromString(sent, 'text/html').querySelectorAll('td p, th p')
    ) as HTMLElement[];
    expect(paragraphs.length).toBeGreaterThan(0);
    expect(paragraphs.every((p) => p.style.margin === '0px' || p.style.margin === '0')).toBe(true);
  });

  it('a table pasted from Excel is sent with a border on every cell', async () => {
    const cells = cellsOf(await send(composeByPasting(EXCEL_TABLE)));
    expect(cells).toHaveLength(4);
    expect(cells.every(bordered)).toBe(true);
  });

  it('a table made with the toolbar is sent exactly as before', async () => {
    editor = new Editor({ extensions: createEditorExtensions(), content: '<p></p>' });
    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true });
    const html = editor.getHTML();
    expect(unbroken(await send(html))).toBe(html);
  });

  it('a quoted email in a reply keeps its layout tables without borders', async () => {
    const reply =
      '<p>See below</p>' +
      `<div ${QUOTE_ATTR}=""><table><tr><td>layout</td><td>cell</td></tr></table></div>`;
    expect(unbroken(await send(reply))).toBe(reply);
  });

  it('a signature laid out with a table and a logo is left alone', async () => {
    const signature =
      '<p>Thanks</p><table><tr><td><img src="cid:logo"></td><td>Name<br>Company</td></tr></table>';
    expect(unbroken(await send(signature))).toBe(signature);
  });

  it('a table whose cells draw their own borders is left alone', async () => {
    const own = '<table><tr><td style="border: 2px dashed red">a</td><td>b</td></tr></table>';
    const withAttribute = '<table border="1"><tr><td>a</td></tr></table>';
    expect(addMissingTableBorders(own)).toBe(own);
    expect(addMissingTableBorders(withAttribute)).toBe(withAttribute);
  });

  it('a range copied from Excel (cells with border-top/left: none) gets borders', async () => {
    // Excel draws the lines with a class and removes the shared ones inline
    const excelRange = `<html><head><style><!--.xl65{border:.5pt solid windowtext;}--></style></head>
<body><!--StartFragment--><table border=0 cellpadding=0 cellspacing=0 style='border-collapse:collapse'>
<tr><td class=xl65>Month</td><td class=xl65 style='border-left:none'>Vendor</td></tr>
<tr><td class=xl65 style='border-top:none'>Aug-26</td>
<td class=xl65 style='border-top:none;border-left:none'>Umar Traders</td></tr>
</table><!--EndFragment--></body></html>`;
    const cells = cellsOf(await send(composeByPasting(excelRange)));
    expect(cells).toHaveLength(4);
    // The added border comes after the inline "none", so it wins on every side
    for (const cell of cells) {
      for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        expect(cell.style[`border${side}Style`]).toBe('solid');
      }
    }
  });

  it('an email without tables is sent unchanged', async () => {
    expect(unbroken(await send('<p>Hello</p>'))).toBe('<p>Hello</p>');
  });

  it('the composer table with an outer border but no cell borders (sent from ChatGPT paste)', async () => {
    // body_html of the reported email, as the composer produced it
    const rows = [
      ['101', 'Rahul', 'IT', 'rahul@test.com', 'Delhi', 'Active'],
      ['102', 'Amit', 'HR', 'amit@test.com', 'Mumbai', 'Active'],
      ['103', 'Priya', 'Sales', 'priya@test.com', 'Noida', 'Active'],
      ['104', 'Neha', 'Finance', 'neha@test.com', 'Pune', 'Inactive'],
      ['105', 'Karan', 'Testing', 'karan@test.com', 'Jaipur', 'Active'],
    ];
    const cell = (tag: string, text: string) =>
      `<${tag} colspan="1" rowspan="1"><p>${text}</p></${tag}>`;
    const html =
      '<table style="border-collapse: collapse; width: 100%; margin: 12px 0; border: 1px solid #ddd;"><tbody>' +
      `<tr>${['Employee ID', 'Name', 'Department', 'Email', 'Location', 'Status'].map((t) => cell('th', t)).join('')}</tr>` +
      rows.map((row) => `<tr>${row.map((t) => cell('td', t)).join('')}</tr>`).join('') +
      '</tbody></table>';
    expect(html.length).toBeGreaterThan(998); // one line, long enough to be cut on the way

    const sent = await send(html);
    const cells = cellsOf(sent);
    expect(cells).toHaveLength(36);
    expect(cells.every(bordered)).toBe(true);
    // No line long enough for a server to cut ("103" arrived as "1 03")
    expect(Math.max(...sent.split('\n').map((line) => line.length))).toBeLessThan(998);
    expect(cells.map((c) => c.textContent?.trim())).toContain('103');
  });

  it('a code block keeps its lines exactly', async () => {
    const code = '<pre><code>line one</p>\nline two</code></pre>';
    expect(await send(`<p>Code:</p>${code}`)).toBe(`<p>Code:</p>\n${code}`);
  });
});
