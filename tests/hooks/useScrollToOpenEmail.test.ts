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
import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { findOpenEmail, useScrollToOpenEmail } from '../../src/hooks/useScrollToOpenEmail';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('findOpenEmail', () => {
  const emails = [
    { id: '310', folderPath: 'Sent' },
    { id: '67', folderPath: 'INBOX' },
    { id: '5', folderPath: 'INBOX' },
    { id: '5', folderPath: 'Sent' },
  ];

  it('finds the opened email in its own folder (UIDs repeat across folders)', () => {
    expect(findOpenEmail(emails, '67', 'INBOX')).toBe(emails[1]);
    expect(findOpenEmail(emails, '5', 'Sent')).toBe(emails[3]);
  });

  it('prefers the first search match', () => {
    expect(findOpenEmail(emails, '67', 'INBOX', [5])).toBe(emails[2]);
  });

  it('falls back to the opened email when the matches are gone', () => {
    expect(findOpenEmail(emails, '67', 'INBOX', [999])).toBe(emails[1]);
  });

  it('finds nothing for an email not in the conversation', () => {
    expect(findOpenEmail(emails, '1', 'INBOX')).toBeUndefined();
  });
});

describe('useScrollToOpenEmail', () => {
  const TARGET_OFFSET = 500;
  let root: Root;
  let scroller: HTMLElement;
  let resize: () => void;

  /** The target sits TARGET_OFFSET below the top of the content; scrolling moves it up */
  const Probe = ({ openKey, ready = true }: { openKey: string; ready?: boolean }) => {
    const targetRef = useRef<HTMLDivElement>(null);
    useScrollToOpenEmail(targetRef, openKey, ready);
    return createElement('div', {
      ref: (node: HTMLDivElement | null) => {
        targetRef.current = node;
        if (node) {
          node.getBoundingClientRect = () =>
            ({ top: TARGET_OFFSET - scroller.scrollTop }) as DOMRect;
        }
      },
    });
  };

  const show = (props: { openKey: string; ready?: boolean }) =>
    act(async () => root.render(createElement(Probe, props)));

  beforeEach(() => {
    scroller = document.createElement('div');
    scroller.style.overflowY = 'auto';
    scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
    Object.defineProperty(scroller, 'scrollHeight', { value: 2000 });
    Object.defineProperty(scroller, 'clientHeight', { value: 400 });
    document.body.appendChild(scroller);
    root = createRoot(scroller);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect() {
          resize = () => {
            throw new Error('still following after it should have stopped');
          };
        }
      }
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    scroller.remove();
    vi.unstubAllGlobals();
  });

  it('scrolls the opened email to the top of the view, leaving a small gap', async () => {
    await show({ openKey: 'INBOX:67' });
    expect(scroller.scrollTop).toBe(TARGET_OFFSET - 8);
  });

  it('waits until the email is rendered', async () => {
    await show({ openKey: 'INBOX:67', ready: false });
    expect(scroller.scrollTop).toBe(0);
    await show({ openKey: 'INBOX:67', ready: true });
    expect(scroller.scrollTop).toBe(TARGET_OFFSET - 8);
  });

  it('does not move the view again when the conversation re-renders', async () => {
    await show({ openKey: 'INBOX:67' });
    scroller.scrollTop = 0; // the user went back up
    await show({ openKey: 'INBOX:67' });
    expect(scroller.scrollTop).toBe(0);
  });

  it('keeps following while the body loads, also across re-renders', async () => {
    await show({ openKey: 'INBOX:67' });
    await show({ openKey: 'INBOX:67' });
    scroller.scrollTop = 100; // could not reach the target yet: the content was too short
    resize();
    expect(scroller.scrollTop).toBe(TARGET_OFFSET - 8);
  });

  it('stops following as soon as the user scrolls', async () => {
    await show({ openKey: 'INBOX:67' });
    window.dispatchEvent(new Event('wheel'));
    expect(resize).toThrow('still following');
  });

  it('scrolls again when another email is opened', async () => {
    await show({ openKey: 'INBOX:67' });
    scroller.scrollTop = 0;
    await show({ openKey: 'INBOX:80' });
    expect(scroller.scrollTop).toBe(TARGET_OFFSET - 8);
  });
});
