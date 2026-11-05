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
import type { SearchRequest } from './search.ts';
import {
  normalizeEmails,
  threadToRow,
  unquoteFolder,
  type ApiThread,
  type EmailLike,
  type ThreadInfo,
} from '../utils/threads.ts';
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
  /** The IMAP UID (never the sequence number), unique inside folderPath */
  id: string;
  uid?: string;
  folderPath?: string;
  // Real attachments only — images embedded in the body don't count
  has_attachment?: boolean;
  /** Set on conversation rows (conversation view) */
  thread?: ThreadInfo;
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

/** Conversation list: one row per conversation, same shape as EmailResponse */
interface ThreadListResponse extends EmailResponse {
  /** Emails in all the conversations (total_count counts conversations) */
  total_messages: number;
  uid_validity: string;
  sent_folder_path: string | null;
}

interface ThreadListOptions {
  sortOrder?: EmailSortOrder;
  filterBy?: EmailFilterBy;
  /** Sent folder path from the folder settings (saves the API a lookup) */
  sentFolder?: string;
}

/** A conversation opened in the viewer */
interface ThreadDetail {
  /** All emails, oldest first: this folder's and your replies (each with folderPath) */
  emails: EmailLike[];
  row: EmailLike;
  uid_validity: string;
  sent_folder_path: string | null;
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

const authHeaders = (contentType?: string): Record<string, string> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
  };
};

/**
 * Query string of every call that names emails by id: the ids are UIDs
 * (use_uid=true), never sequence numbers.
 */
const uidParams = (folderPath: string, extra: Record<string, string> = {}) =>
  new URLSearchParams({
    folder_path: sanitizeFolderPath(unquoteFolder(folderPath)),
    ...extra,
    use_uid: 'true',
  });

const errorMessage = async (res: Response, fallback: string) => {
  const error = await res.json().catch(() => ({}));
  return (error as { message?: string }).message || fallback;
};

export const emails = async (
  folder: string,
  page: number = 1,
  perPage: number = 10,
  full_headers: boolean = true,
  { sortBy = 'date', sortOrder = 'desc', filterBy = 'all' }: EmailListOptions = {}
): Promise<EmailResponse> => {
  const params = new URLSearchParams();
  params.append('folder_path', sanitizeFolderPath(folder));
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
    headers: authHeaders('application/json'),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Unable to list emails'));
  }
  const data = (await res.json()) as EmailResponse;
  // id := UID, so everything that acts on a listed email uses its UID
  const listed = normalizeEmails(data.emails as unknown as Record<string, unknown>[], folder);
  return { ...data, emails: listed as unknown as Email[] };
};

/**
 * One page of conversations: the API groups the whole folder, so a
 * conversation is never split over pages and the totals count conversations.
 */
export const emailThreads = async (
  folder: string,
  page: number = 1,
  perPage: number = 50,
  { sortOrder = 'desc', filterBy = 'all', sentFolder }: ThreadListOptions = {}
): Promise<ThreadListResponse> => {
  const params = new URLSearchParams({
    folder_path: sanitizeFolderPath(folder),
    sort_order: sortOrder,
    filter_by: filterBy,
    full_headers: 'true',
  });
  if (sentFolder) params.append('sent_folder', unquoteFolder(sentFolder));

  const res = await fetchListWithAuth(`${API_URL}/email/threads/${perPage}/${page}?${params}`, {
    method: 'GET',
    credentials: 'include',
    timeout: 120000,
    headers: authHeaders('application/json'),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Unable to list conversations'));
  }
  const data = await res.json();
  return {
    emails: ((data.threads ?? []) as ApiThread[]).map(
      (thread) => threadToRow(thread, folder) as unknown as Email
    ),
    total_count: data.total_count ?? 0,
    total_pages: data.total_pages ?? 0,
    total_messages: data.total_messages ?? 0,
    currentPage: page,
    sort_order: sortOrder,
    filter_by: filterBy,
    uid_validity: String(data.uid_validity ?? ''),
    sent_folder_path: data.sent_folder_path ? unquoteFolder(data.sent_folder_path) : null,
  };
};

/** The conversation containing email `uid` of `folder`, with all its emails */
export const emailThread = async (
  uid: string,
  folder: string,
  { sentFolder }: { sentFolder?: string } = {}
): Promise<ThreadDetail> => {
  const params = new URLSearchParams({
    folder_path: sanitizeFolderPath(unquoteFolder(folder)),
    full_headers: 'true',
  });
  if (sentFolder) params.append('sent_folder', unquoteFolder(sentFolder));

  const res = await fetchWithAuth(`${API_URL}/email/thread/${uid}?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders('application/json'),
  });
  const data = await res.json();
  return {
    // Each email keeps its own folder: your replies are in the Sent folder
    emails: normalizeEmails(data.emails ?? [], folder),
    row: threadToRow(data as ApiThread, folder),
    uid_validity: String(data.uid_validity ?? ''),
    sent_folder_path: data.sent_folder_path ? unquoteFolder(data.sent_folder_path) : null,
  };
};

export const emailRaw = async (
  uid: string,
  folderPath: string,
  markAsRead: boolean = true
): Promise<string> => {
  const params = uidParams(folderPath, { mark_as_read: String(markAsRead) });
  const res = await fetchWithAuth(`${API_URL}/email/raw/${uid}?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders('message/rfc822'),
  });

  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Unable to fetch raw email'));
  }

  const buffer = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(buffer);
};

/**
 * Body + attachment list only (a few KB), instead of the whole raw message.
 * Attachments are downloaded separately via emailAttachment().
 */
