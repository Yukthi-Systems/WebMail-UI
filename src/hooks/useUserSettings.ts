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

import { useMutation, useQuery } from '@tanstack/react-query';
import { userSettingsQuery } from '../utils/workspaceSettings';
import { updateUserSettings, type UpdateResponse, type UserSettings } from '../api/user';

export function useUpdateUserSettings() {
  return useMutation<UpdateResponse, Error, UserSettings>({
    mutationFn: async (data: UserSettings) => updateUserSettings(data),
    mutationKey: ['update_user_settings'],
  });
}

export function useGetUserSettings() {
  return useQuery<UserSettings, Error>({
    ...userSettingsQuery,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
