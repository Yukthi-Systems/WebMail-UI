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
import DialogWrapper from '../../common/Dialoge';
import { CustomSelect } from './CustomSelect';
import { useScripts } from '../../../hooks/useSieve';
import { getScriptRaw } from '../../../api/sieve';

interface CreateScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, content: string) => Promise<void>;
}

export const CreateScriptDialog: React.FC<CreateScriptDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [selectedSourceScript, setSelectedSourceScript] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: scriptsData } = useScripts();

  const activeScript = scriptsData?.scripts.active || '';
  const availableScripts = [
    ...(activeScript ? [activeScript] : []),
    ...(scriptsData?.scripts?.scripts ?? []),
  ];

  const handleSourceScriptChange = async (scriptName: string) => {
    setSelectedSourceScript(scriptName);

    if (!scriptName) {
      setContent('');
      return;
    }

    setIsLoadingContent(true);
    try {
      const data: any = await getScriptRaw(scriptName);
      setContent(data.raw_data || '');
    } catch (error) {
      console.error('Failed to load filter set content:', error);
      setContent('');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name, content || '# Empty filter set');
      setName('');
      setContent('');
      setSelectedSourceScript('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create filter set:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setContent('');
    setSelectedSourceScript('');
    onOpenChange(false);
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Filter Set"
      description="Create a new filter set from scratch or copy content from an existing filter set."
      size="3"
      maxWidth="600px"
      showCloseButton
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-1">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--gray-12)]">
            Filter Set Name <span className="text-[var(--red-9)]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., main-filters"
            className="w-full px-3 py-2 border border-[var(--gray-6)] bg-[var(--gray-1)] text-[var(--gray-12)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] transition-all hover:border-[var(--gray-7)] placeholder:text-[var(--gray-9)]"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="border-t border-[var(--gray-5)] pt-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--gray-12)]">
              Copy from Existing Filter Set (Optional)
            </label>
            <CustomSelect
              value={selectedSourceScript}
              onValueChange={handleSourceScriptChange}
              placeholder="None - start with empty filter set"
              options={[
                { value: '', label: 'None - start with empty filter set' },
                ...availableScripts.map((script) => ({
                  value: script,
                  label: script,
                })),
              ]}
              className="w-full"
              disabled={isSubmitting || isLoadingContent}
            />
            {selectedSourceScript && (
              <p className="text-xs text-[var(--gray-11)]">
                Content from "{selectedSourceScript}" will be copied to the new filter set
              </p>
            )}
          </div>

          {selectedSourceScript && (
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-medium text-[var(--gray-12)]">
                <span>Filter Set Content Preview</span>
                {isLoadingContent && (
                  <div className="flex items-center gap-2 text-xs text-[var(--gray-11)]">
                    <div className="w-3 h-3 border-2 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </div>
                )}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Filter set content will appear here..."
                rows={8}
                className="w-full px-3 py-2 border border-[var(--gray-6)] bg-[var(--gray-1)] text-[var(--gray-12)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] transition-all hover:border-[var(--gray-7)] placeholder:text-[var(--gray-9)] resize-none font-mono text-xs"
                disabled={isLoadingContent || isSubmitting}
              />
              <p className="text-xs text-[var(--gray-11)]">
                You can edit the content before creating the filter set
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--gray-5)]">
          <button
            type="button"
            disabled={isSubmitting || isLoadingContent}
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isLoadingContent || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Create Filter Set
          </button>
        </div>
      </form>
    </DialogWrapper>
  );
};
