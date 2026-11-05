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

import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { createEditorExtensions } from '../../src/components/composer/contentEditor';
import {
  QUOTE_ATTR,
  extractQuote,
  hasQuote,
  prepareOutgoingHtml,
  withoutQuote,
  wrapQuote,
  type OriginalQuote,
} from '../../src/utils/emailQuote';
import { buildCheckableText } from '../../src/components/composer/contentEditor/grammar/GrammarCheckExtension';

const REPLY = '<p>My answer, see attached</p>';
// What real mail looks like: layout tables without borders, bgcolor, inline styles
const ORIGINAL = `<div style="font-size: 14px;">On Monday, <strong>Alice</strong> wrote:</div>
<blockquote style="border-left: 3px solid #8b5cf6;">
  <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#fafafa" style="margin: 0 auto;">
    <tbody><tr><td align="center" valign="top" style="padding: 20px;"><a href="https://x.com"><img src="https://x.com/a.png" width="100"></a></td>
    <td><font color="red">old tag</font><center>centered</center></td></tr></tbody>
  </table>
</blockquote>`;

const body = REPLY + wrapQuote(ORIGINAL);

const editors: Editor[] = [];
const open = (content: string) => {
  const editor = new Editor({ extensions: createEditorExtensions(), content });
  editors.push(editor);
  return editor;
};

// As the composer does: the original, and what the editor made of it
const originalOf = (html: string, editorHtml: string): OriginalQuote => ({
  raw: extractQuote(html),
  normalized: extractQuote(editorHtml),
});

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

const send = (html: string, original: OriginalQuote) =>
  prepareOutgoingHtml(html, original, { keepMarker: false });

describe('quote in the editor', () => {
  it('keeps the quote as one marked block of the document', () => {
    const html = open(body).getHTML();
    expect(hasQuote(html)).toBe(true);
    expect(html).toContain('My answer');
    expect(extractQuote(html)).toContain('On Monday');
  });

  it('keeps the look of a quoted table in the editor, without adding borders', () => {
    const quote = extractQuote(open(body).getHTML()) as string;
    expect(quote).toContain('bgcolor="#fafafa"');
    expect(quote).toContain('cellpadding="0"');
    expect(quote).toContain('padding: 20px');
    expect(quote).toContain('valign="top"');
    expect(quote).not.toContain('1px solid #ddd');
  });

  it('still gives a table made in the editor its default look', () => {
    const editor = open('<p>x</p>');
    editor.commands.insertTable({ rows: 1, cols: 1 });
    expect(editor.getHTML()).toContain('1px solid #ddd');
  });

  it('applies the toolbar to text inside the quote', () => {
    const editor = open(body);
    let from = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.startsWith('On Monday')) from = pos;
    });
    editor.chain().setTextSelection({ from, to: from + 2 }).toggleBold().run();
    expect(extractQuote(editor.getHTML())).toContain('<strong>On</strong>');
  });

  it('leaves the quote out of the spelling check', () => {
    const { text } = buildCheckableText(open(body).state.doc);
    expect(text).toContain('My answer');
    expect(text).not.toContain('Monday');
  });
});

describe('sending', () => {
  it('sends the exact original when the quote was not touched, even after typing a reply', () => {
    const editor = open(body);
    const original = originalOf(body, editor.getHTML());

    editor.commands.insertContentAt(1, 'Hello ');
    const sent = send(editor.getHTML(), original);

    expect(sent).toContain('Hello My answer');
    expect(sent).toContain('<font color="red">old tag</font>');
    expect(sent).toContain('<center>centered</center>');
    expect(extractQuote(wrapQuote(ORIGINAL))).toBe(
      new DOMParser().parseFromString(ORIGINAL, 'text/html').body.innerHTML
    );
  });

  it('sends the original when nothing was typed at all', () => {
    const original = originalOf(body, open(body).getHTML());
    expect(send(body, original)).toContain('<center>centered</center>');
  });

  it('sends the edited quote when the user changed it', () => {
    const editor = open(body);
    const original = originalOf(body, editor.getHTML());
    let from = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text?.startsWith('On Monday')) from = pos;
    });
    editor.commands.insertContentAt(from, 'EDITED ');

    expect(send(editor.getHTML(), original)).toContain('EDITED');
  });

  it('sends no quote when the user removed it', () => {
    const editor = open(body);
    const original = originalOf(body, editor.getHTML());
    editor.commands.setContent(REPLY);
    const sent = send(editor.getHTML(), original);
    expect(sent).not.toContain('On Monday');
    expect(sent).toContain('My answer');
  });

  it('removes the marker from sent mail but keeps it in drafts', () => {
    const original = originalOf(body, open(body).getHTML());
    expect(send(body, original)).not.toContain(QUOTE_ATTR);
    expect(prepareOutgoingHtml(body, original, { keepMarker: true })).toContain(QUOTE_ATTR);
  });

  it('leaves html without a quote untouched', () => {
    const html = '<p>plain <b>new</b> mail</p>';
    expect(send(html, { raw: null, normalized: null })).toBe(html);
  });

  it('finds the original again when a saved draft is reopened', () => {
    const editor = open(body);
    const draft = prepareOutgoingHtml(editor.getHTML(), originalOf(body, editor.getHTML()), {
      keepMarker: true,
    });
    const reopened = open(draft);
    const sent = send(reopened.getHTML(), originalOf(draft, reopened.getHTML()));
    expect(sent).toContain('<center>centered</center>');
    expect(sent).not.toContain(QUOTE_ATTR);
  });
});

describe('withoutQuote', () => {
  it('leaves only what the user wrote', () => {
    expect(withoutQuote(body)).toBe(REPLY);
    expect(withoutQuote(REPLY)).toBe(REPLY);
  });
});

describe('typing speed', () => {
  it('serializes a very long quote quickly enough to run on each keystroke', () => {
    const row = '<tr><td style="padding: 8px;"><p>Some line of a long email thread</p></td></tr>';
    const long = REPLY + wrapQuote(`<table><tbody>${row.repeat(1500)}</tbody></table>`);
    const editor = open(long);
    const start = performance.now();
    for (let i = 0; i < 5; i++) editor.getHTML();
    const perCall = (performance.now() - start) / 5;
    console.info(`getHTML on ${long.length} bytes: ${perCall.toFixed(1)} ms`);
    expect(perCall).toBeLessThan(200);
  });
});
