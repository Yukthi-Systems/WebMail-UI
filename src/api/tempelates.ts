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

// src/api/tempelates.ts

import { csrfTokenAtom } from '../state/auth';
import { webmailStore } from '../store';
import { API_URL } from './config';
import { fetchWithAuth } from './fetchWrapper';

interface EmailTemplateMetadata {
  created_at: string;
  created_by: string;
  updated_at: string;
}

// List response - minimal data
interface EmailTemplateListItem {
  template_id: number;
  name: string;
  created_at: string;
  modified_at: string;
  created_by?: string;
}

// Full template details - from GET by ID
interface EmailTemplate {
  template_id: number;
  name: string;
  created_by: string;
  is_public: boolean;
  data: {
    body: string;
    name: string;
    subject: string;
    meta_data: EmailTemplateMetadata;
  };
  created_at: string;
  modified_at: string;
}

// API response wrapper for GET by ID
interface EmailTemplateResponse {
  message: string;
  data: EmailTemplate;
}

interface CreateTemplateData {
  name: string;
  subject: string;
  body: string;
  is_public: boolean;
  meta_data?: EmailTemplateMetadata;
}

interface UpdateTemplateData {
  name?: string;
  subject?: string;
  body?: string;
  is_public?: boolean;
  meta_data?: EmailTemplateMetadata;
}

// Fetch all email templates (minimal data)
export const getEmailTemplates = async (
  isPublic: boolean = false
): Promise<EmailTemplateListItem[]> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const params = new URLSearchParams();

  if (isPublic !== undefined) {
    params.append('is_public', String(isPublic));
  }

  const url = `${API_URL}/email/templates${params.toString() ? `?${params.toString()}` : ''}`;

  const res = await fetchWithAuth(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to fetch email templates');
  }
  const response = await res.json();
  return response.data; // Extract the data from the wrapper
};

// Fetch single template by ID (full details)
export const getEmailTemplateById = async (templateId: string): Promise<EmailTemplate> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const res = await fetchWithAuth(`${API_URL}/email/template/${templateId}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to fetch email template');
  }

  const response: EmailTemplateResponse = await res.json();
  return response.data; // Extract the data from the wrapper
};

export const createEmailTemplate = async (
  templateData: CreateTemplateData
): Promise<EmailTemplate> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const res = await fetchWithAuth(`${API_URL}/email/template`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(templateData),
  });

  if (res.status !== 201) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to create email template');
  }

  return await res.json();
};

export const updateEmailTemplate = async (
  templateId: string,
  templateData: UpdateTemplateData
): Promise<EmailTemplate> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const res = await fetchWithAuth(`${API_URL}/email/template/${templateId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(templateData),
  });

  if (res.status !== 200) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to update email template');
  }

  return await res.json();
};

export const deleteEmailTemplate = async (templateId: string): Promise<void> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const res = await fetchWithAuth(`${API_URL}/email/template/${templateId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  if (res.status !== 200 && res.status !== 204) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to delete email template');
  }
  if (res.status === 200) {
    return await res.json();
  }

  // For 204, return nothing
  return;
};

export type {
  EmailTemplate,
  EmailTemplateListItem,
  CreateTemplateData,
  UpdateTemplateData,
  EmailTemplateMetadata,
};
