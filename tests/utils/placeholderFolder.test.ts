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

import { describe, expect, it } from 'vitest';
import { isPlaceholderFolder } from '../../src/utils/folderUtils';

describe('isPlaceholderFolder', () => {
  it('is a folder the server says can not hold emails', () => {
    // As /folder/path sends it: flags without the backslash
    expect(isPlaceholderFolder(['Noselect', 'HasChildren'])).toBe(true);
    expect(isPlaceholderFolder(['\\Noselect'])).toBe(true);
    expect(isPlaceholderFolder(['NonExistent'])).toBe(true);
  });

  it('is not a normal folder', () => {
    expect(isPlaceholderFolder(['HasNoChildren', 'UnMarked'])).toBe(false);
    expect(isPlaceholderFolder(['HasChildren'])).toBe(false);
    expect(isPlaceholderFolder(undefined)).toBe(false);
  });
});
