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
import { parsePastedRecipients } from '../../src/utils/pastedRecipients';

const addresses = (text: string) => parsePastedRecipients(text).recipients.map((r) => r.address);

describe('pasting several recipients', () => {
  it('comma separated', () => {
    expect(addresses('a@example.com, b@example.com,c@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
  });

  it('semicolon separated (Outlook)', () => {
    expect(addresses('a@example.com; b@example.com;c@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
  });

  it('only spaces between them', () => {
    expect(addresses('a@example.com   b@example.com c@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
  });

  it('one per line, e.g. a column copied from Excel (with empty lines and tabs)', () => {
    expect(addresses('a@example.com\r\nb@example.com\n\n\tc@example.com\n')).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
  });

  it('a mix of all separators', () => {
    expect(
      addresses('a@example.com, b@example.com; c@example.com d@example.com\ne@example.com')
    ).toHaveLength(5);
  });

  it('"Name <address>" as mail apps copy it, keeping the names', () => {
    expect(
      parsePastedRecipients(
        'Ravi Kumar <ravi@example.com>; Asha <asha@example.com>, ops@example.com'
      ).recipients
    ).toEqual([
      { name: 'Ravi Kumar', address: 'ravi@example.com' },
      { name: 'Asha', address: 'asha@example.com' },
      { name: '', address: 'ops@example.com' },
    ]);
  });

  it('quoted names with a comma inside', () => {
    expect(
      parsePastedRecipients('"Kumar, Ravi" <ravi@example.com>, "Asha K" <asha@example.com>')
        .recipients
    ).toEqual([
      { name: 'Kumar, Ravi', address: 'ravi@example.com' },
      { name: 'Asha K', address: 'asha@example.com' },
    ]);
  });

  it('a "To:" line copied from an email header', () => {
    expect(parsePastedRecipients('To: Ravi <ravi@example.com>').recipients).toEqual([
      { name: 'Ravi', address: 'ravi@example.com' },
    ]);
  });

  it('addresses inside a sentence, without the punctuation', () => {
    expect(addresses('Please add ravi@example.com and (asha@example.com).')).toEqual([
      'ravi@example.com',
      'asha@example.com',
    ]);
  });

  it('mailto: links', () => {
    expect(addresses('mailto:ravi@example.com, <mailto:asha@example.com>')).toEqual([
      'ravi@example.com',
      'asha@example.com',
    ]);
  });

  it('the same address twice counts once (any letter case)', () => {
    expect(addresses('ravi@example.com, RAVI@example.com, asha@example.com')).toEqual([
      'ravi@example.com',
      'asha@example.com',
    ]);
  });

  it('broken addresses are reported, the good ones still added', () => {
    expect(parsePastedRecipients('ravi@example.com, asha@company, kiran@example.com')).toEqual({
      recipients: [
        { name: '', address: 'ravi@example.com' },
        { name: '', address: 'kiran@example.com' },
      ],
      invalid: ['asha@company'],
    });
  });

  it('text without any address finds nothing (normal typing / contact search)', () => {
    expect(parsePastedRecipients('Ravi Kumar')).toEqual({ recipients: [], invalid: [] });
  });

  it('a name equal to the address is not used as a name', () => {
    expect(parsePastedRecipients('ravi@example.com <ravi@example.com>').recipients).toEqual([
      { name: '', address: 'ravi@example.com' },
    ]);
  });
});
