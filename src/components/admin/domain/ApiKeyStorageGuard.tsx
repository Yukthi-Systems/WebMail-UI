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

import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { apiKeyAtom } from '../../../state/auth';

const allowedPattern = /^\/1219\/admin(\/|$)/;

export function ApiKeyStorageGuard(): null {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const resetApiKey = useSetAtom(apiKeyAtom);

  useEffect(() => {
    const isAllowed = allowedPattern.test(pathname);

    if (!isAllowed) {
      resetApiKey(null);
      sessionStorage.removeItem('apiKey');
    }
  }, [pathname, resetApiKey]);

  return null;
}
