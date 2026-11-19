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

// Shown by the Help page and the shortcuts dialog (Ctrl + /). Handled in
// hooks/useKeyboardShortcuts.tsx and components/common/Layout.tsx.

export interface ShortcutItem {
  keys: string[];
  description: string;
}

export const navigationShortcuts: ShortcutItem[] = [
  { description: 'Next email', keys: ['j', '↓'] },
  { description: 'Previous email', keys: ['k', '↑'] },
  { description: 'Open email', keys: ['Enter', 'o', '→'] },
  { description: 'Back to list', keys: ['Esc', '←'] },
  { description: 'Next page', keys: ['n', 'Page Down'] },
  { description: 'Previous page', keys: ['p', 'Page Up'] },
  { description: 'Focus folders', keys: ['Shift', 'g'] },
];

export const actionShortcuts: ShortcutItem[] = [
  { description: 'Compose', keys: ['c'] },
  { description: 'Reply', keys: ['r'] },
  { description: 'Reply All', keys: ['a'] },
  { description: 'Forward', keys: ['f'] },
  { description: 'Refresh list', keys: ['Ctrl', 'r'] },
  { description: 'Show shortcuts', keys: ['Ctrl', '/'] },
];

export const selectionShortcuts: ShortcutItem[] = [
  { description: 'Select email', keys: ['x'] },
  { description: 'Select / deselect all', keys: ['Shift', '*'] },
  { description: 'Mark as read', keys: ['Shift', 'i'] },
  { description: 'Mark as unread', keys: ['Shift', 'u'] },
  { description: 'Delete', keys: ['#', 'Delete'] },
  { description: 'Flag', keys: ['e'] },
  { description: 'Remove flag', keys: ['s'] },
];
