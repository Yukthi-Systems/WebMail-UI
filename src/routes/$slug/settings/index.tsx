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
import Settings from '../../../components/settings';
import { webmailStore } from '../../../store';
import { csrfTokenAtom } from '../../../state/auth';
import { userSettingsAtom } from '../../../state/settings';
import { type UserSettings } from '../../../api/user';

export const Route = createFileRoute('/$slug/settings/')({
  beforeLoad: ({ params }) => {
    const csrfToken = webmailStore.get(csrfTokenAtom);
    if (!csrfToken) {
      throw redirect({ to: '/$slug', params: { slug: params.slug } });
    }
    const data = webmailStore.get(userSettingsAtom) as UserSettings;
    return { user_settings: data };
  },
  component: Settings,
});
