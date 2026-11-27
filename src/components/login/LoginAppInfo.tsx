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

import { API_CONFIG } from '../../constants/config';
import { confirmAndResetApp } from '../../utils/appUpdate';

/** "v1.5.9 · mww0y4eu": the app version and the short build id (also in the sidebar) */
export const appVersionLabel = () =>
  `v${API_CONFIG.version}${
    API_CONFIG.bundleBuildId ? ` · ${API_CONFIG.bundleBuildId.split('-')[0]}` : ''
  }`;

/** "Reset app" link, version and build id under the login form. */
export const LoginAppInfo = ({ className = '' }: { className?: string }) => (
  <p className={`text-[11px] ${className}`}>
    <button
      type="button"
      onClick={confirmAndResetApp}
      className="mr-3 underline hover:text-orange-600"
      title="Clears cached files and saved data in this browser"
    >
      Having trouble? Reset app
    </button>
    <span title={`Build ${API_CONFIG.bundleBuildId}`} className="whitespace-nowrap">
      {appVersionLabel()}
    </span>
  </p>
);
