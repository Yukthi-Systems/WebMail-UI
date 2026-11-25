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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDeletePromptSkipped, skipDeletePromptThisSession } from '../../src/utils/deletePrompt';

describe('delete prompt for this session', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('asks by default', () => {
    expect(isDeletePromptSkipped()).toBe(false);
  });

  it('stops asking once the user ticks "Don\'t ask again"', () => {
    skipDeletePromptThisSession();
    expect(isDeletePromptSkipped()).toBe(true);
  });

  it('asks again in a new session (logout clears sessionStorage)', () => {
    skipDeletePromptThisSession();
    sessionStorage.clear();
    expect(isDeletePromptSkipped()).toBe(false);
  });

  it('keeps asking when storage is blocked, without breaking delete', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => skipDeletePromptThisSession()).not.toThrow();
    expect(isDeletePromptSkipped()).toBe(false);
  });
});
