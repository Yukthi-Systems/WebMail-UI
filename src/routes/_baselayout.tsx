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
import { csrfTokenAtom } from '../state/auth';

export const Route = createFileRoute('/_baselayout')({
  beforeLoad: () => {
    const csrfToken = webmailStore.get(csrfTokenAtom);
    if (!csrfToken) {
      throw redirect({ to: '/login' });
    }
  },
  component: Layout,
});
