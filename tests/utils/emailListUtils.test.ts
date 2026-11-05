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
import { isConversationView } from './emailListUtils';
import type { UserSettings } from '../api/user';

const settings = (threads: string, folders: Record<string, string>) =>
  ({
    email: { mail_thead_view: threads },
    folders: Object.fromEntries(
      Object.entries(folders).map(([key, view]) => [key, { list_thread_view: view }])
    ),
  }) as unknown as UserSettings;

describe('isConversationView', () => {
  it('follows the folder View Mode', () => {
    const s = settings('all threads', { inbox: 'threads', sent: 'list' });
    expect(isConversationView(s, 'inbox')).toBe(true);
    expect(isConversationView(s, 'sent')).toBe(false);
  });

  it('is off everywhere when Expand Message Threads is "never"', () => {
    expect(isConversationView(settings('never', { inbox: 'threads' }), 'inbox')).toBe(false);
  });

  it('defaults to conversations (custom folders, no settings yet)', () => {
    expect(isConversationView(settings('all threads', {}), 'projects')).toBe(true);
    expect(isConversationView(undefined, 'inbox')).toBe(true);
  });
});
