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
import {
  updateUserSettings,
  userSettings,
  type UpdateResponse,
  type UserSettings,
} from '../api/user';

export function useUpdateUserSettings() {
  return useMutation<UpdateResponse, Error, UserSettings>({
    mutationFn: async (data: UserSettings) => updateUserSettings(data),
    mutationKey: ['update_user_settings'],
  });
}

export function useGetUserSettings() {
  return useQuery<UserSettings, Error>({
    queryKey: ['getting_user_settings'],
    queryFn: userSettings,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 5,
    retryDelay: () => 500,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
