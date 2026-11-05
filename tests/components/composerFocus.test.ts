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
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import ContentEditor from '../../src/components/composer/contentEditor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const REPLY_BODY =
  // As a real reply: the editor rewrites this html (text in a bare div), so the
  // value never equals what the editor reports
  '<p><br><br></p><div><p>My signature</p></div><div data-email-quote=""><div>On Monday, Alice wrote:</div><blockquote>Original email</blockquote></div>';

let root: Root;
let container: HTMLElement;

const show = async (props: { value: string; focusStartKey?: string }) => {
  await act(async () =>
    root.render(
      // StrictMode as in main.tsx: it runs effects twice, which moved the cursor to the end
      createElement(
        StrictMode,
        null,
        createElement(
          Theme,
          null,
          createElement(ContentEditor, { fill: true, onChange: () => {}, ...props })
        )
      )
    )
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
};

const editorElement = () => container.querySelector('.editor-content') as HTMLElement;

/** The block the cursor is in */
const cursorBlock = () => {
  const node = window.getSelection()?.anchorNode;
  return node instanceof Element ? node.closest('p') ?? node : node?.parentElement;
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('ContentEditor focusStartKey', () => {
  it('puts the cursor on the first line, above the signature and the quote', async () => {
    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });

    expect(document.activeElement).toBe(editorElement());
    expect(cursorBlock()).toBe(editorElement().querySelector('p'));
  });

  it('leaves the focus alone without a key (a new message starts at To)', async () => {
    await show({ value: REPLY_BODY });
    expect(document.activeElement).not.toBe(editorElement());
  });

  it('waits for the content before placing the cursor', async () => {
    await show({ value: '', focusStartKey: '42:reply' });
    expect(document.activeElement).not.toBe(editorElement());

    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });
    expect(document.activeElement).toBe(editorElement());
    expect(cursorBlock()).toBe(editorElement().querySelector('p'));
  });

  it('takes the focus back from a closing menu returning it to its button', async () => {
    const menuButton = document.createElement('button');
    document.body.appendChild(menuButton);
    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });
    expect(document.activeElement).toBe(editorElement());

    // What Radix does when the dropdown that opened the composer finishes closing
    menuButton.focus();
    expect(document.activeElement).toBe(menuButton);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(document.activeElement).toBe(editorElement());
    expect(cursorBlock()).toBe(editorElement().querySelector('p'));
    menuButton.remove();
  });

  it('keeps the first line in view, so the cursor can be seen', async () => {
    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });

    // The screenshot's bug: opened a little scrolled down, the first line out of view
    editorElement().scrollTop = 65;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(editorElement().scrollTop).toBe(0);
  });

  it('never moves the text once the user scrolls', async () => {
    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });

    window.dispatchEvent(new Event('wheel'));
    editorElement().scrollTop = 65;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });
    expect(editorElement().scrollTop).toBe(65);
  });

  it('never takes the focus from something the user clicked or typed in', async () => {
    const subject = document.createElement('input');
    document.body.appendChild(subject);
    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });

    window.dispatchEvent(new Event('pointerdown'));
    subject.focus();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 900));
    });
    expect(document.activeElement).toBe(subject);
    subject.remove();
  });

  it('does not take the focus back for the same email', async () => {
    const other = document.createElement('input');
    document.body.appendChild(other);
    await show({ value: REPLY_BODY, focusStartKey: '42:reply' });

    window.dispatchEvent(new Event('pointerdown'));
    other.focus();
    await show({ value: `${REPLY_BODY}<p>changed</p>`, focusStartKey: '42:reply' });
    expect(document.activeElement).toBe(other);
    other.remove();
  });
});
