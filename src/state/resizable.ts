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

interface PanelSizes {
  folderEmailSplit: number;
  emailViewerSplit: number;
  verticalEmailViewerSplit: number;
}

// Store panel sizes with default values - persists to localStorage
export const panelSizesAtom = atomWithStorage<PanelSizes>('mailbox-panel-sizes', {
  folderEmailSplit: 20, // Folders take 20% of width
  emailViewerSplit: 33.33, // Email list takes 33.33% in horizontal split
  verticalEmailViewerSplit: 40, // Email list takes 40% in vertical split
});
