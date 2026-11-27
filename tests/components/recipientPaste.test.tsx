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
import { act, createRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import RecipientField, {
  type RecipientFieldHandle,
} from '../../src/components/composer/RecipientField';
import type { EmailAddress } from '../../src/state/composer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = vi.fn();
let root: Root;
let container: HTMLDivElement;
let current: EmailAddress[] = [];
const fieldRef = createRef<RecipientFieldHandle>();

const Field = ({ initial = [] as EmailAddress[] }) => {
  const [value, setValue] = useState<EmailAddress[]>(initial);
  current = value;
  return (
    <Theme>
      <RecipientField
        ref={fieldRef}
        label="To"
        placeholder="To"
        value={value}
        onChange={setValue}
      />
    </Theme>
  );
};

const render = async (initial: EmailAddress[] = []) => {
  await act(async () => root.render(<Field initial={initial} />));
};

const input = () => container.querySelector('input') as HTMLInputElement;

const paste = async (text: string) => {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  await act(async () => {
    input().dispatchEvent(event);
  });
  return event;
};

const type = async (text: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input(), text);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify({ message: 'Contact exists', contacts: [] }), { status: 200 })
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('pasting recipients into the To field', () => {
  it('a comma separated list becomes one chip each, right away', async () => {
    await render();
    const event = await paste('ravi@example.com, asha@example.com, kiran@example.com');
    expect(event.defaultPrevented).toBe(true);
    expect(current.map((r) => r.address)).toEqual([
      'ravi@example.com',
      'asha@example.com',
      'kiran@example.com',
    ]);
    expect(input().value).toBe('');
  });

  it('addresses separated only by spaces or new lines', async () => {
    await render();
    await paste('ravi@example.com asha@example.com\nkiran@example.com');
    expect(current).toHaveLength(3);
  });

  it('keeps names from "Name <address>" lists', async () => {
    await render();
    await paste('Ravi Kumar <ravi@example.com>; Asha <asha@example.com>');
    expect(current).toEqual([
      { name: 'Ravi Kumar', address: 'ravi@example.com' },
      { name: 'Asha', address: 'asha@example.com' },
    ]);
  });

  it('skips addresses already in the field', async () => {
    await render([{ name: '', address: 'ravi@example.com' }]);
    await paste('RAVI@example.com, asha@example.com');
    expect(current.map((r) => r.address)).toEqual(['ravi@example.com', 'asha@example.com']);
  });

  it('a broken address stays in the box to fix, the rest are added', async () => {
    await render();
    await paste('ravi@example.com, asha@company');
    expect(current.map((r) => r.address)).toEqual(['ravi@example.com']);
    expect(input().value).toBe('asha@company');
  });

  it('text without an address is pasted normally (e.g. a name to search)', async () => {
    await render();
    const event = await paste('Ravi Kumar');
    expect(event.defaultPrevented).toBe(false);
    expect(current).toEqual([]);
  });

  it('saves the pasted addresses as contacts in the background', async () => {
    await render();
    await paste('ravi@example.com, asha@example.com');
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(
        expect.arrayContaining([
          expect.stringContaining('/contacts/exists/ravi@example.com'),
          expect.stringContaining('/contacts/exists/asha@example.com'),
        ])
      )
    );
  });
});

describe('a list still typed in the box when sending', () => {
  it('every address is sent, not only one', async () => {
    await render();
    await type('ravi@example.com asha@example.com');
    let flushed: EmailAddress[] = [];
    await act(async () => {
      flushed = fieldRef.current!.flush();
    });
    expect(flushed.map((r) => r.address)).toEqual(['ravi@example.com', 'asha@example.com']);
    expect(current).toHaveLength(2);
  });

  it('nothing typed: nothing added', async () => {
    await render();
    expect(fieldRef.current!.flush()).toEqual([]);
  });
});
