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

import { Theme } from '@radix-ui/themes';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PENDING_REPLY_NOTICE, PendingReplyNotice } from '../../../../../../../src/components/mailbox/EmailList/EmailViewer/ThreadView/ThreadEmailCard/PendingReplyNotice';

describe('PendingReplyNotice', () => {
  it('shows a ! that explains itself to pointer, keyboard and screen reader users', () => {
    const html = renderToStaticMarkup(createElement(Theme, null, createElement(PendingReplyNotice)));
    expect(html).toContain('>!</span>');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain(`aria-label="${PENDING_REPLY_NOTICE}"`);
  });
});
