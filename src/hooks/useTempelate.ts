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

// src/hooks/useTempelate.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
  type EmailTemplateListItem,
  type CreateTemplateData,
  type UpdateTemplateData,
} from '../api/tempelates';
import { useCallback } from 'react';
import { emailRaw } from '../api/mailbox';
import PostalMime from 'postal-mime';
import { convertPostalMimeAttachments, processIncomingHtml } from '../utils/replyForwardHelper';

// Query key factory
export const emailTemplateKeys = {
  all: ['emailTemplates'] as const,
  lists: () => [...emailTemplateKeys.all, 'list'] as const,
  list: (isPublic?: boolean) => [...emailTemplateKeys.lists(), { isPublic }] as const,
  details: () => [...emailTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailTemplateKeys.details(), id] as const,
};

// Fetch all email templates (list view - minimal data)
export const useEmailTemplates = (isPublic?: boolean) => {
  return useQuery({
    queryKey: emailTemplateKeys.list(isPublic),
    queryFn: () => getEmailTemplates(isPublic),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch single template by ID (full details for editing)
export const useEmailTemplate = (templateId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: emailTemplateKeys.detail(templateId),
    queryFn: () => getEmailTemplateById(templateId),
    enabled: enabled && !!templateId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Create email template
export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateData: CreateTemplateData) => createEmailTemplate(templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
    },
  });
};

// Update email template
export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTemplateData }) =>
      updateEmailTemplate(templateId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.detail(variables.templateId) });
    },
  });
};

// Delete email template
export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteEmailTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.lists() });
    },
  });
};

export const useTemplateActions = () => {
  const queryClient = useQueryClient();

  const prepareTemplateFromCache = useCallback(
    async (messageId: string, folderPath: string) => {
      let rawEmail = queryClient.getQueryData<string>(['email', 'raw', messageId, folderPath]);

      if (!rawEmail) {
        rawEmail = await emailRaw(messageId, folderPath);
        queryClient.setQueryData(['email', 'raw', messageId, folderPath], rawEmail);
      }

      if (!rawEmail) throw new Error('No raw content found');

      const parsed = await PostalMime.parse(rawEmail);

      // ✅ Convert attachments and embed inline images as base64 data URLs
      const allAttachments = parsed.attachments
        ? convertPostalMimeAttachments(parsed.attachments)
        : [];

      const { html, regularAttachments } = processIncomingHtml(
        parsed.html || parsed.text || '',
        allAttachments
      );

      return {
        subject: parsed.subject || '',
        body: html,
        attachments: regularAttachments, // non-inline attachments if you want to store them too
      };
    },
    [queryClient]
  );

  return { prepareTemplateFromCache };
};

export type { EmailTemplate, EmailTemplateListItem, CreateTemplateData, UpdateTemplateData };
