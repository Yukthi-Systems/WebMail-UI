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
import { API_URL } from './config';
import { fetchWithAuth } from './fetchWrapper';

export interface SieveScriptList {
  active: string | null;
  scripts: string[];
}

export interface ListScriptsApiResponse {
  message: string;
  scripts: SieveScriptList;
}

// API uses tuple arrays, not objects. Element types vary per condition/action
// kind (strings for field/operator/value, but e.g. size comparisons can carry
// numbers), so these stay loosely typed rather than guessing a fixed tuple shape.
export type SieveFilterCondition = unknown[]; // e.g., ["Subject", ":matches", "Junk*"]
export type SieveFilterAction = unknown[]; // e.g., ["fileinto", "Junks"]

export interface SieveFilter {
  name: string;
  enabled: boolean;
  conditions: SieveFilterCondition[];
  actions: SieveFilterAction[];
  match_type?: 'allof' | 'anyof' | ''; // Note: it's "allof" not "all"
  priority?: number;
  content?: string;
}

export interface GetFilterResponse {
  message: string;
  filter_data: SieveFilter;
}

export interface SieveFilters {
  name: string;
  enabled?: boolean;
  conditions: SieveFilterCondition[];
  actions: SieveFilterAction[];
  match_type?: 'allof' | 'anyof' | '';
}

export interface SieveFilterList {
  filters: {
    name: string;
    enabled: boolean;
  }[];
  message: string;
}

// Request/Response types
export interface CreateScriptRequest {
  script_name: string;
  script_content: string;
}

export interface RenameScriptRequest {
  old_script_name: string;
  new_script_name: string;
}

export interface CreateFilterRequest {
  script_name: string;
  filter: SieveFilters;
}

export interface UpdateFilterRequest {
  script_name: string;
  filter_name: string;
  filter: SieveFilters;
}

export interface SieveApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

// List all scripts
export const listScripts = async (): Promise<ListScriptsApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/sieve/scripts`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to list scripts');
  }
  return await res.json();
};

// Create a new script
export const createScript = async (
  scriptName: string,
  scriptContent: string
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/scripts/${encodeURIComponent(scriptName)}?script_content=${encodeURIComponent(scriptContent)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to create script');
  }
  return await res.json();
};

// Delete a script
export const deleteScript = async (scriptName: string): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/sieve/scripts/${encodeURIComponent(scriptName)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to delete script');
  }
  return await res.json();
};

// Enable a script
export const enableScript = async (scriptName: string): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/scripts/${encodeURIComponent(scriptName)}/enable`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to enable script');
  }
  return await res.json();
};

// Rename a script
export const renameScript = async (
  oldScriptName: string,
  newScriptName: string
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/scripts/${encodeURIComponent(oldScriptName)}/rename/${encodeURIComponent(newScriptName)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to rename script');
  }
  return await res.json();
};

// Get raw script data
export const getScriptRaw = async (scriptName: string): Promise<string> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/scripts/${encodeURIComponent(scriptName)}/raw`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get script');
  }
  return await res.json();
};

// Filter endpoints
// List all filters in a script
export const listFilters = async (scriptName: string): Promise<SieveFilterList> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to list filters');
  }
  return await res.json();
};

// Create a new filter
export const createFilter = async (
  scriptName: string,
  filter: SieveFilters
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(filter),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to create filter');
  }
  return await res.json();
};

// Get filter data
export const getFilter = async (
  scriptName: string,
  filterName: string
): Promise<GetFilterResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}/${encodeURIComponent(filterName)}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get filter');
  }
  return await res.json();
};

// Update a filter
export const updateFilter = async (
  scriptName: string,
  filterName: string,
  filter: SieveFilters
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}/${encodeURIComponent(filterName)}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(filter),
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to update filter');
  }
  return await res.json();
};

// Delete a filter
export const deleteFilter = async (
  scriptName: string,
  filterName: string
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}/${encodeURIComponent(filterName)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to delete filter');
  }
  return await res.json();
};

// Disable a filter
export const disableFilter = async (
  scriptName: string,
  filterName: string
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}/${encodeURIComponent(filterName)}/disable`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to disable filter');
  }
  return await res.json();
};

// Enable a filter
export const enableFilter = async (
  scriptName: string,
  filterName: string
): Promise<SieveApiResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/sieve/filters/${encodeURIComponent(scriptName)}/${encodeURIComponent(filterName)}/enable`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to enable filter');
  }
  return await res.json();
};
