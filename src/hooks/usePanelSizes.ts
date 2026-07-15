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

import { useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../state/settings';
import { useSettingsBridge } from './useSettingsBridge';
import type { PanelSizes } from '../api/user';

const DEFAULTS: PanelSizes = {
  folderEmailSplit: 20,
  emailViewerSplit: 33.33,
  verticalEmailViewerSplit: 40,
};

export function usePanelSizes() {
  const settings = useAtomValue(userSettingsAtom);
  const { updateSettings } = useSettingsBridge();

  // Ref to hold the timeout ID for debouncing
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Read current sizes from Settings (Atom) -> Fallback to Defaults
  const panelSizes = {
    ...DEFAULTS,
    ...(settings?.ui?.panel_sizes || {}),
  };

  // 2. Debounced Update Function
  const updatePanelSize = useCallback(
    (key: keyof PanelSizes, value: number) => {
      // Clear any pending update to reset the timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Wait 500ms after the last drag event before saving to server
      timeoutRef.current = setTimeout(() => {
        updateSettings((prev) => ({
          ui: {
            ...(prev.ui || {}),
            panel_sizes: {
              ...DEFAULTS,
              ...(prev.ui?.panel_sizes || {}),
              [key]: value, // Update specific key
            },
          },
        }));
      }, 500);
    },
    [updateSettings]
  );

  return { panelSizes, updatePanelSize };
}
