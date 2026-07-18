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

// TODO: Update the api url from the environment variable or configuration file

import { API_CONFIG } from '../constants/config';
import { resetLayoutCache } from '../utils/resetLayoutCache';
import { getCompanySlugFromPath } from '../utils/routeUtils';

export const API_URL = API_CONFIG.baseURL;

export const authCheck = async (status: number): Promise<void> => {
  if (status === 401 || status === 406) {
    localStorage.clear();
    const slug = getCompanySlugFromPath(window.location.pathname);
    window.location.href = slug ? `/${slug}` : '/login';
    resetLayoutCache();
  }
};
