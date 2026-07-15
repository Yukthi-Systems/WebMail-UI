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

import React, { useState } from 'react';
import { BsPlus, BsThreeDotsVertical, BsCheck2 } from 'react-icons/bs';
import { HiOutlineDocumentDownload, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import DropdownWrapper, { type DropdownItem } from '../../common/DropdownWrapper';

interface ScriptSelectorProps {
  scripts: string[];
  selectedScript: string;
  onSelectScript: (name: string) => void;
  onCreateScript: () => void;
  onDeleteScript: (name: string) => void;
  onActivateScript: (name: string) => void;
  onRenameScript?: (oldName: string, newName: string) => void;
  onDownloadScript?: (name: string) => void;
  isLoading?: boolean;
  active: string;
}

export const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  scripts,
  active,
  selectedScript,
  onSelectScript,
  onCreateScript,
  onDeleteScript,
  onActivateScript,
  onRenameScript,
  onDownloadScript,
  isLoading = false,
}) => {
  const [renamingScript, setRenamingScript] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleStartRename = (scriptName: string) => {
    setRenamingScript(scriptName);
    setNewName(scriptName);
  };

  const handleConfirmRename = (oldName: string) => {
    if (newName && newName !== oldName && onRenameScript) {
      onRenameScript(oldName, newName);
    }
    setRenamingScript(null);
    setNewName('');
  };

  const handleCancelRename = () => {
    setRenamingScript(null);
    setNewName('');
  };

  const getScriptActions = (scriptName: string): DropdownItem[] => {
    const items: DropdownItem[] = [];

    if (active !== scriptName) {
      items.push({
        key: 'activate',
        label: 'Activate',
        icon: BsCheck2,
        onSelect: () => onActivateScript(scriptName),
      });
    }

    if (onRenameScript) {
      items.push({
        key: 'rename',
        label: 'Rename',
        icon: HiOutlinePencil,
        onSelect: () => handleStartRename(scriptName),
      });
    }

    if (onDownloadScript) {
      items.push({
        key: 'download',
        label: 'Download',
        icon: HiOutlineDocumentDownload,
        onSelect: () => onDownloadScript(scriptName),
      });
    }

    items.push({
      key: 'delete',
      label: 'Delete',
      icon: HiOutlineTrash,
      color: 'red',
      // separator: items.length > 0,
      onSelect: () => onDeleteScript(scriptName),
    });

    return items;
  };

  return (
    <div className="space-y-4 min-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--gray-12)]">Filter Sets</h2>
        <button
          onClick={onCreateScript}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--accent-11)] hover:bg-[var(--accent-3)] rounded-md transition-colors"
        >
          <BsPlus className="w-4 h-4" />
          New Filter Set
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-3 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-8 px-4 bg-[var(--gray-3)] rounded-md">
          <p className="text-sm text-[var(--gray-11)] mb-3">No filter sets found</p>
          <button
            onClick={onCreateScript}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-md transition-colors"
          >
            <BsPlus className="w-4 h-4" />
            Create First Filter Set
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map((script) => (
            <div
              key={script}
              className={`flex items-center justify-between p-3 rounded-md border transition-all ${
                renamingScript === script ? 'cursor-default' : 'cursor-pointer'
              } ${
                selectedScript === script
                  ? 'bg-[var(--accent-3)] border-[var(--accent-7)]'
                  : 'bg-[var(--gray-1)] border-[var(--gray-5)] hover:border-[var(--gray-6)]'
              }`}
              onClick={() => renamingScript !== script && onSelectScript(script)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {renamingScript === script ? (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename(script);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    onBlur={() => handleConfirmRename(script)}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm bg-[var(--gray-1)] border border-[var(--accent-7)] rounded text-[var(--gray-12)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)]"
                  />
                ) : (
                  <>
                    <span className="font-medium text-[var(--gray-12)] truncate">{script}</span>
                    {active === script && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-[var(--green-3)] text-[var(--green-11)] border border-[var(--green-6)] rounded">
                        Active
                      </span>
                    )}
                  </>
                )}
              </div>

              {renamingScript !== script && (
                <DropdownWrapper
                  items={getScriptActions(script)}
                  trigger={
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded transition-colors"
                    >
                      <BsThreeDotsVertical className="w-4 h-4" />
                    </button>
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
