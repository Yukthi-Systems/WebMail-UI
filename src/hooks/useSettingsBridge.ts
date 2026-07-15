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

import { useQueryClient } from '@tanstack/react-query';
import { useAtom } from 'jotai';
import { userSettingsAtom } from '../state/settings';
import { useUpdateUserSettings } from './useUserSettings';
import { type UserSettings } from '../api/user';
import { useToast } from '../components/ui/ToastComponent';

/**
 * Intelligent Merge Helper Prevents data loss by deeply merging specific
 * critical sections.
 */
function deepMergeSettings(base: UserSettings, patch: Partial<UserSettings>): UserSettings {
  // 1. Start with a shallow copy of the base (Safe Truth)
  const newState = { ...base };

  // 2. Iterate through the patch to merge safely
  (Object.keys(patch) as Array<keyof UserSettings>).forEach((key) => {
    const patchValue = patch[key];
    const baseValue = base[key];

    // Case A: Folders (Dictionary Merge)
    // We must merge individual folder keys so we don't lose folders not in the patch
    if (key === 'folders' && patchValue && typeof patchValue === 'object') {
      newState.folders = { ...base.folders }; // Start with all existing folders

      Object.entries(patchValue).forEach(([folderKey, folderSettings]) => {
        newState.folders[folderKey] = {
          ...(newState.folders[folderKey] || {}), // Keep hidden props (quota, etc)
          ...folderSettings, // Apply changes (visible, label)
        };
      });
      return;
    }

    // Case B: General Settings (Shallow Object Merge)
    // We merge properties so we don't lose 'theme' when updating 'signature'
    if (key === 'general' && patchValue && typeof patchValue === 'object') {
      newState.general = {
        ...base.general,
        ...patchValue,
      };
      return;
    }

    // Case C: UI Settings (if exists in your type)
    if (key === 'ui' && patchValue && typeof patchValue === 'object') {
      newState.ui = {
        ...(base.ui || {}),
        ...patchValue,
      };
      return;
    }

    // Case D: Primitive values or Arrays (Direct Overwrite)
    // Arrays (like signatures list) are usually intended to be replaced entirely
    // @ts-ignore - Dynamic assignment safety is handled by logic above
    newState[key] = patchValue;
  });

  return newState;
}

export function useSettingsBridge() {
  const queryClient = useQueryClient();
  const [atomSettings, setAtomSettings] = useAtom(userSettingsAtom);
  const { mutateAsync: performUpdate, isPending } = useUpdateUserSettings();
  const toast = useToast();

  const safeUpdateSettings = async (
    changes: Partial<UserSettings> | ((prev: UserSettings) => Partial<UserSettings>)
  ) => {
    try {
      // 1. FETCH TRUTH: Get Server State or Fallback to Atom
      const serverState = queryClient.getQueryData<UserSettings>(['getting_user_settings']);
      const baseState = serverState || atomSettings;

      if (!baseState) throw new Error('Sync Error: No base settings found.');

      // 2. RESOLVE PATCH: Handle functional updates or direct objects
      const patch = typeof changes === 'function' ? changes(baseState) : changes;

      // 3. SAFE MERGE: Use the helper to combine Base + Patch
      const newState = deepMergeSettings(baseState, patch);

      // 4. OPTIMISTIC UPDATE: Update UI immediately
      setAtomSettings(newState);

      // 5. SERVER UPDATE: Send to API
      await performUpdate(newState);

      // 6. FINALIZE: Sync cache with the saved state — no refetch needed
      queryClient.setQueryData(['getting_user_settings'], newState);
    } catch (error) {
      // ROLLBACK: Revert Atom to Server State on failure
      const serverState = queryClient.getQueryData<UserSettings>(['getting_user_settings']);
      if (serverState) setAtomSettings(serverState);

      console.error('Bridge Update Failed:', error);
      throw error;
    }
  };

  return {
    updateSettings: safeUpdateSettings,
    isUpdating: isPending,
  };
}
