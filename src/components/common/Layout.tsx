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

import { Outlet } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import LeftNavigation from './LeftPanel';
import Header from './header';
import ShortcutsModal from './ShortcutModal';
import { useTourTipsSync } from '../../hooks/useTourTipsSync';
import { useFoldersFullPath, useFolderQuota } from '../../hooks/useFolders';
import { useSetAtom } from 'jotai';
import { folderQuotaAtom } from '../../state/folders';
import { userSettingsAtom } from '../../state/settings';
import { useGetUserSettings } from '../../hooks/useUserSettings';
import { updateUserSettings } from '../../api/user';
import { getDefaultUserSettings } from '../../utils/defaultSettings';

const Layout = () => {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const setFolderQuota = useSetAtom(folderQuotaAtom);
  const setUserSettings = useSetAtom(userSettingsAtom);
  useTourTipsSync();
  useFoldersFullPath();

  const { data: quotaData } = useFolderQuota();
  useEffect(() => {
    if (quotaData?.quota !== undefined) {
      setFolderQuota(quotaData.quota);
    }
  }, [quotaData, setFolderQuota]);

  const { data: settingsData, isSuccess: settingsLoaded } = useGetUserSettings();
  useEffect(() => {
    if (!settingsLoaded) return;
    if (settingsData && Object.keys(settingsData).length > 0) {
      setUserSettings(settingsData);
    } else {
      // First login — no settings in DB yet, initialise with defaults
      const defaults = getDefaultUserSettings();
      updateUserSettings(defaults)
        .catch((e) => console.warn('Failed to persist default settings:', e))
        .finally(() => setUserSettings(defaults));
    }
  }, [settingsData, settingsLoaded, setUserSettings]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl + ? (Note: ? implies Shift is held down on most layouts)
      // event.key === '?' ensures we pressed the question mark key
      // event.ctrlKey ensures Ctrl was held
      if (event.key === '/' && event.ctrlKey) {
        event.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen bg-[var(--gray-1)] flex flex-col">
      {/* Header - Full width at top */}
      <div className="flex-shrink-0">
        <Header />
      </div>

      {/* Main content area with left panel and content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Panel */}
        <div className="flex-shrink-0">
          <LeftNavigation />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      {/* Shortcuts Modal - Always rendered but controlled by open state */}
      <ShortcutsModal open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
    </div>
  );
};

export default Layout;
