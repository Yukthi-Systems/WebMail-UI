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

// Emails the user marked unread while they are open: opening marks an email read,
// but not one the user just chose to keep unread. Cleared when it's opened again.

import { unquoteFolder } from './threads';

const keptUnread = new Set<string>();

export const keptUnreadKey = (folder: string, uid: string | number) =>
  `${unquoteFolder(folder)}:${uid}`;

export const keepUnread = (folder: string, uids: (string | number)[]) =>
  uids.forEach((uid) => keptUnread.add(keptUnreadKey(folder, uid)));

export const isKeptUnread = (folder: string, uid: string | number) =>
  keptUnread.has(keptUnreadKey(folder, uid));

export const forgetKeptUnread = (folder: string, uid: string | number) =>
  keptUnread.delete(keptUnreadKey(folder, uid));
