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

import type { ReactNode } from 'react';

type SettingProps = {
  label: string;
  description?: string;
  children: ReactNode;
};

export const Settings = ({ label, description, children }: SettingProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
    <div className="sm:w-1/4 sm:min-w-[120px]">
      <label className="text-sm font-medium text-[var(--gray-12)] block">{label}</label>
      {description && <p className="text-xs text-[var(--gray-11)] mt-1">{description}</p>}
    </div>
    <div className="flex-1 flex gap-3 flex-wrap ">{children}</div>
  </div>
);
