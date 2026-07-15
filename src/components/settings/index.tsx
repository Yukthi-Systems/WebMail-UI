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

import { useEffect, useState } from 'react';
import { Tabs } from '@radix-ui/themes';
import General from './general';
import Folders from './folders';
import FolderMapping from './mapping';
import EmailTemplateManager from './tempelates';
import Filters from './filters';
import { mergeWithDefaults } from '../../utils/defaultSettings';
import { folderDetailsAtom } from '../../state/folders';
import { userSettingsAtom } from '../../state/settings';
import { useAtomValue } from 'jotai';
import About from './about';
import { VacationTab } from './vacation';

const Settings = () => {
  const user_settings = useAtomValue(userSettingsAtom);
  const folderData = useAtomValue(folderDetailsAtom);
  // Merge with defaults
  const settingsWithDefaults = mergeWithDefaults(user_settings, folderData);

  const getInitialTab = () => {
    const hash = window.location.hash.slice(1);
    const validTabs = ['general', 'folder', 'filter', 'vacation', 'mapping', 'tempelate', 'about'];
    return validTabs.includes(hash) ? hash : 'general';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.location.hash = value;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const validTabs = [
        'general',
        'folder',
        'filter',
        'vacation',
        'mapping',
        'tempelate',
        'about',
      ];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div
      className="p-4 w-full"
      style={{
        borderRadius: '1em',
        height: 'calc(100vh - 65px)',
      }}
    >
      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <Tabs.List className="border-b border-[var(--gray-5)]">
          <Tabs.Trigger
            value="general"
            className="px-4 py-2 text-[var(--gray-11)] data-[state=active]:text-[var(--accent-11)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] hover:text-[var(--gray-12)] transition-colors"
          >
            General
          </Tabs.Trigger>
          <Tabs.Trigger
            value="folder"
            className="px-4 py-2 text-[var(--gray-11)] data-[state=active]:text-[var(--accent-11)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] hover:text-[var(--gray-12)] transition-colors"
          >
            Folder
          </Tabs.Trigger>
          <Tabs.Trigger
            value="filter"
            className="px-4 py-2 text-[var(--gray-11)] data-[state=active]:text-[var(--accent-11)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] hover:text-[var(--gray-12)] transition-colors"
          >
            Filter
          </Tabs.Trigger>
          <Tabs.Trigger
            value="vacation"
            className="px-4 py-2 text-[var(--gray-11)] data-[state=active]:text-[var(--accent-11)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] hover:text-[var(--gray-12)] transition-colors"
          >
            Vacation
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tempelate"
            className="px-4 py-2 text-[var(--gray-11)] data-[state=active]:text-[var(--accent-11)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] hover:text-[var(--gray-12)] transition-colors"
          >
            Templates
          </Tabs.Trigger>

          <Tabs.Trigger
            value="about"
            className="px-4 py-2 text-[var(--gray-11)] data-[state=active]:text-[var(--accent-11)] data-[state=active]:border-b-2 data-[state=active]:border-[var(--accent-9)] hover:text-[var(--gray-12)] transition-colors"
          >
            About
          </Tabs.Trigger>
        </Tabs.List>

        <div className="pt-6">
          <Tabs.Content value="general">
            <General data={settingsWithDefaults} />
          </Tabs.Content>

          <Tabs.Content value="folder">
            <Folders />
          </Tabs.Content>

          <Tabs.Content value="filter">
            <Filters />
          </Tabs.Content>
          <Tabs.Content value="vacation">
            <VacationTab />
          </Tabs.Content>

          <Tabs.Content value="mapping">
            <FolderMapping />
          </Tabs.Content>

          <Tabs.Content value="tempelate">
            <EmailTemplateManager />
          </Tabs.Content>
          <Tabs.Content value="about">
            <About />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};

export default Settings;
