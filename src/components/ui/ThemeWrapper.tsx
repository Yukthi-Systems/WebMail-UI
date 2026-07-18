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

import React from 'react';
import { Theme } from '@radix-ui/themes';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../state/settings';

interface DynamicThemeProps {
  children: React.ReactNode;
}

const ThemeWrapper: React.FC<DynamicThemeProps> = ({ children }) => {
  const userSettings = useAtomValue(userSettingsAtom);

  // Get theme settings from user preferences or use defaults
  const appearance = userSettings?.ui?.theme === 'dark' ? 'dark' : 'light';
  const accentColor = userSettings?.ui?.color_scheme || 'orange';

  return (
    <Theme
      style={{ fontFamily: "'Roboto', sans-serif" }}
      appearance={appearance}
      // Radix supports: gray, gold, bronze, brown, yellow, amber, orange, tomato, red, ruby, crimson, pink, plum, purple, violet, iris, indigo, blue, cyan, teal, jade, green, grass, lime, mint, sky
      accentColor={accentColor as React.ComponentProps<typeof Theme>['accentColor']}
      radius="large"
    >
      {children}
    </Theme>
  );
};

export default ThemeWrapper;
