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
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { sanitize, listeners } = vi.hoisted(() => ({
  sanitize: vi.fn<(html: string, blockExternal: boolean) => string>((html) => html),
  listeners: {} as Record<string, () => void>,
}));
vi.mock('../../../src/utils/sanitizeHTMLContent', () => ({ sanitizeHTMLContent: sanitize }));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    subscribe: (event: string, listener: () => void) => {
      listeners[event] = listener;
      return () => {};
    },
  }),
}));

import { useStableCallback } from '../../../src/hooks/useStableCallback';
import { GlobalLoader } from '../../../src/components/common/GlobalLoading';
import EmailHtmlContent from '../../../src/components/mailbox/EmailList/EmailViewer/EmailTabs/EmailHtmlContent';
import EmailCard from '../../../src/components/mailbox/EmailList/EmailCard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  root = createRoot(container);
  sanitize.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

describe('EmailCard', () => {
  it('is memoized', () => {
    expect((EmailCard as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'));
  });
});

describe('useStableCallback', () => {
  it('keeps its identity and runs the latest function', async () => {
    const seen: (() => number)[] = [];
    let bump: () => void = () => {};
    const Probe = () => {
      const [count, setCount] = useState(0);
      bump = () => setCount((value) => value + 1);
      seen.push(useStableCallback(() => count));
      return null;
    };
    await act(async () => root.render(createElement(Probe)));
    await act(async () => bump());

    expect(seen[0]).toBe(seen[seen.length - 1]);
    expect(seen[0]()).toBe(1);
  });
});

describe('GlobalLoader', () => {
  it('shows nothing for a quick navigation, the spinner for a slow one', async () => {
    vi.useFakeTimers();
    await act(async () => root.render(createElement(GlobalLoader)));

    act(() => listeners.onBeforeLoad());
    act(() => vi.advanceTimersByTime(200));
    act(() => listeners.onResolved());
    act(() => vi.advanceTimersByTime(500));
    expect(container.innerHTML).toBe('');

    act(() => listeners.onBeforeLoad());
    act(() => vi.advanceTimersByTime(300));
    expect(container.innerHTML).not.toBe('');

    act(() => listeners.onResolved());
    expect(container.innerHTML).toBe('');
  });
});

describe('EmailHtmlContent', () => {
  const show = (allowExternalContent: boolean) =>
    act(async () =>
      root.render(
        createElement(EmailHtmlContent, {
          htmlContent: '<p>hi</p>',
          allowExternalContent,
          onToggleExternalContent: () => {},
        })
      )
    );

  it('sanitizes only the version shown, once', async () => {
    await show(false);
    expect(sanitize.mock.calls.map((call) => call[1])).toEqual([true]);

    await show(true);
    expect(sanitize.mock.calls.map((call) => call[1])).toEqual([true, false]);
  });
});
