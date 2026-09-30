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
import { webmailStore } from '../store.ts';
import { API_URL } from './config.ts';
import { fetchListWithAuth, fetchWithAuth } from './fetchWrapper.ts';
import type { FolderQuota } from '../state/folders.ts';
import type { EmailLike } from '../utils/emailThreading.ts';
import type { EmailFilterBy, EmailSortBy, EmailSortOrder } from '../state/emailListView.ts';

export type CustomFolders = string[];

interface Email {
  Date: string; // TODO: This can probably be Date type
  FLAGS: string[];
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  bcc?: string;
  Subject: string;
  id: string;
  folderPath?: string;
  // Real attachments only — images embedded in the body don't count
  has_attachment?: boolean;
}

interface EmailFolder {
  name: string;
  default?: boolean;
  path?: string;
  order?: number;
  unread_count?: number;
}

interface EmailFolderCreate {
  path?: string;
}

interface EmailFolderEdit {
  newpath?: string;
  oldpath?: string;
}

interface MoveEmailPayload {
  path: string;
  sourceFolder: string;
  destFolder: string;
  body: number[];
}

interface DeleteEmailPayload {
  path: string;
  body: number[];
}

interface ReadEmailPayload {
  path: string;
  body: number[];
}

interface UnReadEmailPayload {
  path: string;
  body: number[];
}

type DefaultFolder = 'inbox' | 'drafts' | 'sent' | 'spam' | 'trash';

type DefaultFolders = Record<DefaultFolder, EmailFolder>;

type EmailFolders = [DefaultFolders, CustomFolders];

interface EmailResponse {
  emails: Email[];
  total_count: number;
  total_pages: number;
  currentPage: number;
  sort_by?: EmailSortBy;
  sort_order?: EmailSortOrder;
  filter_by?: EmailFilterBy;
}

interface EmailListOptions {
  sortBy?: EmailSortBy;
  sortOrder?: EmailSortOrder;
  filterBy?: EmailFilterBy;
}

interface EmailViewAttachment {
  part_id: string;
  filename: string;
  content_type: string;
  size: number; // bytes (close estimate)
  content_id: string | null;
  is_inline: boolean;
}

interface EmailViewResponse {
  message: string;
  id: string;
  folder_path: string;
  headers: Record<string, string>;
  flags: string[];
  body: { html: string | null; text: string | null };
  has_attachment: boolean;
  attachments: EmailViewAttachment[];
}

const defaultFolders: DefaultFolders = {
  inbox: { name: 'Inbox', path: 'Inbox', default: true, order: 0 },
  drafts: { name: 'Draft', path: 'Draft', default: true, order: 2 },
  sent: { name: 'Sent', path: 'Sent', default: true, order: 2 },
  spam: { name: 'Spam', path: 'Spam', default: true, order: 2 },
  trash: { name: 'Trash', path: 'Trash', default: true, order: 2 },
};

const defaultFolderMap: Record<string, DefaultFolder> = {
  INBOX: 'inbox',
  Inbox: 'inbox',
  Drafts: 'drafts',
  Junk: 'spam',
  Spam: 'spam',
  spam: 'spam',
  Sent: 'sent',
  Trash: 'trash',
};

type FolderResponse = {
  flags: string[];
  delimeter: '.' | '/';
  folder_name: string;
  unread_count: number;
};

export const sanitizeFolderPath = (path: string): string => {
  // Check if any segment has spaces
  const hasSpaces = path.split('/').some((segment) => segment.includes(' '));

  if (hasSpaces) {
    // Quote the entire path if any part has spaces
    return `"${path}"`;
  }

  return path;
};

export const emailFolders = (folders: FolderResponse[]): [DefaultFolders, string[]] => {
  const customFolders: CustomFolders = [];
  folders.forEach((f) => {
    const defaultName = defaultFolderMap[f.folder_name];
    if (defaultName) {
      defaultFolders[defaultName].path = f.folder_name;
    } else {
      customFolders.push(f.folder_name);
    }
  });
  return [defaultFolders, customFolders];
};

export const folders = async (): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/folder/path`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to list folders');
  }

  const body = await res.json();
  return emailFolders(body['folders']);
};

export const foldersFullPath = async (): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/folder/path`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to list folders');
  }

  const body = await res.json();
  return body;
};

export const foldersQuota = async (): Promise<{ quota: FolderQuota }> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/folder/quota?folder_path=INBOX`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get folder quota');
  }

  const body = await res.json();
  return body;
};

export const emails = async (
  folder: string,
  page: number = 1,
  perPage: number = 10,
  full_headers: boolean = true,
  { sortBy = 'date', sortOrder = 'desc', filterBy = 'all' }: EmailListOptions = {}
): Promise<EmailResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(folder);
  const params = new URLSearchParams();
  params.append('folder_path', sanitizedFolder);
  params.append('full_headers', full_headers.toString());
  // Always send sort_by: without it the API returns pages in sequence-number
  // order, which mixes years across pages.
  params.append('sort_by', sortBy);
  params.append('sort_order', sortOrder);
  params.append('filter_by', filterBy);
  const res = await fetchListWithAuth(`${API_URL}/email/fetch/${perPage}/${page}?${params}`, {
    method: 'GET',
    credentials: 'include',
    timeout: 120000,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to list emails');
  }
  return await res.json();
};

export const emailRaw = async (
  messageId: string,
  folderPath: string,
  markAsRead: boolean = true
): Promise<string> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const params = new URLSearchParams();
  const sanitizedFolder = sanitizeFolderPath(folderPath);
  params.append('folder_path', sanitizedFolder);
  params.append('mark_as_read', String(markAsRead));

  const res = await fetchWithAuth(`${API_URL}/email/raw/${messageId}?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'message/rfc822',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to fetch raw email');
  }

  const buffer = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(buffer);
};

