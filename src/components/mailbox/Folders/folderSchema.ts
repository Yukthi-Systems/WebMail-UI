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

import * as yup from 'yup';

export const folderSchema = yup.object({
  newFolderName: yup
    .string()
    .required('Folder name is required')
    .min(1, 'Name is too short')
    .max(30, 'Name is too long')
    .matches(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9\s-_]*[a-zA-Z0-9])?$/,
      'Only letters, numbers, spaces, hyphens, and underscores are allowed. Cannot start or end with a space/symbol.'
    ),
});
