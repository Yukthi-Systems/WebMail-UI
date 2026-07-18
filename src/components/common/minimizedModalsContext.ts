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

import { createContext } from 'react';

export interface MinimizedModal {
  id: string;
  title: string;
  onRestore: () => void;
  onClose: () => void;
}

export interface MinimizedModalsContextType {
  minimizedModals: MinimizedModal[];
  register: (modal: MinimizedModal) => void;
  unregister: (id: string) => void;
}

export const MinimizedModalsContext = createContext<MinimizedModalsContextType | null>(null);
