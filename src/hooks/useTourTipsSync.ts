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
import { useAtom, useAtomValue } from 'jotai';
import { tourTipsAtom } from '../state/tourTips';
import { userSettingsAtom } from '../state/settings';

/** Syncs tour tips from user settings to local atom on mount. */
export function useTourTipsSync() {
  const userSettings = useAtomValue(userSettingsAtom);
  const [, setTourTips] = useAtom(tourTipsAtom);

  useEffect(() => {
    if (userSettings?.tour_tips) {
      setTourTips((prev) => {
        const merged = { ...prev };

        // Sync from API, converting snake_case to camelCase
        Object.entries(userSettings.tour_tips ?? {}).forEach(([key, value]) => {
          merged[key] = {
            dismissed: value.dismissed,
            dismissedAt: value.dismissed_at,
          };
        });

        return merged;
      });
    }
  }, [userSettings?.tour_tips, setTourTips]);
}