export const emailView = async (
  uid: string,
  folderPath: string,
  markAsRead: boolean = true
): Promise<EmailViewResponse> => {
  const params = uidParams(folderPath, { mark_as_read: String(markAsRead) });
  const res = await fetchWithAuth(`${API_URL}/email/view/${uid}?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders('application/json'),
  });

  return res.json();
};

/**
 * Downloads a single attachment part as a Blob. Needs fetch() (not <a href> /
 * <img src>) because the request must carry the X-CSRF-Token header.
 */
export const emailAttachment = async (
  uid: string,
  partId: string,
  folderPath: string,
  inline: boolean = false
): Promise<Blob> => {
  const params = uidParams(folderPath, { inline: String(inline) });
  const res = await fetchWithAuth(`${API_URL}/email/attachment/${uid}/${partId}?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(),
  });

  return res.blob();
};

/** PUT/PATCH/DELETE with a JSON list of UIDs as body */
const sendUidList = async (
  method: 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  params: URLSearchParams,
  uids: number[],
  fallbackError: string
) => {
  const res = await fetchWithAuth(`${API_URL}${path}?${params}`, {
    method,
    credentials: 'include',
    headers: authHeaders('application/json'),
    body: uids.length ? JSON.stringify(uids) : undefined,
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, fallbackError));
  }
  return res.json();
};

const folderParams = (path: string, sourceFolder: string, destFolder: string) =>
  uidParams(path, {
    source_folder: sanitizeFolderPath(unquoteFolder(sourceFolder)),
    dest_folder: sanitizeFolderPath(unquoteFolder(destFolder)),
  });

/** Moves emails (UIDs of sourceFolder). They get new UIDs in destFolder. */
export const moveEmail = (
  path: string,
  sourceFolder: string,
  destFolder: string,
  body: number[]
): Promise<EmailFolders> =>
  sendUidList(
    'PUT',
    '/email/move',
    folderParams(path, sourceFolder, destFolder),
    body,
    'Unable to Move Email'
  );

export const copyEmail = (
  path: string,
  sourceFolder: string,
  destFolder: string,
  body: number[]
): Promise<EmailFolders> =>
  sendUidList(
    'PATCH',
    '/email/copy',
    folderParams(path, sourceFolder, destFolder),
    body,
    'Unable to copy Email'
  );

/** Deletes exactly these UIDs (never other emails already marked as deleted) */
export const deleteEmail = (path: string, body: number[]): Promise<EmailFolders> =>
  sendUidList('DELETE', '/email/permanently', uidParams(path), body, 'Unable to Delete Email');

export const markReadEmail = (path: string, body: number[]): Promise<EmailFolders> =>
  sendUidList('PUT', '/email/mark/read', uidParams(path), body, 'Unable to Mark Email as Read');

export const unmarkReadEmail = (path: string, body: number[]): Promise<EmailFolders> =>
  sendUidList(
    'PATCH',
    '/email/mark/unseen',
    uidParams(path),
    body,
    'Unable to Mark Email as Unread'
  );

export const markFlaggedEmail = (path: string, body: number[]): Promise<EmailFolders> =>
  sendUidList(
    'PUT',
    '/email/mark/flagged',
    uidParams(path),
    body,
    'Unable to Mark Email as Flagged'
  );

export const markUnFlaggedEmail = (path: string, body: number[]): Promise<EmailFolders> =>
  sendUidList(
    'PATCH',
    '/email/mark/unflagged',
    uidParams(path),
    body,
    'Unable to Mark Email as Unflagged'
  );

export type BulkAction = 'read' | 'unread' | 'flag' | 'unflag' | 'move' | 'delete';

export interface BulkEmailRequest {
  folder_path: string;
  action: BulkAction;
  /** UIDNEXT - 1 when the user selected all: newer emails are not touched */
  max_uid: number;
  uid_validity: string;
  dest_folder?: string;
  /** Emails the user unselected */
  exclude_uids: number[];
  filter_by: string;
  search?: SearchRequest;
  conversations: boolean;
}

export interface BulkEmailResponse {
  folder_path: string;
  action: BulkAction;
  done: number;
  /** Above 0: send the same request again */
  remaining: number;
  /** Unread emails among those moved or deleted */
  unread_affected: number;
}

/** Runs an action on all emails of a folder, filter or search, not only the loaded page. */
export const bulkEmails = async (request: BulkEmailRequest): Promise<BulkEmailResponse> => {
  const clean = (path: string) => sanitizeFolderPath(unquoteFolder(path));
  const res = await fetchWithAuth(`${API_URL}/email/bulk`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders('application/json'),
    body: JSON.stringify({
      ...request,
      folder_path: clean(request.folder_path),
      dest_folder: request.dest_folder ? clean(request.dest_folder) : undefined,
      search: request.search ? { ...request.search, folder: clean(request.search.folder) } : undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Unable to change the selected emails'));
  }
  return res.json();
};

/** Marks every unread email in the folder as read, including ones not loaded in the UI. */
export const markFolderRead = async (
  folderPath: string
): Promise<{ message: string; folder_path: string; marked_count: number }> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const params = new URLSearchParams({ folder_path: folderPath });
  const res = await fetchWithAuth(`${API_URL}/folder/mark-read?${params}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  return res.json();
};

/** Permanently deletes every email in a Trash or Spam folder (the API refuses other folders). */
export const emptyFolder = async (
  folderPath: string
): Promise<{ message: string; folder_path: string; deleted_count: number }> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const params = new URLSearchParams({ folder_path: folderPath });
  const res = await fetchWithAuth(`${API_URL}/folder/empty?${params}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });
  return res.json();
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
  type ThreadListResponse,
  type ThreadListOptions,
  type ThreadDetail,
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
