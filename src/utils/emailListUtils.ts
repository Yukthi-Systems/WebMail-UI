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

// src/utils/emailListUtils.ts

import type { UserSettings } from '../api/user';

export const createSafeStringSet = (
  ...inputs: (string | string[] | null | undefined)[]
): Set<string> => {
  return new Set(
    inputs.filter((v): v is string | string[] => Boolean(v)).flatMap((input) => {
      if (Array.isArray(input)) {
        return input.filter((v) => v && v.trim() !== '');
      }
      return input.trim() !== '' ? [input] : [];
    })
  );
};

/**
 * Conversation view for a folder: on unless "Expand Message Threads" is
 * "never" or the folder's View Mode is "list". folderKey is the folder's key
 * in the settings (useSpecialFolderPaths().settingsKey(folder)).
 */
/**
 * The list's count always shows emails. In conversation view pages count
 * conversations, so total_count is shown on hover and totalEmails is the label.
 */
export const listCountLabels = (
  totalCount: number,
  totalEmails?: number
): { label: string; tooltip?: string } => {
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  if (totalEmails === undefined) return { label: plural(totalCount, 'email') };
  return { label: plural(totalEmails, 'email'), tooltip: plural(totalCount, 'conversation') };
};

export const isConversationView = (
  userSettings: Pick<UserSettings, 'email' | 'folders'> | null | undefined,
  folderKey: string
): boolean => {
  if ((userSettings?.email?.mail_thead_view || 'all threads') === 'never') return false;
  return (userSettings?.folders?.[folderKey]?.list_thread_view ?? 'threads') !== 'list';
};
