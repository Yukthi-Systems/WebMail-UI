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

import { atom } from 'jotai';

export interface CompanyConfig {
  slug: string;
  name: string;
  domains: string[];
  assets: {
    logo?: string;
    background?: string;
    logoDark?: string;
    backgroundDark?: string;
  };
  theme?: Record<string, any>;
}

// Not persisted — URL is the source of truth for company context.
// Set by /c/$slug beforeLoad on every entry; cleared implicitly when
// user leaves /c/ routes (the URL no longer carries the slug).
export const companyBrandingAtom = atom<CompanyConfig | null>(null);
