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

import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';

// Persist whether left nav is visible
export const leftNavVisibleAtom = atomWithStorage<boolean>('left_nav_visible', true);

// Track if user has seen the onboarding tour
export const leftNavTourSeenAtom = atomWithStorage<boolean>('left_nav_tour_seen', false);

// Track hover state for the collapsed button
export const leftNavHoverAtom = atom(false);
