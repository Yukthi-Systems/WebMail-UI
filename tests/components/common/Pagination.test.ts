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
import { listCountLabels } from '../../utils/emailListUtils';
import Pagination from './Pagination';

const render = (props: { countLabel?: string; countTooltip?: string }) =>
  renderToStaticMarkup(
    createElement(
      Theme,
      null,
      createElement(Pagination, {
        currentPage: 1,
        totalPages: 299,
        totalCount: 14937,
        onPageChange: () => {},
        ...props,
      })
    )
  ).replace(/<!-- -->/g, '');

describe('Pagination count', () => {
  it('shows the emails of a conversation list, not the conversations', () => {
    const { label, tooltip } = listCountLabels(14937, 28136);
    const html = render({ countLabel: label, countTooltip: tooltip });
    expect(html).toContain('• 28136 emails');
    expect(html).not.toContain('14937 emails');
    expect(tooltip).toBe('14937 conversations');
  });

  it('keeps the old text for other lists', () => {
    expect(render({})).toContain('• 14937 emails');
  });
});

describe('listCountLabels', () => {
  it('has no tooltip when each row is one email', () => {
    expect(listCountLabels(28136)).toEqual({ label: '28136 emails' });
  });

  it('uses the singular for one', () => {
    expect(listCountLabels(1, 1)).toEqual({ label: '1 email', tooltip: '1 conversation' });
  });
});
