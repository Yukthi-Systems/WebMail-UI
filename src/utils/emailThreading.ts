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

// src/utils/emailThreading.ts

import { getMessageId } from './emailUtils';

export const normalizeId = (id = '') => id.replace(/[<>]/g, '').trim();

export const extractIds = (value = ''): string[] => {
  const matches = value.match(/<([^>]+)>/g);
  return matches ? matches.map((v) => normalizeId(v)) : [];
};

export const getCleanSubject = (subject = ''): string => {
  return subject
    .replace(/^(re:|fw:|fwd:|\[.*?\]\s*)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const getEmailDate = (email: any): number => {
  try {
    return new Date(email.Date || 0).getTime();
  } catch {
    return 0;
  }
};

// Helper to build thread connections
const buildThreadConnections = (emails: any[]) => {
  const emailById = new Map<string, any>();
  const emailThreadMap = new Map<string, Set<string>>();

  // Build message ID index
  emails.forEach((email) => {
    const messageId = getMessageId(email);
    if (messageId) {
      emailById.set(messageId, email);
    }
  });

  // Build thread connections via References/In-Reply-To
  emails.forEach((email) => {
    const messageId = getMessageId(email);
    if (!messageId) return;

    const references = extractIds(email['References']);
    const inReplyTo = normalizeId(email['In-Reply-To']);
    const allReferences = [...references];
    if (inReplyTo) allReferences.push(inReplyTo);

    // Connect this email to all its references
    allReferences.forEach((refId) => {
      if (!emailThreadMap.has(refId)) {
        emailThreadMap.set(refId, new Set());
      }
      emailThreadMap.get(refId)!.add(messageId);

      if (!emailThreadMap.has(messageId)) {
        emailThreadMap.set(messageId, new Set());
      }
      emailThreadMap.get(messageId)!.add(refId);
    });
  });

  return { emailById, emailThreadMap };
};

// Find thread root for a message
const findThreadRoot = (
  messageId: string,
  emailThreadMap: Map<string, Set<string>>,
  emailById: Map<string, any>
): string => {
  const visited = new Set<string>();
  let current = messageId;

  while (true) {
    if (visited.has(current)) break;
    visited.add(current);

    const refs = emailThreadMap.get(current);
    if (!refs || refs.size === 0) break;

    // Find the oldest reference (potential parent)
    let oldestRef = '';
    let oldestTime = Infinity;

    refs.forEach((refId) => {
      const refEmail = emailById.get(refId);
      if (refEmail) {
        const refTime = getEmailDate(refEmail);
        if (refTime < oldestTime) {
          oldestTime = refTime;
          oldestRef = refId;
        }
      }
    });

    if (!oldestRef || oldestRef === current) break;
    current = oldestRef;
  }

  return current;
};

// Group messages into threads
const groupMessagesIntoThreads = (
  emails: any[],
  emailById: Map<string, any>,
  emailThreadMap: Map<string, Set<string>>
) => {
  const threadGroups = new Map<string, Set<string>>();

  emails.forEach((email) => {
    const messageId = getMessageId(email);
    if (!messageId) return;

    const rootViaRefs = findThreadRoot(messageId, emailThreadMap, emailById);
    const threadId = rootViaRefs !== messageId ? `ref:${rootViaRefs}` : `single:${messageId}`;

    if (!threadGroups.has(threadId)) {
      threadGroups.set(threadId, new Set());
    }
    threadGroups.get(threadId)!.add(messageId);
  });

  return threadGroups;
};

// Prepare thread info
const prepareThreadInfo = (threadGroups: Map<string, Set<string>>, emailById: Map<string, any>) => {
  const threadInfo = new Map<
    string,
    {
      ids: string[];
      latestId: string;
      latestDate: number;
      count: number;
    }
  >();

  threadGroups.forEach((messageIds, threadId) => {
    const idsArray = Array.from(messageIds);
    if (idsArray.length === 0) return;

    // Sort by date (oldest first)
    idsArray.sort((a, b) => {
      const emailA = emailById.get(a);
      const emailB = emailById.get(b);
      return getEmailDate(emailA) - getEmailDate(emailB);
    });

    // Find latest email in thread
    let latestId = idsArray[0];
    let latestDate = getEmailDate(emailById.get(latestId));

    idsArray.forEach((id) => {
      const emailDate = getEmailDate(emailById.get(id));
      if (emailDate > latestDate) {
        latestDate = emailDate;
        latestId = id;
      }
    });

    threadInfo.set(threadId, {
      ids: idsArray,
      latestId,
      latestDate,
      count: idsArray.length,
    });
  });

  return threadInfo;
};

// Main threading function
export const applyThreading = (apiResponse: any): any[] => {
  const emails = apiResponse.emails || apiResponse;
  if (!Array.isArray(emails)) return [];

  // Build thread connections
  const { emailById, emailThreadMap } = buildThreadConnections(emails);

  // Group messages into threads
  const threadGroups = groupMessagesIntoThreads(emails, emailById, emailThreadMap);

  // Prepare thread info
  const threadInfo = prepareThreadInfo(threadGroups, emailById);

  // Attach metadata to each email
  return emails.map((email) => {
    const messageId = getMessageId(email);
    if (!messageId) return email;

    // Find which thread this email belongs to
    let threadData = null;
    for (const [, info] of threadInfo) {
      if (info.ids.includes(messageId)) {
        threadData = info;
        break;
      }
    }

    if (!threadData) {
      // Single email thread
      return {
        ...email,
        'Thread-View': false,
        'Thread-Reference': [messageId],
        'Thread-Count': 1,
        'Inbox-Visible': true,
        'Thread-Latest': messageId,
        'Thread-Position': '1/1',
      };
    }

    const isThreaded = threadData.count > 1;
    const isLatest = threadData.latestId === messageId;
    const position = threadData.ids.indexOf(messageId) + 1;

    return {
      ...email,
      'Thread-View': isThreaded,
      'Thread-Reference': threadData.ids,
      'Thread-Count': threadData.count,
      'Inbox-Visible': isLatest,
      'Thread-Latest': threadData.latestId,
      'Thread-Position': `${position}/${threadData.count}`,
      'Thread-HasUnread': threadData.ids.some((id) => {
        const e = emailById.get(id);
        return e && e.FLAGS && !e.FLAGS.includes('\\Seen');
      }),
    };
  });
};

// Helper functions for filtering
export const getFilteredThreadedList = (threadedEmails: any[]): any[] => {
  return threadedEmails
    .filter((email) => email['Inbox-Visible'] === true)
    .map((email) => ({
      ...email,
      'Thread-Emails-Count': email['Thread-Reference']?.length || 1,
      'Thread-Unread-Count': email['Thread-HasUnread'] ? 1 : 0,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.Date || 0).getTime();
      const dateB = new Date(b.Date || 0).getTime();
      return dateB - dateA; // Newest first
    });
};

export const getListOfEmail = (threadedEmails: any[]): any[] => {
  return (
    threadedEmails.sort((a, b) => {
      const dateA = new Date(a.Date || 0).getTime();
      const dateB = new Date(b.Date || 0).getTime();
      return dateB - dateA; // Newest first
    }) || []
  );
};
