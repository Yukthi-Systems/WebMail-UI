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
import { apiKeyAtom } from '../state/auth';
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
  /**
   * Mail server configuration; null for an internal domain (SSO sign-in only,
   * no mail server)
   */
  config_id?: number | null;
  config_name?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * The servers and ports of a domain, the old way (bulk import / edit): the API
 * finds or creates their configuration.
 */
export type DomainServers = {
  smtp_server: string;
  smtp_port: number;
  imap_server: string;
  imap_port: number;
  sieve_server: string;
  sieve_port: number;
};

/**
 * A domain's mail server is a configuration (config_id; null = SSO sign-in
 * only), or its servers and ports.
 */
export type UpdateDomainData = { is_active: boolean } & (
  | { config_id: number | null }
  | DomainServers
);

export type CreateDomainData = { domain: string } & UpdateDomainData;

/** A mail server configuration, shared by the domains on these servers. */
export type MailServerConfig = {
  config_id: number;
  config_name: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  sieve_host: string;
  sieve_port: number;
  /** How many domains use it. */
  domain_count: number;
  created_at: string;
  updated_at: string;
};

export type MailServerConfigData = {
  /** Optional on create: named after its hosts if empty. */
  config_name: string;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  sieve_host: string;
  sieve_port: number;
};

/** The API's error message, without its "Oops! " prefix. */
const errorMessage = async (res: Response, fallback: string): Promise<string> => {
  if (res.status === 401) {
    webmailStore.set(apiKeyAtom, null);
    sessionStorage.removeItem('apiKey');
    return 'Unauthorized - please log in.';
  }
  try {
    const body = await res.json();
    const message = typeof body?.message === 'string' ? body.message : '';
    return message.replace(/^Oops!\s*/, '') || fallback;
  } catch {
    return fallback;
  }
};

// Helper to get headers
const getHeaders = () => {
  const apiKey = webmailStore.get(apiKeyAtom);
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };
};

export interface DomainListResponse {
  data: Domain[];
  total_count: number;
  current_page?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
  page_size?: number;
}

export const getDomainList = async (
  page = 1,
  size = 20,
  query?: string
): Promise<DomainListResponse> => {
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

  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to fetch domains.'));
  return res.json();
};

export const getDomain = async (domain: string): Promise<Domain> => {
  const res = await fetch(`${API_URL}/user/admin/domain/${domain}`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to fetch domain details.'));

  return res.json();
};

export const createDomain = async (data: CreateDomainData): Promise<Domain> => {
  const res = await fetch(`${API_URL}/user/admin/domain`, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to create domain.'));

  return res.json();
};

export const updateDomain = async (domain: string, data: UpdateDomainData): Promise<Domain> => {
  const res = await fetch(`${API_URL}/user/admin/domain/${domain}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to update domain.'));

  return res.json();
};

export const deleteDomain = async (domain: string): Promise<void> => {
  const res = await fetch(`${API_URL}/user/admin/domain/${domain}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to delete domain.'));
};

export const getConfigList = async (): Promise<MailServerConfig[]> => {
  const res = await fetch(`${API_URL}/user/admin/configs`, {
    method: 'GET',
    credentials: 'include',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to fetch configurations.'));
  const body: { data?: MailServerConfig[] } = await res.json();
  return body.data ?? [];
};

export const createConfig = async (data: MailServerConfigData): Promise<MailServerConfig> => {
  const res = await fetch(`${API_URL}/user/admin/config`, {
    method: 'POST',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to create configuration.'));
  return (await res.json()).data;
};

export const updateConfig = async (
  configId: number,
  data: Partial<MailServerConfigData>
): Promise<MailServerConfig> => {
  const res = await fetch(`${API_URL}/user/admin/config/${configId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to update configuration.'));
  return (await res.json()).data;
};

export const deleteConfig = async (configId: number): Promise<void> => {
  const res = await fetch(`${API_URL}/user/admin/config/${configId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to delete configuration.'));
};
