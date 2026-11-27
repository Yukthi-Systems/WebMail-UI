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
import { isComposerBodyEmpty } from '../../src/utils/composerBody';

const signature =
  '<p><strong>Ravi Kumar</strong><br>Example Group</p><ul><li>Mobile: 99999</li></ul>' +
  '<p><a href="https://example.com">www.example.com</a></p><img src="cid:logo" width="120">';

// Roughly what the editor makes of it: other attributes, spacing and wrappers
const signatureAsEditorShowsIt =
  '<p></p><p></p><div><p><strong>Ravi Kumar</strong><br>Example Group</p>' +
  '<ul><li><p>Mobile: 99999</p></li></ul><p><a target="_blank" rel="noopener" href="https://example.com">www.example.com</a></p>' +
  '<img src="cid:logo" style="max-width: 100%" width="120"></div>';

describe('composer body has nothing written', () => {
  it('a new email with nothing in it', () => {
    expect(isComposerBodyEmpty('')).toBe(true);
    expect(isComposerBodyEmpty('<p></p>')).toBe(true);
    expect(isComposerBodyEmpty('<p><br></p><p>&nbsp;</p>')).toBe(true);
  });

  it('only the signature, even after the editor rewrote its HTML', () => {
    expect(isComposerBodyEmpty(signatureAsEditorShowsIt, signature)).toBe(true);
  });

  it('text written above the signature counts', () => {
    expect(isComposerBodyEmpty(`<p>Hello team</p>${signatureAsEditorShowsIt}`, signature)).toBe(
      false
    );
  });

  it('a change inside the signature counts', () => {
    expect(isComposerBodyEmpty(signatureAsEditorShowsIt.replace('99999', '88888'), signature)).toBe(
      false
    );
  });

  it('a pasted image with no text counts', () => {
    expect(isComposerBodyEmpty('<p><img src="data:image/png;base64,AAAA"></p>')).toBe(false);
    expect(
      isComposerBodyEmpty(
        `<p><img src="data:image/png;base64,AAAA"></p>${signatureAsEditorShowsIt}`,
        signature
      )
    ).toBe(false);
  });

  it('text without a signature set counts', () => {
    expect(isComposerBodyEmpty('<p>Hi</p>')).toBe(false);
  });
});
