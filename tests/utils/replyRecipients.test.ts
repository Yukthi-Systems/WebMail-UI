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
import { buildReplyRecipients } from '../../src/utils/replyForwardHelper';

const me = 'me@example.com';
const addrs = (list: { address: string }[]) => list.map((a) => a.address);

describe('buildReplyRecipients: Reply All', () => {
  it('replies to the sender and everyone else, never to me', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'Alice <alice@example.com>',
      to: 'me@example.com, bob@example.com',
      cc: 'carol@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['alice@example.com', 'bob@example.com']);
    expect(addrs(r.cc)).toEqual(['carol@example.com']);
  });

  it('removes me from Cc too', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'alice@example.com',
      to: 'bob@example.com',
      cc: 'Me <me@example.com>, carol@example.com',
      me,
    });
    expect(addrs(r.cc)).toEqual(['carol@example.com']);
  });

  it('ignores capital letters when matching my address', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'alice@example.com',
      to: 'Me@Example.com',
      cc: 'ME@EXAMPLE.COM',
      me,
    });
    expect(addrs(r.to)).toEqual(['alice@example.com']);
    expect(r.cc).toEqual([]);
  });

  it('on my own sent message, replies to its recipients and not to me', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'Me <Me@example.com>',
      replyTo: 'me@example.com',
      to: 'alice@example.com, bob@example.com',
      cc: 'carol@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['alice@example.com', 'bob@example.com']);
    expect(addrs(r.cc)).toEqual(['carol@example.com']);
  });

  it('uses Reply-To instead of the sender', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'noreply@shop.com',
      replyTo: 'support@shop.com',
      to: 'me@example.com, bob@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['support@shop.com', 'bob@example.com']);
  });

  it('lists each person once, To before Cc', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'alice@example.com',
      to: 'bob@example.com, Alice@example.com',
      cc: 'bob@example.com, carol@example.com, carol@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['alice@example.com', 'bob@example.com']);
    expect(addrs(r.cc)).toEqual(['carol@example.com']);
  });

  it('moves Cc into To when To would be empty', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'me@example.com',
      to: 'me@example.com',
      cc: 'carol@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['carol@example.com']);
    expect(r.cc).toEqual([]);
  });

  it('a message only to myself replies to myself', () => {
    const r = buildReplyRecipients('replyAll', {
      from: 'me@example.com',
      to: 'me@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['me@example.com']);
  });

  it('keeps names', () => {
    const r = buildReplyRecipients('replyAll', {
      from: '"Alice A" <alice@example.com>',
      to: 'Bob B <bob@example.com>',
      me,
    });
    expect(r.to).toEqual([
      { name: 'Alice A', address: 'alice@example.com' },
      { name: 'Bob B', address: 'bob@example.com' },
    ]);
  });
});

describe('buildReplyRecipients: Reply', () => {
  it('replies to the sender only', () => {
    const r = buildReplyRecipients('reply', {
      from: 'alice@example.com',
      to: 'me@example.com, bob@example.com',
      cc: 'carol@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['alice@example.com']);
    expect(r.cc).toEqual([]);
  });

  it('uses Reply-To instead of the sender', () => {
    const r = buildReplyRecipients('reply', {
      from: 'noreply@shop.com',
      replyTo: 'support@shop.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['support@shop.com']);
  });

  it('on my own sent message, replies to its recipients', () => {
    const r = buildReplyRecipients('reply', {
      from: 'me@example.com',
      to: 'alice@example.com',
      cc: 'carol@example.com',
      me,
    });
    expect(addrs(r.to)).toEqual(['alice@example.com']);
    expect(r.cc).toEqual([]);
  });
});
