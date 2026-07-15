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
import { API_URL, authCheck } from './config';

// ACL Types
export interface ACLPermission {
  folder_path: string;
  permissions: string;
  user: string;
}

export interface ACLResponse {
  message: string;
  acl?: ACLPermission[];
}

export interface ACLOwnResponse {
  message: string;
  acl?: string;
}

export interface SetACLPayload {
  folder_path: string;
  permissions: string;
  user: string;
}

export interface DeleteACLPayload {
  folder_path: string;
  intended_user: string;
}

// API Functions
export const getACL = async (folder_path: string): Promise<ACLResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const url = new URL(`${API_URL}/folder/acl`);
  url.searchParams.append('folder_path', folder_path);

  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get ACL...!');
  }

  return await res.json();
};

export const setACL = async (payload: SetACLPayload): Promise<ACLResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetch(`${API_URL}/folder/acl`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to set ACL...!');
  }

  return await res.json();
};

export const deleteACL = async (payload: DeleteACLPayload): Promise<ACLResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const url = new URL(`${API_URL}/folder/acl`);
  url.searchParams.append('folder_path', payload.folder_path);
  url.searchParams.append('intended_user', payload.intended_user);

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to delete ACL...!');
  }

  return await res.json();
};

export const getOwnACL = async (folder_path: string): Promise<ACLOwnResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const url = new URL(`${API_URL}/folder/acl/own`);
  url.searchParams.append('folder_path', folder_path);

  const res = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get own ACL...!');
  }

  return await res.json();
};
