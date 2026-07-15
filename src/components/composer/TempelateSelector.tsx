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

// src/components/composer/TemplateSelector.tsx
import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaSpinner, FaChevronDown } from 'react-icons/fa';
import { useEmailTemplates, useEmailTemplate } from '../../hooks/useTempelate';
import { useAtom, useAtomValue } from 'jotai';
import { userDetailsAtom } from '../../state/userDetails';
import { useNavigate } from '@tanstack/react-router';
import { FaPlus } from 'react-icons/fa6';
import { composerOpenAtom } from '../../state/composer';
import { useLocation } from '@tanstack/react-router';
import { getCompanySlugFromPath } from '../../utils/routeUtils';

interface TemplateSelectorProps {
  onTemplateSelect: (templateData: { subject: string; html: string }) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onTemplateSelect }) => {
  const navigate = useNavigate();
  const [openComposer, setOpenComposer] = useAtom(composerOpenAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const userDetails = useAtomValue(userDetailsAtom);
  const location = useLocation();
  const slug = getCompanySlugFromPath(location.pathname);

  const { data: personalTemplates, isLoading: loadingPersonal } = useEmailTemplates(false);
  const { data: sharedTemplates, isLoading: loadingShared } = useEmailTemplates(true);

  const { data: fullTemplate, isLoading: loadingTemplate } = useEmailTemplate(
    selectedTemplateId || '',
    !!selectedTemplateId
  );

  const personalList = (personalTemplates || []).filter(
    (t) => !t.created_by || t.created_by === userDetails?.email
  );

  const sharedList = (sharedTemplates || []).filter(
    (t) => t.created_by && t.created_by !== userDetails?.email
  );

  const allTemplates = [
    ...personalList.map((t) => ({ ...t, source: 'personal' as const })),
    ...sharedList.map((t) => ({ ...t, source: 'shared' as const })),
  ];

  const filteredTemplates = allTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPersonal = filteredTemplates.filter((t) => t.source === 'personal');
  const filteredShared = filteredTemplates.filter((t) => t.source === 'shared');

  useEffect(() => {
    if (fullTemplate && fullTemplate.data) {
      onTemplateSelect({
        subject: fullTemplate.data.subject,
        html: fullTemplate.data.body,
      });
      setIsOpen(false);
      setSelectedTemplateId(null);
    }
  }, [fullTemplate, onTemplateSelect]);

  const handleTemplateClick = (templateId: number) => {
    setSelectedTemplateId(templateId.toString());
  };

  const handleClickAdd = () => {
    // Use search parameters instead of state
    navigate({
      to: slug ? '/$slug/settings' : '/settings',
      params: slug ? { slug } : undefined,
      hash: 'tempelate',
      search: {
        openTemplateModal: 'true',
      },
    });
    // Close the composer
    setOpenComposer(false);
    // Close the template selector dropdown
    setIsOpen(false);
  };

  const isLoading = loadingPersonal || loadingShared;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-all border border-[var(--gray-5)]"
      >
        <FaFileAlt className="w-3.5 h-3.5" />
        Use Template
        <FaChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--gray-1)] border border-[var(--gray-6)] rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header with Search */}
            <div className="p-3 border-b border-[var(--gray-5)]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--gray-12)]">Select Template</h3>
                <button
                  onClick={handleClickAdd}
                  className="p-1 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded flex items-center gap-1"
                  title="Create New Template"
                >
                  <FaPlus className="w-3 h-3" />
                  <span className="text-xs">New</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)]"
              />
            </div>

            {/* Templates List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <FaSpinner className="animate-spin text-xl text-[var(--gray-9)]" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--gray-10)]">
                  {searchTerm ? 'No templates found' : 'No templates available'}
                </div>
              ) : (
                <>
                  {/* Personal Templates */}
                  {filteredPersonal.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-xs font-semibold text-[var(--gray-10)] uppercase">
                        My Templates
                      </div>
                      {filteredPersonal.map((template) => (
                        <button
                          key={template.template_id}
                          onClick={() => handleTemplateClick(template.template_id)}
                          disabled={loadingTemplate}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--gray-3)] rounded-lg transition-all flex items-center justify-between group disabled:opacity-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--gray-12)] truncate">
                              {template.name}
                            </div>
                            <div className="text-xs text-[var(--gray-10)] truncate">
                              Updated {new Date(template.modified_at).toLocaleDateString()}
                            </div>
                          </div>
                          {loadingTemplate &&
                            selectedTemplateId === template.template_id.toString() && (
                              <FaSpinner className="animate-spin w-3 h-3 text-[var(--gray-9)]" />
                            )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Shared Templates (from other users only) */}
                  {filteredShared.length > 0 && (
                    <div
                      className={`p-2 ${filteredPersonal.length > 0 ? 'border-t border-[var(--gray-5)]' : ''}`}
                    >
                      <div className="px-2 py-1 text-xs font-semibold text-[var(--gray-10)] uppercase">
                        Shared by Others
                      </div>
                      {filteredShared.map((template) => (
                        <button
                          key={template.template_id}
                          onClick={() => handleTemplateClick(template.template_id)}
                          disabled={loadingTemplate}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--gray-3)] rounded-lg transition-all flex items-center justify-between group disabled:opacity-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--gray-12)] truncate">
                              {template.name}
                            </div>
                            <div className="text-xs text-[var(--gray-10)] truncate">
                              By {template.created_by} •{' '}
                              {new Date(template.modified_at).toLocaleDateString()}
                            </div>
                          </div>
                          {loadingTemplate &&
                            selectedTemplateId === template.template_id.toString() && (
                              <FaSpinner className="animate-spin w-3 h-3 text-[var(--gray-9)]" />
                            )}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TemplateSelector;
