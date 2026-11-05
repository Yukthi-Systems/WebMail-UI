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

/**
 * Email ids, conversations (threads) and list rows.
 *
 * Every email the UI holds is identified by folder + UID: `id` is always the
 * IMAP UID, set by normalizeEmail when the email arrives from the API, and
 * every API call that takes an id sends use_uid=true. Sequence numbers are
 * never kept: they change whenever an earlier email is deleted or moved, so a
 * stored one can open, mark or delete the wrong email.
 */

export interface ThreadInfo {
  /** UID of the oldest email of the conversation in this folder */
  threadId: string;
  /** UIDs of the conversation's emails in this folder, oldest first */
  emailIds: number[];
  /** UIDs of your replies in sentFolderPath (not in this folder) */
  sentEmailIds: number[];
  sentFolderPath: string | null;
  /** Whole conversation: this folder + your replies */
  messageCount: number;
  folderMessageCount: number;
  unreadCount: number;
  isFlagged: boolean;
  hasAttachment: boolean;
  /** Senders in date order */
  participants: string[];
  /** Latest email of the whole conversation, can be your reply */
  lastMessage?: EmailLike;
  /** Search in conversation view: the emails that matched */
  matchedEmailIds?: number[];
}

// Email objects carry whatever header keys the API returned, hence the index signature
export interface EmailLike {
  id?: string | number;
  uid?: string;
  Date?: string;
  FLAGS?: string[];
  Subject?: string;
  References?: string;
  'In-Reply-To'?: string;
  /** Folder the email is in (its UID is only unique inside this folder) */
  folderPath?: string;
  /** Present on conversation rows of the list */
  thread?: ThreadInfo;
  /** A reply just sent, shown before its copy reaches the Sent folder */
  pending?: { html: string; text: string };
  [key: string]: unknown;
}

/** One conversation as returned by /email/threads, /email/thread and /email/search/threads */
export interface ApiThread {
  id: string;
  thread_id: string;
  email_ids: string[];
  sent_email_ids?: string[];
  sent_folder_path?: string | null;
  subject?: string;
  message_count: number;
  folder_message_count?: number;
  sent_count?: number;
  unread_count: number;
  is_unread: boolean;
  is_flagged: boolean;
  has_attachment: boolean;
  participants?: string[];
  latest: Record<string, unknown>;
  last_message?: Record<string, unknown>;
  matched_email_ids?: string[];
}

export class MissingUidError extends Error {
  constructor() {
    super(
      'The mail server API returned an email without a UID. The API must be updated before this version of webmail.'
    );
    this.name = 'MissingUidError';
  }
}

/** The API echoes folder paths the way they were sent, quoted when they contain spaces */
export const unquoteFolder = (folder: string): string => folder.replace(/^"(.*)"$/, '$1');

/**
 * Makes `id` the email's UID and records its folder. Throws when the UID is
 * missing (an API without UID support): acting on a sequence number with
 * use_uid=true would target a different email.
 */
export function normalizeEmail<T extends Record<string, unknown>>(
  raw: T,
  folder: string
): T & { id: string; uid: string; folderPath: string } {
  const uid = raw?.uid;
  if (uid === null || uid === undefined || !/^\d+$/.test(String(uid))) {
    throw new MissingUidError();
  }
  const ownFolder = (raw.folder_path as string) || (raw.folderPath as string) || folder;
  return { ...raw, id: String(uid), uid: String(uid), folderPath: unquoteFolder(ownFolder) };
}

export const normalizeEmails = <T extends Record<string, unknown>>(list: T[], folder: string) =>
  (Array.isArray(list) ? list : []).map((email) => normalizeEmail(email, folder));

const toUids = (ids: (string | number)[] | undefined) => (ids ?? []).map(Number);

/**
 * A conversation as one list row: the latest email of this folder (open it,
 * it decides the row's position) plus the conversation summary. FLAGS describe
 * the whole conversation: unread when any email is, flagged when any is.
 */
