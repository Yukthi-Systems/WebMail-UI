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

import { csrfTokenAtom } from '../state/auth';
import { webmailStore } from '../store';
import type { CreateContactData } from '../utils/contact';
import { API_URL } from './config';
import { fetchWithAuth } from './fetchWrapper';

interface Contact {
  contact_id: number | string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string | null;
  modified_at: string | null;
}

interface ContactResponse {
  data: Contact[];
  total_count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean | null;
  has_previous: boolean | null;
  next_page: number | null;
  previous_page: number | null;
  first_page: number | null;
  last_page: number | null;
  page_number: number | null;
}

export const getContacts = async (
  page: number = 1,
  perPage: number = 15
): Promise<ContactResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/contacts/list?page=${page}&page_size=${perPage}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to list contacts');
  }
  return await res.json();
};

export const createContact = async (contactData: CreateContactData) => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/contacts/create`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(contactData),
  });
  if (res.status !== 201) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to create contact');
  }
  return await res.json();
};

export const editContact = async (contactData: CreateContactData, contact_id: string | number) => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/contacts/item/${contact_id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(contactData),
  });
  if (res.status !== 200) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to create contact');
  }
  return await res.json();
};

export const deleteContact = async (contact_id: string | number) => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/contacts/item/${contact_id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (res.status !== 200) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to delete contact');
  }
  return await res.json();
};

export class BulkContactError extends Error {
  status?: number;
  data?: unknown;
  details?: unknown;
}

export const createBulkContact = async (contactData: CreateContactData[]) => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  try {
    const res = await fetchWithAuth(`${API_URL}/contacts/bulk`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(contactData),
    });

    const data = await res.json();
    if (!res.ok) {
      // Changed from res.status !== 201
      const errorMessage = data.message || data.error || 'Unable to create contacts';
      const error = new BulkContactError(errorMessage);
      error.status = res.status;
      error.data = data;
      error.details = data.details;

      console.error('Throwing error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Caught error in createBulkContact:', error);
    throw error; // Re-throw to ensure React Query catches it
  }
};
export { type Contact };