/**
 * Body + attachment list only (a few KB), instead of the whole raw message.
 * Attachments are downloaded separately via emailAttachment().
 */
export const emailView = async (
  messageId: string,
  folderPath: string,
  markAsRead: boolean = true
): Promise<EmailViewResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const params = new URLSearchParams();
  params.append('folder_path', sanitizeFolderPath(folderPath));
  params.append('mark_as_read', String(markAsRead));

  const res = await fetchWithAuth(`${API_URL}/email/view/${messageId}?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  return res.json();
};

/**
 * Downloads a single attachment part as a Blob. Needs fetch() (not <a href> /
 * <img src>) because the request must carry the X-CSRF-Token header.
 */
export const emailAttachment = async (
  messageId: string,
  partId: string,
  folderPath: string,
  inline: boolean = false
): Promise<Blob> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const params = new URLSearchParams();
  params.append('folder_path', sanitizeFolderPath(folderPath));
  params.append('inline', String(inline));

  const res = await fetchWithAuth(
    `${API_URL}/email/attachment/${messageId}/${partId}?${params}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    }
  );

  return res.blob();
};

export const emailFetchByIds = async ({
  folderPath,
  messageIds = [],
}: {
  folderPath: string;
  messageIds: string[];
}): Promise<{ emails: EmailLike[] }> => {
  if (!folderPath || messageIds.length === 0) {
    throw new Error('folderPath and messageIds are required');
  }

  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(folderPath);
  const params = new URLSearchParams();
  params.append('folder_path', sanitizedFolder);

  const res = await fetchWithAuth(
    `${API_URL}/email/fetch-by-message-ids?${params}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(messageIds),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Unable to fetch emails');
  }

  return res.json();
};

export const moveEmail = async (
  path: string,
  sourceFolder: string,
  destFolder: string,
  body: number[]
): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedSource = sanitizeFolderPath(sourceFolder);
  const sanitizedDest = sanitizeFolderPath(destFolder);
  const res = await fetchWithAuth(
    `${API_URL}/email/move?folder_path=${path}&source_folder=${sanitizedSource}&dest_folder=${sanitizedDest}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body.length ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to Move Email');
  }

  const data = await res.json();
  return data;
};

export const copyEmail = async (
  path: string,
  sourceFolder: string,
  destFolder: string,
  body: number[]
): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(
    `${API_URL}/email/copy?folder_path=${path}&source_folder=${sourceFolder}&dest_folder=${destFolder}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body.length ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to copy Email');
  }

  const data = await res.json();
  return data;
};

export const deleteEmail = async (path: string, body: number[]): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/email/permanently?folder_path=${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: body.length ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to Delete Email');
  }

  const data = await res.json();
  return data;
};

export const markReadEmail = async (path: string, body: number[]): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(path);
  const res = await fetchWithAuth(`${API_URL}/email/mark/read?folder_path=${sanitizedFolder}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: body.length ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to Mark Email as Read');
  }

  const data = await res.json();
  return data;
};

export const unmarkReadEmail = async (path: string, body: number[]): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(path);
  const res = await fetchWithAuth(`${API_URL}/email/mark/unseen?folder_path=${sanitizedFolder}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: body.length ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to Mark Email as Unread');
  }

  const data = await res.json();
  return data;
};

export const markFlaggedEmail = async (path: string, body: number[]): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(path);
  const res = await fetchWithAuth(`${API_URL}/email/mark/flagged?folder_path=${sanitizedFolder}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: body.length ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to Mark Email as Flagged');
  }

  const data = await res.json();
  return data;
};

export const markUnFlaggedEmail = async (path: string, body: number[]): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(path);
  const res = await fetchWithAuth(
    `${API_URL}/email/mark/unflagged?folder_path=${sanitizedFolder}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body.length ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to Mark Email as Unflagged');
  }

  const data = await res.json();
  return data;
};

export const createEmailFolder = async (path: string): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);

  const encodedPath = sanitizeFolderPath(path);

  const res = await fetchWithAuth(`${API_URL}/folder/path?folder_path=${encodedPath}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create folder');
  }

  const data = await res.json();
  return data;
};

export const deleteEmailFolder = async (path: string): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedFolder = sanitizeFolderPath(path);
  const res = await fetchWithAuth(`${API_URL}/folder/path?folder_path=${sanitizedFolder}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to delete folder');
  }

  const data = await res.json();
  return data;
};

export const editEmailFolder = async (oldpath: string, newpath: string): Promise<EmailFolders> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const sanitizedOldFolder = sanitizeFolderPath(oldpath);
  const sanitizedNewFolder = sanitizeFolderPath(newpath);
  const res = await fetchWithAuth(
    `${API_URL}/folder/path?old_folder_path=${sanitizedOldFolder}&new_folder_path=${sanitizedNewFolder}`,
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
    throw new Error(error.message || 'Failed to delete folder');
  }

  const data = await res.json();
  return data;
};

export const folderUidValidity = async (
  folderPath: string
): Promise<{
  data: { MESSAGES: number; UIDNEXT: number; UIDVALIDITY: number };
  folder_path: string;
  message: string;
}> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/folder/uid-validity?folder_path=${folderPath}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get folder UID validity');
  }

  const body = await res.json();
  return body;
};

export {
  type Email,
  type EmailResponse,
  type EmailListOptions,
  type EmailViewAttachment,
  type EmailViewResponse,
  type EmailFolder,
  type EmailFolders,
  type DefaultFolder,
  type DefaultFolders,
  type MoveEmailPayload,
  type DeleteEmailPayload,
  type ReadEmailPayload,
  type UnReadEmailPayload,
  type EmailFolderCreate,
  type EmailFolderEdit,
  defaultFolders,
};
