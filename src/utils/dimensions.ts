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

export function getEditorDimensions(
  isMobile: boolean,
  isFullView: boolean,
  hasAttachment: boolean
) {
  if (isMobile) {
    if (hasAttachment) {
      return {
        height: 'calc(100vh - 330px)',
        maxHeight: 'calc(100vh - 260px)',
      };
    }

    return {
      height: 'calc(100vh - 330px)',
      maxHeight: 'calc(100vh - 260px)',
    };
  }

  if (isFullView) {
    if (hasAttachment) {
      return {
        height: 'calc(95vh - 380px)',
        maxHeight: 'calc(95vh - 320px)',
      };
    }

    return {
      height: 'calc(95vh - 380px)',
      maxHeight: 'calc(95vh - 380px)',
    };
  }

  if (hasAttachment) {
    return {
      height: 'calc(95vh - 380px)',
      maxHeight: '350px',
    };
  }

  return {
    height: 'calc(95vh - 380px)',
    maxHeight: '300px',
  };
}
