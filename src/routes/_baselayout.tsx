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
import Layout from '../components/common/Layout';
import { webmailStore } from '../store';
import { sessionTokenAtom } from '../state/auth';
import { loadWorkspaceFolders } from '../utils/workspaceFolders';
import { loadUserSettings } from '../utils/workspaceSettings';

export const Route = createFileRoute('/_baselayout')({
  beforeLoad: () => {
    const sessionToken = webmailStore.get(sessionTokenAtom);
    if (!sessionToken) {
      throw redirect({ to: '/login' });
    }
  },
  // Runs while the loading screen is up, so the app renders with the folder list
  // and settings (both requests in parallel). Once per entry: the app keeps them updated.
  loader: async ({ context }) => {
    await Promise.all([
      loadWorkspaceFolders(context.queryClient),
      loadUserSettings(context.queryClient),
    ]);
  },
  shouldReload: false,
  component: Layout,
});
