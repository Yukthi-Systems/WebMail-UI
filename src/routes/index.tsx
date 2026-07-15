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

import { createFileRoute, redirect } from '@tanstack/react-router';
import { webmailStore } from '../store';
import { csrfTokenAtom } from '../state/auth';
import { userSettingsAtom } from '../state/settings';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const csrfToken = webmailStore.get(csrfTokenAtom);
    if (!csrfToken) {
      throw redirect({ to: '/login' });
    }

    // Read from persisted atom (localStorage) — avoids redundant API call
    // _baselayout beforeLoad fetches and caches the full settings
    const cachedSettings = webmailStore.get(userSettingsAtom);
    const defaultFolder = cachedSettings?.email?.default_view || 'INBOX';
    throw redirect({
      to: '/folder/$folder',
      params: { folder: defaultFolder },
    });
  },
});
