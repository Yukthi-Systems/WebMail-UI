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

// src/components/settings/templates/index.tsx
import React, { useEffect, useState } from 'react';
import EmptyState from './EmptyStates';
import TemplateToolbar from './Toolbar';
import TemplateCard from './TempelateCard';
import TemplateModal from './TempelateModal';
import { FaSpinner, FaPlus } from 'react-icons/fa';
import { useAtomValue } from 'jotai';
import { userDetailsAtom } from '../../../state/userDetails';
import {
  useCreateEmailTemplate,
  useDeleteEmailTemplate,
  useEmailTemplates,
  useUpdateEmailTemplate,
  useEmailTemplate,
} from '../../../hooks/useTempelate';
import { useToast } from '../../ui/ToastComponent';
import { useLocation, useNavigate } from '@tanstack/react-router';

export type FilterType = 'all' | 'private' | 'public';

interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
  type: 'private' | 'public';
}

const EmailTemplateManager = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('private');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const userDetails = useAtomValue(userDetailsAtom);
  const toast = useToast();

  // API Hooks
  const isPublicFilter = filterType === 'private' ? false : filterType === 'public';
  const { data: templatesData, isLoading, error } = useEmailTemplates(isPublicFilter);

  // Fetch full template details when editing
  const { data: fullTemplate, isLoading: isLoadingTemplate } = useEmailTemplate(
    editingTemplateId || '',
    !!editingTemplateId && isModalOpen
  );

  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate();
  const deleteMutation = useDeleteEmailTemplate();

  const templates = templatesData || [];

  const handleOpenModal = (templateId?: string) => {
    if (templateId) {
      setEditingTemplateId(templateId);
    } else {
      setEditingTemplateId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplateId(null);
  };

  useEffect(() => {
    // Parse search params from URL
    const searchParams = new URLSearchParams(location.search);
    const shouldOpenModal = searchParams.get('openTemplateModal') === 'true';

    if (shouldOpenModal) {
      setIsModalOpen(true);
      // Clear the search param to prevent reopening on refresh
      // navigate({
      //   to: location.pathname,
      //   hash: location.hash,
      //   search: {}
      // }, { replace: true });
    }
  }, [location.search, location.pathname, location.hash, navigate]);

  const handleSave = async (formData: TemplateFormData) => {
    try {
      if (editingTemplateId) {
        await updateMutation.mutateAsync({
          templateId: editingTemplateId,
          data: {
            name: formData.name,
            subject: formData.subject,
            body: formData.content,
            is_public: formData.type === 'public',
            meta_data: {
              created_by: userDetails?.email || fullTemplate?.created_by,
              updated_at: new Date().toISOString(),
              created_at: fullTemplate?.created_at ?? '',
            },
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          subject: formData.subject,
          body: formData.content,
          is_public: formData.type === 'public',
          meta_data: {
            created_by: userDetails?.email || 'unknown',
            created_at: new Date().toISOString(),
            updated_at: '',
          },
        });
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.error({ description: 'Failed to save template. Please try again.' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error({ description: 'Failed to delete template' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (templateId: string) => {
    setCopiedId(templateId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const hasFilters = searchTerm !== '' || filterType !== 'all';

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--gray-1)] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-6 bg-[var(--red-3)] border border-[var(--red-6)] rounded-lg">
            <p className="text-sm text-[var(--red-11)]">
              Failed to load email templates. Please refresh the page and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-1)] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Show header only when there are templates or filters applied */}
        {(filteredTemplates.length > 0 || hasFilters) && (
          <>
            {/* Header with New Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--gray-12)] mb-1">
                  Email Templates
                </h1>
                <p className="text-xs sm:text-sm text-[var(--gray-11)]">
                  Create and manage reusable HTML email templates
                </p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md whitespace-nowrap self-start sm:self-auto"
              >
                <FaPlus className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">New Template</span>
                <span className="xs:hidden">New</span>
              </button>
            </div>
            {/* Toolbar with Search and Filters */}
            <TemplateToolbar
              searchTerm={searchTerm}
              filterType={filterType}
              onSearchChange={setSearchTerm}
              onFilterChange={setFilterType}
            />
          </>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FaSpinner className="animate-spin text-2xl text-[var(--accent-9)] mx-auto mb-3" />
              <p className="text-sm text-[var(--gray-11)]">Loading templates...</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onCreateTemplate={() => handleOpenModal()} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.template_id}
                template={{
                  id: template.template_id.toString(),
                  name: template.name,
                  subject: '',
                  content: '',
                  type: 'private',
                  createdAt: template.created_at,
                  updatedAt: template.modified_at,
                  createdBy: template?.created_by,
                }}
                copiedId={copiedId}
                onCopy={() => handleCopy(template.template_id.toString())}
                onEdit={() => handleOpenModal(template.template_id.toString())}
                onDelete={handleDelete}
                isDeleting={deletingId === template.template_id.toString()}
              />
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <TemplateModal
          isOpen={isModalOpen}
          editingTemplate={
            fullTemplate
              ? {
                  id: fullTemplate.template_id.toString(),
                  name: fullTemplate.data.name,
                  subject: fullTemplate.data.subject,
                  content: fullTemplate.data.body,
                  type: fullTemplate.is_public ? 'public' : 'private',
                  createdAt: fullTemplate.data.meta_data.created_at,
                  createdBy: fullTemplate.data.meta_data.created_by,
                  updatedAt: fullTemplate.modified_at,
                }
              : null
          }
          onClose={handleCloseModal}
          onSave={handleSave}
          isLoading={
            createMutation.isPending ||
            updateMutation.isPending ||
            (editingTemplateId !== null && isLoadingTemplate)
          }
        />
      )}
    </div>
  );
};

export default EmailTemplateManager;
