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

// src/components/settings/folders/FolderStats.tsx
import React from 'react';
import { FaFolder, FaEye, FaUsers } from 'react-icons/fa6';
import { FaCog } from 'react-icons/fa';

interface FolderFromAPI {
  flags: string[];
  delimiter: string;
  folder_name: string;
}

interface FolderSettings {
  [folder_name: string]: {
    visible: boolean;
    quota?: number;
    description?: string;
  };
}

interface FolderStatsProps {
  folders: FolderFromAPI[];
  folderSettings: FolderSettings;
}

const FolderStats: React.FC<FolderStatsProps> = ({ folders, folderSettings }) => {
  const isSystemFolder = (flags: string[], folderName: string) => {
    return (
      flags.some((flag) => ['Trash', 'Sent', 'Drafts', 'Junk'].includes(flag)) ||
      folderName === 'INBOX'
    );
  };

  const totalFolders = folders.length;
  const customFolders = folders.filter((f) => !isSystemFolder(f.flags, f.folder_name)).length;
  const visibleFolders = Object.entries(folderSettings).filter(
    ([, settings]) => settings.visible !== false
  ).length;
  const parentFolders = folders.filter((f) => f.flags.includes('HasChildren')).length;

  const stats = [
    {
      icon: FaFolder,
      value: totalFolders,
      label: 'Total Folders',
      description: 'All email folders',
      bgGradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-[var(--blue-3)]',
      iconColor: 'text-[var(--blue-11)]',
      textColor: 'text-[var(--blue-12)]',
      borderColor: 'border-[var(--blue-5)]',
    },
    {
      icon: FaEye,
      value: visibleFolders,
      label: 'Visible Folders',
      description: 'Shown in sidebar',
      bgGradient: 'from-green-500 to-green-600',
      bgColor: 'bg-[var(--green-3)]',
      iconColor: 'text-[var(--green-11)]',
      textColor: 'text-[var(--green-12)]',
      borderColor: 'border-[var(--green-5)]',
    },
    {
      icon: FaUsers,
      value: customFolders,
      label: 'Custom Folders',
      description: 'User created',
      bgGradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-[var(--purple-3)]',
      iconColor: 'text-[var(--purple-11)]',
      textColor: 'text-[var(--purple-12)]',
      borderColor: 'border-[var(--purple-5)]',
    },
    {
      icon: FaCog,
      value: parentFolders,
      label: 'Parent Folders',
      description: 'Has subfolders',
      bgGradient: 'from-orange-500 to-orange-600',
      bgColor: 'bg-[var(--orange-3)]',
      iconColor: 'text-[var(--orange-11)]',
      textColor: 'text-[var(--orange-12)]',
      borderColor: 'border-[var(--orange-5)]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="group relative overflow-hidden rounded-xl bg-[var(--gray-1)] border border-[var(--gray-5)] hover:border-[var(--gray-6)] transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--gray-3)] to-[var(--gray-4)]"></div>
            </div>

            {/* Content */}
            <div className="relative p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Value */}
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-[var(--gray-12)] group-hover:scale-105 transition-transform duration-200 inline-block">
                      {stat.value}
                    </span>
                  </div>

                  {/* Label */}
                  <h3 className="text-sm font-semibold text-[var(--gray-11)] mb-1">{stat.label}</h3>

                  {/* Description */}
                  <p className="text-xs text-[var(--gray-9)]">{stat.description}</p>
                </div>

                {/* Icon */}
                <div
                  className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-[var(--gray-4)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${stat.bgColor} transition-all duration-1000 ease-out`}
                    style={{
                      width: `${Math.min((stat.value / Math.max(totalFolders, 10)) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[var(--blue-9)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        );
      })}
    </div>
  );
};

export default FolderStats;