export function threadToRow(thread: ApiThread, folder: string): EmailLike & { id: string } {
  const latest = normalizeEmail(thread.latest, folder);
  const flags = (latest.FLAGS as string[] | undefined)?.filter(
    (flag) => flag !== '\\Seen' && flag !== '\\Flagged'
  ) ?? [];
  if (!thread.is_unread) flags.push('\\Seen');
  if (thread.is_flagged) flags.push('\\Flagged');

  const sentFolderPath = thread.sent_folder_path ? unquoteFolder(thread.sent_folder_path) : null;
  const emailIds = toUids(thread.email_ids);

  return {
    ...latest,
    FLAGS: flags,
    has_attachment: thread.has_attachment || latest.has_attachment === true,
    thread: {
      threadId: String(thread.thread_id),
      emailIds,
      sentEmailIds: toUids(thread.sent_email_ids),
      sentFolderPath,
      messageCount: thread.message_count,
      folderMessageCount: thread.folder_message_count ?? emailIds.length,
      unreadCount: thread.unread_count,
      isFlagged: thread.is_flagged,
      hasAttachment: thread.has_attachment,
      participants: thread.participants ?? [],
      lastMessage: thread.last_message
        ? normalizeEmail(thread.last_message, sentFolderPath || folder)
        : undefined,
      matchedEmailIds: thread.matched_email_ids ? toUids(thread.matched_email_ids) : undefined,
    },
  };
}

/** Key for React lists: a conversation keeps its key when a new reply arrives */
export const rowKey = (email: EmailLike) =>
  email.thread ? `thread-${email.thread.threadId}` : `email-${email.id}`;

/**
 * Selected rows → the UIDs to act on. A conversation row stands for all of its
 * emails in this folder (your replies in Sent are left alone).
 */
export function expandRowIds(rows: EmailLike[], rowIds: number[]): number[] {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const uids = rowIds.flatMap((id) => byId.get(id)?.thread?.emailIds ?? [id]);
  return [...new Set(uids)];
}

/**
 * Unread emails among the rows hit by `ids` (row ids or the UIDs from
 * expandRowIds); a conversation counts its unread emails.
 */
export function countUnread(rows: EmailLike[], ids: number[]): number {
  const selected = new Set(ids);
  return rows
    .filter(
      (row) =>
        selected.has(Number(row.id)) || !!row.thread?.emailIds.some((uid) => selected.has(uid))
    )
    .reduce((sum, row) => {
      if (row.thread) return sum + row.thread.unreadCount;
      return sum + (row.FLAGS?.includes('\\Seen') ? 0 : 1);
    }, 0);
}

const withFlag = (flags: string[] | undefined, add?: string, remove?: string) => {
  let result = [...(flags ?? [])];
  if (remove) result = result.filter((flag) => flag !== remove);
  if (add && !result.includes(add)) result.push(add);
  return result;
};

/**
 * Applies a flag change of the emails `uids` (all in the row's folder) to a
 * list row. A conversation row's counters are updated as far as they can be
 * known here; the next list load gives exact numbers.
 */
export function patchRowFlags<T extends EmailLike>(
  row: T,
  uids: Set<number>,
  flagToAdd?: string,
  flagToRemove?: string
): T {
  const thread = row.thread;
  if (!thread) {
    return uids.has(Number(row.id))
      ? { ...row, FLAGS: withFlag(row.FLAGS, flagToAdd, flagToRemove) }
      : row;
  }

  const hits = thread.emailIds.filter((uid) => uids.has(uid)).length;
  if (hits === 0) return row;
  const allHit = hits === thread.emailIds.length;

  let { unreadCount, isFlagged } = thread;
  let flags = row.FLAGS;

  if (flagToAdd === '\\Seen') {
    unreadCount = allHit ? 0 : Math.max(0, unreadCount - hits);
    if (unreadCount === 0) flags = withFlag(flags, '\\Seen');
  }
  if (flagToRemove === '\\Seen') {
    unreadCount = Math.min(thread.messageCount, unreadCount + hits);
    flags = withFlag(flags, undefined, '\\Seen');
  }
  if (flagToAdd === '\\Flagged') {
    isFlagged = true;
    flags = withFlag(flags, '\\Flagged');
  }
  // Other emails of the conversation may still be flagged unless all were unflagged
  if (flagToRemove === '\\Flagged' && allHit) {
    isFlagged = false;
    flags = withFlag(flags, undefined, '\\Flagged');
  }

  return { ...row, FLAGS: flags, thread: { ...thread, unreadCount, isFlagged } };
}
