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

import type { ComposeButtonStyle } from './ComposeButton';

export const COMPOSE_BUTTON_OPTIONS: {
  value: ComposeButtonStyle;
  label: string;
  description: string;
}[] = [
  { value: 'default', label: 'Default', description: 'Solid with shadow' },
  { value: 'compact', label: 'Compact', description: 'Solid, no shadow' },
  { value: 'minimal', label: 'Minimal', description: 'Ghost style' },
];
