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

export const createSafeStringSet = (
  ...inputs: (string | string[] | null | undefined)[]
): Set<string> => {
  return new Set(
    inputs.filter(Boolean).flatMap((input: any) => {
      if (Array.isArray(input)) {
        return input.filter((v) => v && v.trim() !== '');
      }
      return input.trim() !== '' ? [input] : [];
    })
  );
};

export const isFolderThreadEnabled = (
  folderThreadView: any,
  folder?: string,
  folderPath?: string
): boolean => {
  const folderKey = folder?.toLowerCase() || 'inbox';
  const value = folderThreadView?.[folderKey]?.list_thread_view ?? 'threads';
  return value === 'list' && ['inbox', 'sent'].includes(folderPath?.toLowerCase() || '');
};

export const shouldApplyThreading = (
  threadedView: string,
  isFolderThread: boolean,
  folder?: string
): boolean => {
  return !(
    threadedView === 'never' ||
    (isFolderThread && ['inbox', 'sent'].includes(folder?.toLowerCase() || ''))
  );
};
