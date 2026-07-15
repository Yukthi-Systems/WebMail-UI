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

import { webmailStore } from '../store.ts';
import { apiKeyAtom, csrfTokenAtom } from '../state/auth';
import { API_URL } from './config.ts';

export type Domain = {
  domain: string;
  smtp_server: string;
  smtp_port: number;
  imap_server: string;
  imap_port: number;
  sieve_server: string;
  sieve_port: number;
  is_active: boolean;
  is_v2_user: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateDomainData = {
  domain: string;
  smtp_server: string;
  smtp_port: number;
  imap_server: string;
  imap_port: number;
  sieve_server: string;
  sieve_port: number;
  is_active: boolean;
  is_v2_user: boolean;
};

export type UpdateDomainData = Partial<CreateDomainData>;

// Helper to get headers
const getHeaders = () => {
  const apiKey = webmailStore.get(apiKeyAtom);
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };
};

export const getDomainList = async (page = 1, size = 20, query?: string): Promise<any> => {
  const url = new URL(`${API_URL}/user/admin/domains`);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('size', size.toString());
  if (query) {
    url.searchParams.set('query', query);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (res.status === 401) {
    webmailStore.set(apiKeyAtom, null);
    sessionStorage.removeItem('apiKey');
    throw new Error('Unauthorized - please log in.');
  } else if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch domains.');
  }
  return res.json();
};

export const getDomain = async (domain: string): Promise<Domain> => {
  const res = await fetch(`${API_URL}/user/admin/domain/${domain}`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch domain details.');
  }

  return res.json();
};

export const createDomain = async (data: CreateDomainData): Promise<Domain> => {
  const res = await fetch(`${API_URL}/user/admin/domain`, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create domain.');
  }

  return res.json();
};

export const updateDomain = async (domain: string, data: UpdateDomainData): Promise<Domain> => {
  const res = await fetch(`${API_URL}/user/admin/domain/${domain}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update domain.');
  }

  return res.json();
};

export const deleteDomain = async (domain: string): Promise<void> => {
  const res = await fetch(`${API_URL}/user/admin/domain/${domain}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete domain.');
  }
};
