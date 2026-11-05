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

import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { EmailLike } from '../utils/threads';

// Keeps a little of the card above in view, so it's clear there are earlier emails
const TOP_GAP_PX = 8;
// The opened email's body and images have loaded by then
const MAX_FOLLOW_MS = 10_000;
const USER_INPUT_EVENTS = ['wheel', 'touchmove', 'pointerdown', 'keydown'] as const;

/**
 * The email a conversation should open at: the first search match if there are
 * matches, otherwise the email that was opened. UIDs are per folder.
 */
export function findOpenEmail(
  emails: EmailLike[],
  uid: string,
  folder: string,
  matchedEmailIds?: number[]
): EmailLike | undefined {
  const inFolder = emails.filter((email) => email.folderPath === folder);
  return (
    inFolder.find((email) => matchedEmailIds?.includes(Number(email.id))) ??
    inFolder.find((email) => String(email.id) === uid)
  );
}

/** Nearest ancestor that scrolls: one with overflow, else the first that could. */
function findScroller(element: HTMLElement): HTMLElement | null {
  let scrollable: HTMLElement | null = null;
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    if (node.scrollHeight > node.clientHeight) return node;
    scrollable ??= node;
  }
  return scrollable;
}

/**
 * Opens a conversation at one email, once per `openKey`, before the first
 * paint.
 *
 * Keeps following it while its body loads: an email near the bottom can only
 * reach the top of the view once the content below it has grown. Stops as soon
 * as the user scrolls, clicks or presses a key, and never runs again when the
 * conversation reloads (new reply, mark as read), so it can't move the view
 * while someone is reading.
 */
export function useScrollToOpenEmail(
  targetRef: RefObject<HTMLElement | null>,
  openKey: string,
  /** The target element is rendered. */
  ready: boolean
) {
  const scrolledKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    const target = targetRef.current;
    if (!ready || !target || scrolledKey.current === openKey) return;
    scrolledKey.current = openKey;

    const align = () => {
      const scroller = findScroller(target);
      if (!scroller) return;
      scroller.scrollTop +=
        target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - TOP_GAP_PX;
    };
    align();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(align);
    observer?.observe(target);

    const stop = () => {
      observer?.disconnect();
      clearTimeout(timer);
      USER_INPUT_EVENTS.forEach((type) => window.removeEventListener(type, stop, true));
    };
    const timer = setTimeout(stop, MAX_FOLLOW_MS);
    USER_INPUT_EVENTS.forEach((type) =>
      window.addEventListener(type, stop, { capture: true, passive: true })
    );
    return stop;
  }, [targetRef, openKey, ready]);
}
