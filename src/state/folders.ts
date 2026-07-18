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

import { atomWithStorage } from 'jotai/utils';

// name/folder_name and other fields aren't consistently populated by every
// caller — kept optional so this stays a true description of what's read
// across the app rather than an aspirational one.
export interface FolderDetail {
  name: string;
  folder_name: string;
  delimiter?: string;
  unread_count?: number;
  flags?: string[];
  default?: boolean;
  path?: string;
  order?: number;
  status?: {
    UIDVALIDITY: number;
    MESSAGES: number;
    UIDNEXT: number;
  };
}

export interface FolderQuota {
  total_kb: number;
  total_mb: number;
  used_kb: number;
  used_mb: number;
  used_percent: number;
}

export const folderQuotaAtom = atomWithStorage<FolderQuota | null>('folderQuota', null, undefined, {
  getOnInit: true,
});

export const folderDetailsAtom = atomWithStorage<FolderDetail[]>('folderDetails', [], undefined, {
  getOnInit: true,
});
