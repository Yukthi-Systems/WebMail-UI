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

import * as React from 'react';

export type ToastStatus = 'default' | 'success' | 'error' | 'loading';
export type ToastPosition = 'bottom-right' | 'top-center';

export interface ToastUndo {
  label?: string;
  onClick: () => void;
  duration?: number;
}

export interface ToastConfig {
  description: string;
  status?: ToastStatus;
  duration?: number;
  position?: ToastPosition;
  undo?: ToastUndo;
  id?: string;
}

export interface ToastItem extends ToastConfig {
  id: string;
  leaving: boolean;
}

export interface ToastContextValue {
  (payload: ToastConfig): void;
  success: (payload: ToastConfig) => void;
  error: (payload: ToastConfig) => void;
  loading: (payload: ToastConfig) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);
