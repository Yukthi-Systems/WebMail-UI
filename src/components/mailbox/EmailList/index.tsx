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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useDeleteMail,
  useEmails,
  useFlaggedMail,
  useMoveMail,
  useSeenMail,
  useUnFlaggedMail,
  useUnseenMail,
} from '../../../hooks/useEmails';
import { useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import EmailCard from './EmailCard';
import EmailToolbar from './EmailToolbar';
import EmailViewer from './EmailViewer';
import { type Email, emailRaw } from '../../../api/mailbox';
import { useEmailRaw } from '../../../hooks/useEmailRaw';
import EmailComposer from './EmailComposer';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { selectedEmailAtom } from '../../../state/emailAddress';
import { useToast } from '../../../hooks/useToast';
import ResizablePanel from '../../common/ResizeblePanel';
import EmailEmptyState from './EmailEmptyState';
import EmailLoadingSkeleton from './EmailSkeleton';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardShortcuts';
import {
  emailComposerDataAtom,
  emailComposerKeepMountedAtom,
  emailComposerOpenAtom,
  resetEmailComposerDataAtom,
  type EmailAttachment as ComposerAttachment,
} from '../../../state/emailComposer';
import { rawEmailCacheKey } from '../../../hooks/useEmailRaw';
import { userSettingsAtom } from '../../../state/settings';
import { flagAtom } from '../../../state/flags';
import { printEmail, viewEmailInWindow, viewEmailRaw } from '../../../utils/emailPrint';
import { userDetailsAtom } from '../../../state/userDetails';
import { usePanelSizes } from '../../../hooks/usePanelSizes';
import { searchStateAtom } from '../../../state/search';
import SearchResultsBanner from '../../common/header/SearchResultBanner';
import { useSearchEmails } from '../../../hooks/useSearch';
import type { SearchRequest } from '../../../api/search';
import { convertToBytes, mapComparator } from '../../common/header/search/utils';
import { useCreateEmailTemplate, useTemplateActions } from '../../../hooks/useTempelate';
import FolderDialog from './MoveEmail';
import type { CreateContactData } from '../../../utils/contact';
import { useCreateBulkContact } from '../../../hooks/useContacts';
import { scrapeContactsFromEmails } from '../../../utils/contactScrapper';
import { BulkCreateView } from '../../contacts/BulkCreateView';
import { getMessageId } from '../../../utils/emailUtils';
import CustomModal from '../../composer/CustomModal';
import { useIsMobile } from '../../../hooks/use-mobile';
import { folderDetailsAtom } from '../../../state/folders';
import {
  useUpdateFolderUnreadCount,
  useUpdateAnyFolderUnreadCount,
  useFolderUidValidity,
} from '../../../hooks/useFolders';
import { useEmailCacheUpdater } from '../../../hooks/useEmailCacheUpdater';
import type { EmailLike } from '../../../utils/emailThreading';
import type { Attachment } from 'postal-mime';

interface EmailListProps {
  onRegisterClearCallback?: (callback: () => void) => void;
  onRegisterClearSelectionCallback?: (callback: () => void) => void;
  onDragStart?: (emailIds: number[]) => void;
  onDragEnd?: () => void;
  onFocusFolders?: () => void;
}

// ... Keep your applyThreading function exactly as is ...
interface ThreadInfo {
  ids: string[];
  latestId: string;
  latestDate: number;
  count: number;
}

// Deliberately doesn't extend EmailLike: EmailLike's index signature would force
// every concrete caller-side type (e.g. api/mailbox.ts's `Email`) to be cast before
// it could satisfy the generic constraint. All fields are optional so any real
// email shape (Email, EmailLike, etc.) satisfies this structurally with no cast.
interface ThreadableEmail {
  Date?: string;
  FLAGS?: string[];
  References?: string;
  'In-Reply-To'?: string;
}

interface ThreadFields {
  'Thread-View'?: boolean;
  'Thread-Reference'?: string[];
  'Thread-Count'?: number;
  'Inbox-Visible'?: boolean;
  'Thread-Latest'?: string;
  'Thread-Position'?: string;
  'Thread-HasUnread'?: boolean;
  'Thread-Emails-Count'?: number;
  'Thread-Unread-Count'?: number;
}

function applyThreading<T extends ThreadableEmail>(
  apiResponse: T[] | { emails?: T[] }
): (T & ThreadFields)[] {
  const emails = Array.isArray(apiResponse) ? apiResponse : apiResponse?.emails;
  if (!Array.isArray(emails)) return [];

  const normalizeId = (id = '') => id.replace(/[<>]/g, '').trim();
  const extractIds = (value = ''): string[] => {
    if (!value) return [];
    const matches = value.match(/<([^>]+)>/g);
    return matches ? matches.map((v) => normalizeId(v)) : [];
  };
  // const getMessageId = (email: any) => normalizeId(email['Message-Id'] || email['Message-ID']);
  const getEmailDate = (email: T): number => {
    try {
      return new Date(email.Date || 0).getTime();
    } catch {
      return 0;
    }
  };

  const emailByMessageId = new Map<string, T>();
  const emailConnections = new Map<string, Set<string>>();

  emails.forEach((email) => {
    const messageId = getMessageId(email);
    if (messageId) {
      emailByMessageId.set(messageId, email);
    }
  });

  emails.forEach((email) => {
    const messageId = getMessageId(email);
    if (!messageId) return;

    if (!emailConnections.has(messageId)) {
      emailConnections.set(messageId, new Set());
    }

    const references = extractIds(email['References']);
    const inReplyTo = normalizeId(email['In-Reply-To']);
    const allReferences = [...references];
    if (inReplyTo) allReferences.push(inReplyTo);

    allReferences.forEach((refId) => {
      if (!emailConnections.has(refId)) {
        emailConnections.set(refId, new Set());
      }
      emailConnections.get(refId)!.add(messageId);
      emailConnections.get(messageId)!.add(refId);
    });
  });

  const visited = new Set<string>();
  const threads = new Map<string, string[]>();

  const dfs = (node: string, component: string[]) => {
    visited.add(node);
    component.push(node);
    const neighbors = emailConnections.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    }
  };

  for (const [messageId] of emailConnections) {
    if (!visited.has(messageId)) {
      const component: string[] = [];
      dfs(messageId, component);
      component.sort((a, b) => {
        const emailA = emailByMessageId.get(a);
        const emailB = emailByMessageId.get(b);
        // IDs not in this folder (ghost refs from other mailboxes) have no real date.
        // Sort them last so a real folder email is always the thread root.
        const dateA = emailA ? getEmailDate(emailA) : Infinity;
        const dateB = emailB ? getEmailDate(emailB) : Infinity;
        return dateA - dateB;
      });
      const threadId = component[0];
      threads.set(threadId, component);
    }
  }

  const threadInfo = new Map<string, ThreadInfo>();

  threads.forEach((ids, threadId) => {
    if (ids.length === 0) return;
    let latestId = ids[0];
    let latestDate = 0;
    ids.forEach((id) => {
      const email = emailByMessageId.get(id);
      if (email) {
        const emailDate = getEmailDate(email);
        if (emailDate > latestDate) {
          latestDate = emailDate;
          latestId = id;
        }
      }
    });
    threadInfo.set(threadId, { ids, latestId, latestDate, count: ids.length });
  });

  return emails.map((email) => {
    const messageId = getMessageId(email);
    if (!messageId) {
      return {
        ...email,
        'Thread-View': false,
        'Thread-Reference': [],
        'Thread-Count': 1,
        'Inbox-Visible': true,
        'Thread-Latest': '',
        'Thread-Position': '1/1',
        'Thread-HasUnread': email.FLAGS && !email.FLAGS.includes('\\Seen'),
        'Thread-Emails-Count': 1,
        'Thread-Unread-Count': email.FLAGS && !email.FLAGS.includes('\\Seen') ? 1 : 0,
      } as T & ThreadFields;
    }

    let threadData: ThreadInfo | null = null;
    for (const [, info] of threadInfo) {
      if (info.ids.includes(messageId)) {
        threadData = info;
        break;
      }
    }

    if (!threadData || threadData.count === 1) {
      return {
        ...email,
        'Thread-View': false,
        'Thread-Reference': [messageId],
        'Thread-Count': 1,
        'Inbox-Visible': true,
        'Thread-Latest': messageId,
        'Thread-Position': '1/1',
        'Thread-HasUnread': email.FLAGS && !email.FLAGS.includes('\\Seen'),
        'Thread-Emails-Count': 1,
        'Thread-Unread-Count': email.FLAGS && !email.FLAGS.includes('\\Seen') ? 1 : 0,
      } as T & ThreadFields;
    }

    const isThreaded = threadData.count > 1;
    const isLatest = threadData.latestId === messageId;
    const position = threadData.ids.indexOf(messageId) + 1;

    let unreadCount = 0;
    threadData.ids.forEach((id) => {
      const e = emailByMessageId.get(id);
      if (e && e.FLAGS && !e.FLAGS.includes('\\Seen')) {
        unreadCount++;
      }
    });

    return {
      ...email,
      'Thread-View': isThreaded,
      'Thread-Reference': threadData.ids,
      'Thread-Count': threadData.count,
      'Inbox-Visible': isLatest,
      'Thread-Latest': threadData.latestId,
      'Thread-Position': `${position}/${threadData.count}`,
      'Thread-HasUnread': unreadCount > 0,
      'Thread-Emails-Count': threadData.count,
      'Thread-Unread-Count': unreadCount,
    } as T & ThreadFields;
  });
}

const EmailList = ({
  onRegisterClearCallback,
  onRegisterClearSelectionCallback,
  onDragStart,
  onDragEnd,
  onFocusFolders,
}: EmailListProps) => {
  const { folder } = useParams({ strict: false });
  const queryClient = useQueryClient();

  // CHANGE 1: Separate page tracking
  const [regularPage, setRegularPage] = useState(1);
  const [searchPage, setSearchPage] = useState(1);
  const [prevFolder, setPrevFolder] = useState(folder);

  // Reset page numbers when switching folders to prevent requesting old page indices
  if (folder !== prevFolder) {
    setPrevFolder(folder);
    setRegularPage(1);
    setSearchPage(1);
  }

  const userSettings = useAtomValue(userSettingsAtom);
  const PER_PAGE = userSettings?.email.mails_per_page || 50;
  const [searchState, setSearchState] = useAtom(searchStateAtom);
  const toast = useToast();
  const [editAsNewEmail, setEditAsNewEmail] = useState<Email | null>(null);
  // CHANGE 2: Determine current page based on mode
  const currentPage = searchState.isActive ? searchPage : regularPage;
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [emailToMove, setEmailToMove] = useState<number[]>([]);
  const isMobile = useIsMobile();
  const folderDetails = useAtomValue(folderDetailsAtom);
  const setFolderDetails = useSetAtom(folderDetailsAtom);
  const updateFolderUnreadCount = useUpdateFolderUnreadCount(folder || 'INBOX');
  const updateAnyFolderUnreadCount = useUpdateAnyFolderUnreadCount();
  const { patchEmailFlags } = useEmailCacheUpdater(folder || 'INBOX');
  const { refetch: refetchUidValidity, data: liveUidValidity } = useFolderUidValidity(
    folder || 'INBOX'
  );

  const currentFolderDetail = useMemo(() => {
    if (!Array.isArray(folderDetails)) return null;
    return folderDetails.find((f) => f.folder_name === (folder || 'INBOX'));
  }, [folderDetails, folder]);

  // On initial load, if UID validity data arrives and differs from stored status, invalidate email cache
  useEffect(() => {
    if (!liveUidValidity) return;
    const stored = currentFolderDetail?.status;
    const hasChanged =
      !stored ||
      stored.UIDVALIDITY !== liveUidValidity.UIDVALIDITY ||
      stored.MESSAGES !== liveUidValidity.MESSAGES ||
      stored.UIDNEXT !== liveUidValidity.UIDNEXT;

    // Always sync atom so next visit sees the current values and doesn't re-fetch unnecessarily
    if (currentFolderDetail && Array.isArray(folderDetails)) {
      setFolderDetails(
        folderDetails.map((f) =>
          f.folder_name === (folder || 'INBOX') ? { ...f, status: liveUidValidity } : f
        )
      );
    }

    if (hasChanged) {
      queryClient.invalidateQueries({ queryKey: ['folder', folder || 'INBOX'] });
    }
  }, [liveUidValidity]);

  // Regular emails fetch
  const {
    data: regularData,
    isFetching: isRegularFetching,
    error: regularError,
  } = useEmails(folder || 'INBOX', regularPage, PER_PAGE);

  const searchRequest: SearchRequest | null = useMemo(() => {
    if (!searchState.isActive || !searchState.filters) return null;

    const filters = searchState.filters;

    return {
      folder: filters.searchIn || folder || 'INBOX',
      from_: filters.from || undefined,
      to: filters.to || undefined,
      subject: searchState.query || undefined,
      size:
        filters.sizeValue && filters.sizeOperator
          ? {
              comparator: mapComparator(filters.sizeOperator),
              size: convertToBytes(filters.sizeValue, filters.sizeUnit || 'MB'),
            }
          : undefined,
      date_since: filters.dateRangeSince || undefined,
      date_on: filters.dateRangeOn || undefined,
      limit: PER_PAGE,
      page: searchPage,
    };
  }, [searchState.isActive, searchState.filters, searchState.query, folder, searchPage, PER_PAGE]);

  const { mutate: moveMutate } = useMoveMail();
  const { mutate: markUnReadMutate } = useUnseenMail();
  const { mutate: markReadMutate } = useSeenMail();
  const { mutate: markUnFlaggedMutate } = useUnFlaggedMail();
  const { mutate: markFlaggedMutate } = useFlaggedMail();
  const { mutate: deleteMutate } = useDeleteMail();

  const layout = userSettings?.ui?.layout || 'side-by-side';
  const threadedView = userSettings?.email?.mail_thead_view || 'all threads';
  const folderThreadView = userSettings?.folders;
  const [checkedEmails, setCheckedEmails] = useState<number[]>([]);
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [viewingEmailFolder, setViewingEmailFolder] = useState<string | undefined>(undefined);
  const [viewingEmailFlag, setViewingEmailFlag] = useAtom(flagAtom);
  const [, setShowErrorToast] = useState(false);
  const [selectedEmail, setSelectedEmail] = useAtom(selectedEmailAtom);
  const [, setToastMessage] = useState('');
  const [currentEmailContent, setCurrentEmailContent] = useState<string>('');
  const [replyingEmail, setReplyingEmail] = useState<Email | null>(null);
  const [replyingAllEmail, setReplyingAllEmail] = useState<Email | null>(null);
  const [forwardingEmail, setForwardingEmail] = useState<Email | null>(null);
  const [sendDraftEmail, setSendDraftEmail] = useState<Email | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const userDetails = useAtomValue(userDetailsAtom);
  const [isBulkContactOpen, setIsBulkContactOpen] = useState(false);
  const [contactsToCreate, setContactsToCreate] = useState<Partial<CreateContactData>[]>([]);
  const { mutate: createBulkContact, isPending: isSavingContacts } = useCreateBulkContact();
  const [splitView, setSplitView] = useState(() => {
    if (isMobile) return false;
    return layout !== 'compact';
  });

  const {
    data: searchData,
    isFetching: isSearchFetching,
    error: searchError,
  } = useSearchEmails(
    searchRequest!,
    searchState.isActive && searchRequest !== null && !viewingEmail
  );
  const [viewMode, setViewMode] = useState<'left' | 'down'>(() => {
    return layout === 'vertical-split' ? 'down' : 'left';
  });
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
  const [, setShowKeyboardHelp] = useState(false);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [composerOpen, setComposerOpen] = useAtom(emailComposerOpenAtom);
  const composerKeepMounted = useAtomValue(emailComposerKeepMountedAtom);
  const setComposerData = useSetAtom(emailComposerDataAtom);
  const resetComposerData = useSetAtom(resetEmailComposerDataAtom);
  const { refetch: fetchRawEmail } = useEmailRaw(
    viewingEmail?.id.toString() || '',
    folder || 'INBOX',
    getMessageId(viewingEmail) || '',
    false
  );
  const { panelSizes, updatePanelSize } = usePanelSizes();
  const [undoTime, setUndoTime] = useState<number>(5000);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [autoRefreshEnabled] = useState(true);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const emailListScrollRef = useRef<HTMLDivElement | null>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const createTemplateMutation = useCreateEmailTemplate();
  const { prepareTemplateFromCache } = useTemplateActions();

  // CHANGE 5: Get data based on mode
  // Cast preserves an existing quirk: when regularData is undefined this falls
  // back to `{}`, not `[]` — not changing that behavior here, just the type.
  const emails = (
    searchState.isActive && searchData?.data ? searchData.data.data : regularData?.emails || {}
  ) as Email[];

  const total_count =
    searchState.isActive && searchData?.data
      ? searchData.data.total_count
      : regularData?.total_count || 0;

  const total_pages =
    searchState.isActive && searchData?.data
      ? Math.ceil(searchData.data.total_count / PER_PAGE)
      : regularData?.total_pages || 0;

  const isFetching = searchState.isActive ? isSearchFetching : isRegularFetching;
  const error = searchState.isActive ? searchError : regularError;

  // CHANGE 6: Update search results when data changes
  useEffect(() => {
    if (searchState.isActive && searchData?.data && !isSearchFetching) {
      const emailsArray = Array.isArray(searchData.data.data) ? searchData.data.data : [];

      setSearchState((prev) => ({
        ...prev,
        results: {
          emails: emailsArray,
          total_count: searchData.data.total_count,
          total_pages: Math.ceil(searchData.data.total_count / PER_PAGE),
        },
      }));
    }
  }, [searchData, isSearchFetching, searchState.isActive, PER_PAGE, setSearchState]);

  useEffect(() => {
    if (userSettings?.email) {
      const time = Number(userSettings?.email?.undo_send || 5) * 1000;
      setUndoTime(time);
    }
  }, [userSettings]);

  useEffect(() => {
    if (layout === 'modal') {
      setSplitView(false);
    }
    if (layout === 'compact') {
      setSplitView(false);
    } else if (layout === 'vertical-split') {
      setViewMode('down');
      if (!isMobile) setSplitView(true);
    } else {
      setViewMode('left');
      if (!isMobile) setSplitView(true);
    }
  }, [layout]);

  const pendingDeleteActions = useRef<Map<string, { emailIds: number[]; originalFolder: string }>>(
    new Map()
  );

  const simpleEmailArray: Email[] = Array.isArray(emails)
    ? emails
    : (Object.values(emails || {}) as Email[]);

  function getFilteredThreadedList(
    threadedEmails: (Email & ThreadFields)[]
  ): (Email & ThreadFields)[] {
    return threadedEmails
      .filter((email) => email['Inbox-Visible'] === true)
      .map((email) => ({
        ...email,
        'Thread-Emails-Count': (email['Thread-Reference'] as string[] | undefined)?.length || 1,
        'Thread-Unread-Count': email['Thread-Unread-Count'] || 0,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.Date || 0).getTime();
        const dateB = new Date(b.Date || 0).getTime();
        return dateB - dateA;
      });
  }

  function getListOfEmail(threadedEmails: (Email & ThreadFields)[]): (Email & ThreadFields)[] {
    return (
      threadedEmails.sort((a, b) => {
        const dateA = new Date(a.Date || 0).getTime();
        const dateB = new Date(b.Date || 0).getTime();
        return dateB - dateA;
      }) || []
    );
  }

  const isFolderThread = () => {
    const folders = { ...folderThreadView };
    const folderKey = folder?.toLocaleLowerCase() || 'inbox';
    const value = folders?.[folderKey]?.list_thread_view ?? 'threads';
    return value == 'list' ? true : false;
  };

  const handleSaveAsContactAction = () => {
    const emailsToProcess = viewingEmail
      ? [viewingEmail]
      : emailArray.filter((e) => checkedEmails.includes(Number(e.id)));

    if (emailsToProcess.length === 0) {
      toast.error({ description: 'Please select an email first' });
      return;
    }

    const scraped = scrapeContactsFromEmails(emailsToProcess, userDetails?.email || '');
    setContactsToCreate(scraped);
    setIsBulkContactOpen(true);
  };

  const handleBulkContactSave = () => {
    const valid = contactsToCreate.filter((c) => c.name?.trim() && c.email?.trim());

    createBulkContact(valid as CreateContactData[], {
      onSuccess: () => {
        setIsBulkContactOpen(false);
        toast.success({ description: `Successfully added ${valid.length} contacts` });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      },
      onError: (err) => {
        toast.error({ description: err?.message || 'Failed to save contacts' });
      },
    });
  };

  const emailArray = useMemo(() => {
    if (searchState.isActive) {
      return simpleEmailArray.sort((a, b) => {
        const dateA = new Date(a.Date || 0).getTime();
        const dateB = new Date(b.Date || 0).getTime();
        return dateB - dateA;
      });
    }
    const threadedEmails = applyThreading(simpleEmailArray);
    const listOfEmail =
      threadedView === 'never' ||
      (isFolderThread() &&
        (folder?.toLocaleLowerCase() == 'inbox' || folder?.toLocaleLowerCase() == 'sent'))
        ? getListOfEmail(threadedEmails)
        : getFilteredThreadedList(threadedEmails);
    return listOfEmail || simpleEmailArray;
  }, [emails]);

  useEffect(() => {
    if (emailArray) {
      const email_flag = emailArray.find((email) => email?.id === viewingEmail?.id);
      setViewingEmailFlag(email_flag?.FLAGS || []);
    }
  }, [viewingEmail, emails, emailArray, setViewingEmailFlag]);

  const totalSelectedCount = emailArray.length;
  const checkedCount = checkedEmails.length;

  useEffect(() => {
    setCheckedEmails([]);
  }, [folder]);

  const handleQuickMove = (emailId: string) => {
    setEmailToMove([Number(emailId)]);
    setIsMoveDialogOpen(true);
  };

  const handleFolderSelect = (newFol: { name: string; path: string }) => {
    const loadingId = toast.loading({ description: `Moving to ${newFol.name}…` });
    moveMutate(
      {
        path: folder || 'INBOX',
        sourceFolder: folder || 'INBOX',
        destFolder: newFol.path,
        body: emailToMove,
      },
      {
        onSuccess: () => {
          // Count unread emails being moved (emailToMove is still the closure value here)
          const unreadMoved = emailArray.filter(
            (e) => emailToMove.includes(Number(e.id)) && !e.FLAGS?.includes('\\Seen')
          ).length;

          // Clear selection and close dialog before invalidating the query so the
          // re-render from the refetch never sees stale checkedEmails IDs.
          setEmailToMove([]);
          handleDeselectAll();
          setIsMoveDialogOpen(false);

          const isViewingMovedEmail = emailToMove.some((id) => id === Number(viewingEmail?.id));
          if (isViewingMovedEmail) {
            handleBackToList();
          }

          // Update both source and destination folder unread counts locally
          if (unreadMoved > 0) {
            updateAnyFolderUnreadCount(folder || 'INBOX', -unreadMoved);
            updateAnyFolderUnreadCount(newFol.path, unreadMoved);
          }

          toast.dismiss(loadingId);
          toast.success({ description: `Moved to ${newFol.name}` });

          queryClient.invalidateQueries({
            queryKey: ['folder', folder, 'page', currentPage, 'perPage', PER_PAGE],
          });
        },
        onError: (error) => {
          toast.dismiss(loadingId);
          toast.error({ description: error?.message || 'Failed to move email.' });
        },
      }
    );
  };

  useKeyboardNavigation({
    emailCount: emailArray.length,
    currentIndex: currentEmailIndex,
    onNavigate: (index) => {
      setIsKeyboardNavigating(true);
      setCurrentEmailIndex(index);
      const email = emailArray[index];
      if (email) {
        const emailElement = document.getElementById(`email-card-${email.id}`);
        if (emailElement) {
          emailElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    onOpenEmail: (index) => {
      setIsKeyboardNavigating(true);
      const email = emailArray[index];
      if (email) {
        handleEmailClick(email);
      }
    },
    onMarkAsFlag: () => handleMarkAsFlagged(false),
    onMarkAsUnFlag: () => handleMarkAsFlagged(true),
    onSelectEmail: (index) => {
      const email = emailArray[index];
      setIsKeyboardNavigating(true);
      if (email) {
        handleSelectionChange(
          email.id.toString(),
          !checkedEmails.includes(Number(email.id)),
          index,
          false
        );
      }
    },
    onDelete: () => handleDelete(),
    onReply: () => viewingEmail && handleReply(viewingEmail),
    onReplyAll: () => viewingEmail && handleReplyAll(viewingEmail),
    onForward: () => viewingEmail && handleForward(viewingEmail),
    onMarkAsRead: () => {
      if (viewingEmail || checkedEmails.length > 0) {
        handleMarkAsRead(false);
      } else if (emailArray[currentEmailIndex]) {
        const email = emailArray[currentEmailIndex];
        handleSingleEmailMarkAsRead(email.id.toString(), true);
      }
    },
    onMarkAsUnread: () => {
      if (viewingEmail || checkedEmails.length > 0) {
        handleMarkAsRead(true);
      } else if (emailArray[currentEmailIndex]) {
        const email = emailArray[currentEmailIndex];
        handleSingleEmailMarkAsRead(email.id.toString(), false);
      }
    },
    onCompose: () => {},
    onRefresh: () => handleRefresh(),
    onSearch: () => {
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    },
    onSelectAll: () => handleSelectAll(),
    onDeselectAll: () => handleDeselectAll(),
    onFocusFolders: () => {
      setIsKeyboardNavigating(false);
      if (onFocusFolders) {
        onFocusFolders();
      }
    },
    onNextPage: () => {
      if (currentPage < (total_pages || 0)) {
        handlePageChange(currentPage + 1);
      }
    },
    onPrevPage: () => {
      if (currentPage > 1) {
        handlePageChange(currentPage - 1);
      }
    },
    isComposerOpen: composerOpen,
    isEmailViewerOpen: !!viewingEmail,
    onCloseViewer: () => handleBackToList(),
  });

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !composerOpen) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [composerOpen]);

  useEffect(() => {
    if (error) {
      toast.error({
        description: error.message || 'An error occurred while fetching emails. Please try again.',
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (searchState.isActive) {
      handleBackToList();
    }
  }, [searchState.isActive, searchState.query, JSON.stringify(searchState.filters)]);

  useEffect(() => {
    const checkMobile = () => {
      if (isMobile) {
        setSplitView(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const getEmailsToActOn = () => {
    if (viewingEmail) {
      return [Number(viewingEmail.id)];
    }
    if (isKeyboardNavigating && emailArray[currentEmailIndex]) {
      return [Number(emailArray[currentEmailIndex].id)];
    }
    return checkedEmails;
  };

  useEffect(() => {
    if (selectedEmail) {
      setViewingEmail(selectedEmail);
      setViewingEmailFolder(folder);
      if (!isMobile && layout !== 'compact') {
        setSplitView(true);
      }
    }
  }, [selectedEmail]);

  const handleSelectAll = () => {
    setCheckedEmails(emailArray.map((email) => Number(email.id)));
  };

  const handleDeselectAll = () => {
    setCheckedEmails([]);
  };

  const handleEditAsNew = (email: Email) => {
    setEditAsNewEmail(email);
    setComposerOpen(true);
  };

  const handleDelete = () => {
    const emailsToActOn = getEmailsToActOn();
    const actionId = `delete-${Date.now()}-${Math.random()}`;
    const isViewingEmailAffected = viewingEmail && emailsToActOn.includes(Number(viewingEmail.id));

    pendingDeleteActions.current.set(actionId, {
      emailIds: emailsToActOn,
      originalFolder: folder || 'INBOX',
    });

    if (folder === 'Trash') {
      const loadingId = toast.loading({ description: 'Deleting email(s)…' });
      deleteMutate(
        {
          path: folder || 'INBOX',
          body: emailsToActOn,
        },
        {
          onSuccess: (res) => {
            handleDeselectAll();
            if (isViewingEmailAffected) {
              handleBackToList();
            }
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email permanently deleted.',
            });
            queryClient.invalidateQueries({
              queryKey: ['folder', folder, 'page', currentPage, 'perPage', PER_PAGE],
            });
            if (searchState.isActive) {
              queryClient.invalidateQueries({ queryKey: ['search-emails'] });
            }
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to delete email.',
            });
          },
        }
      );
    } else {
      if (isViewingEmailAffected) {
        handleBackToList();
      }
      toast.success({
        description: 'Email is moving to trash',
        undo: {
          label: 'Undo',
          onClick: () => {
            // Cancel the pending action — emails haven't moved yet, nothing to reverse
            pendingDeleteActions.current.delete(actionId);
            toast.success({ description: 'Delete cancelled' });
          },
          duration: undoTime,
        },
      });

      setTimeout(() => {
        if (!pendingDeleteActions.current.has(actionId)) return;

        const loadingId = toast.loading({ description: 'Moving to trash…' });
        moveMutate(
          {
            path: folder || 'INBOX',
            sourceFolder: folder || 'INBOX',
            destFolder: 'Trash',
            body: emailsToActOn,
          },
          {
            onSuccess: () => {
              toast.dismiss(loadingId);
              handleDeselectAll();
              queryClient.invalidateQueries({
                queryKey: ['folder', folder, 'page', currentPage, 'perPage', PER_PAGE],
              });
              if (searchState.isActive) {
                queryClient.invalidateQueries({ queryKey: ['search-emails'] });
              }
              pendingDeleteActions.current.delete(actionId);
            },
            onError: (error) => {
              toast.dismiss(loadingId);
              toast.error({
                description: error?.message || 'Failed to move email to trash.',
              });
              pendingDeleteActions.current.delete(actionId);
            },
          }
        );
      }, undoTime);
    }
  };

  const handleSingleEmailDelete = (emailId: string) => {
    const emailIdNum = Number(emailId);
    const actionId = `delete-${Date.now()}-${Math.random()}`;

    pendingDeleteActions.current.set(actionId, {
      emailIds: [emailIdNum],
      originalFolder: folder || 'INBOX',
    });

    const isViewingDeletedEmail = viewingEmail && Number(viewingEmail.id) === emailIdNum;

    if (folder === 'Trash') {
      const loadingId = toast.loading({ description: 'Deleting email…' });
      deleteMutate(
        {
          path: folder || 'INBOX',
          body: [emailIdNum],
        },
        {
          onSuccess: (res) => {
            if (isViewingDeletedEmail) handleBackToList();
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email permanently deleted.',
            });

            queryClient.invalidateQueries({
              queryKey: ['folder', folder, 'page', currentPage, 'perPage', PER_PAGE],
            });
            if (searchState.isActive) {
              queryClient.invalidateQueries({ queryKey: ['search-emails'] });
            }
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to delete email.',
            });
          },
        }
      );
    } else {
      toast.success({
        description: 'Email is moving to trash',
        undo: {
          label: 'Undo',
          onClick: () => {
            // Cancel the pending action — email hasn't moved yet, nothing to reverse
            pendingDeleteActions.current.delete(actionId);
            toast.success({ description: 'Delete cancelled' });
          },
          duration: undoTime,
        },
      });

      setTimeout(() => {
        if (!pendingDeleteActions.current.has(actionId)) return;

        const loadingId = toast.loading({ description: 'Moving to trash…' });
        moveMutate(
          {
            path: folder || 'INBOX',
            sourceFolder: folder || 'INBOX',
            destFolder: 'Trash',
            body: [emailIdNum],
          },
          {
            onSuccess: () => {
              toast.dismiss(loadingId);
              if (isViewingDeletedEmail) handleBackToList();
              queryClient.invalidateQueries({
                queryKey: ['folder', folder, 'page', currentPage, 'perPage', PER_PAGE],
              });
              if (searchState.isActive) {
                queryClient.invalidateQueries({ queryKey: ['search-emails'] });
              }
              pendingDeleteActions.current.delete(actionId);
            },
            onError: (error) => {
              toast.dismiss(loadingId);
              toast.error({
                description: error?.message || 'Failed to move email to trash.',
              });
              pendingDeleteActions.current.delete(actionId);
            },
          }
        );
      }, undoTime);
    }
  };

  const handleMarkAsRead = (isSeen: boolean) => {
    const selectedIds = getEmailsToActOn();

    const targetIds = emailArray
      .filter(
        (email) =>
          selectedIds.includes(Number(email.id)) &&
          (isSeen ? email.FLAGS?.includes('\\Seen') : !email.FLAGS?.includes('\\Seen'))
      )
      .map((email) => Number(email.id));

    if (targetIds.length === 0) return;

    const mutation = isSeen ? markUnReadMutate : markReadMutate;
    const loadingId = toast.loading({
      description: isSeen ? 'Marking as unread...' : 'Marking as read...',
    });
    mutation(
      {
        path: folder || 'INBOX',
        body: targetIds,
      },
      {
        onSuccess: (res) => {
          handleDeselectAll();
          toast.dismiss(loadingId);
          toast.success({
            description:
              (res as unknown as { message?: string })?.message ||
              `Marked as ${isSeen ? 'unread' : 'read'}.`,
          });

          patchEmailFlags(targetIds, isSeen ? undefined : '\\Seen', isSeen ? '\\Seen' : undefined);
          updateFolderUnreadCount(isSeen ? targetIds.length : -targetIds.length);
        },
      }
    );
  };

  const handleSingleEmailMarkAsRead = (emailId: string, isRead: boolean) => {
    const emailIdNum = Number(emailId);
    const loadingId = toast.loading({
      description: isRead ? 'Marking as read...' : 'Marking as unread...',
    });
    if (isRead) {
      markReadMutate(
        {
          path: folder || 'INBOX',
          body: [emailIdNum],
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email marked as unread.',
            });

            patchEmailFlags([emailIdNum], '\\Seen');
            updateFolderUnreadCount(-1);
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to mark email as unread.',
            });
          },
        }
      );
    } else {
      markUnReadMutate(
        {
          path: folder || 'INBOX',
          body: [emailIdNum],
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email marked as unread.',
            });

            patchEmailFlags([emailIdNum], undefined, '\\Seen');
            updateFolderUnreadCount(1);
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to mark email as unread.',
            });
          },
        }
      );
    }
  };

  const handleMarkAsFlagged = (action = false) => {
    const emailsToActOn = getEmailsToActOn();
    const loadingId = toast.loading({
      description: action ? 'Unflagging email(s)...' : 'Flagging email(s)...',
    });
    if (action) {
      markUnFlaggedMutate(
        {
          path: folder || 'Junk',
          body: emailsToActOn,
        },
        {
          onSuccess: (res) => {
            handleDeselectAll();
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email unmarked as flagged.',
            });
            patchEmailFlags(emailsToActOn, undefined, '\\Flagged');
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to unmark email as flagged.',
            });
          },
        }
      );
    } else {
      markFlaggedMutate(
        {
          path: folder || '',
          body: emailsToActOn,
        },
        {
          onSuccess: (res) => {
            handleDeselectAll();
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email flagged as flagged.',
            });
            patchEmailFlags(emailsToActOn, '\\Flagged');
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to flag email as flagged.',
            });
          },
        }
      );
    }
  };

  const handleSingleEmailMarkAsFlagged = (emailId: string, action: boolean) => {
    const emailIdNum = Number(emailId);
    const loadingId = toast.loading({
      description: action ? 'Unflagging email...' : 'Flagging email...',
    });
    if (action) {
      markUnFlaggedMutate(
        {
          path: folder || 'Junk',
          body: [emailIdNum],
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            handleDeselectAll();
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email unmarked as flagged.',
            });
            patchEmailFlags([emailIdNum], undefined, '\\Flagged');
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to unmark email as flagged.',
            });
          },
        }
      );
    } else {
      markFlaggedMutate(
        {
          path: folder || '',
          body: [emailIdNum],
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            handleDeselectAll();
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email flagged as flagged.',
            });
            patchEmailFlags([emailIdNum], '\\Flagged');
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error?.message || 'Failed to flag email as flagged.',
            });
          },
        }
      );
    }
  };

  const handleRefresh = async () => {
    const loadingId = toast.loading({ description: 'Checking for new mail…' });
    try {
      const { data: response } = await refetchUidValidity();

      // Update the atom with the new status
      if (currentFolderDetail) {
        const newDetails = folderDetails.map((f) =>
          f.folder_name === (folder || 'INBOX') ? { ...f, status: response } : f
        );
        setFolderDetails(newDetails);
      }

      // If we have current values and they all match, skip the heavy refresh
      const currentValues = currentFolderDetail?.status;

      if (
        currentValues &&
        response?.UIDVALIDITY === currentValues.UIDVALIDITY &&
        response?.MESSAGES === currentValues.MESSAGES &&
        response?.UIDNEXT === currentValues.UIDNEXT
      ) {
        toast.dismiss(loadingId);

        return;
      }
    } catch (err) {
      console.warn('Status check failed, falling back to full refresh', err);
    }

    await queryClient.invalidateQueries({
      queryKey: ['folder', folder || 'INBOX'],
    });

    if (searchState.isActive) {
      await queryClient.invalidateQueries({ queryKey: ['search-emails'] });
    }

    toast.dismiss(loadingId);
  };

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (viewingEmail && emailArray.length > 0) {
  //       const currentIndex = emailArray.findIndex((e) => e.id === viewingEmail.id);

  //       if (currentIndex !== -1 && currentIndex < emailArray.length - 1) {
  //         const nextEmail = emailArray[currentIndex + 1];
  //         if (nextEmail?.id) {
  //           prefetchEmailContent(
  //             nextEmail.id.toString(),
  //             folder || 'INBOX',
  //             getMessageId(nextEmail) || ''
  //           );
  //         }
  //       }
  //     }
  //   }, 600);

  //   return () => clearTimeout(timer);
  // }, [viewingEmail?.id, emailArray, folder, prefetchEmailContent]);

  const handleBackToList = () => {
    setViewingEmail(null);
    setSelectedEmail(null);
    setSplitView(false);
    // ─── NOTE: We intentionally do NOT call handleCloseComposer() here ───
    // The composer is now rendered at the top level and survives independently
    // of viewingEmail. Only close the composer explicitly when the user cancels.
  };

  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const hasActiveSearch = () => {
    if (!searchState.isActive) return false;

    return !!(
      searchState.query ||
      searchState.filters.from ||
      searchState.filters.to ||
      searchState.filters.sizeValue ||
      searchState.filters.dateRangeSince ||
      searchState.filters.dateRangeOn ||
      (searchState.filters.searchIn &&
        searchState.filters.searchIn !== folder &&
        searchState.filters.searchIn !== 'INBOX')
    );
  };

  const handleSelectionChange = (
    emailId: string,
    isSelected: boolean,
    index?: number,
    shiftKey?: boolean
  ) => {
    const idNum = Number(emailId);

    setCheckedEmails((prev) => {
      let newSelection;

      if (shiftKey && lastSelectedIndex !== null && index !== undefined) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        const rangeIds = emailArray.slice(start, end + 1).map((email) => Number(email.id));

        newSelection = [...new Set([...prev, ...rangeIds])];
      } else {
        if (isSelected) {
          newSelection = prev.includes(idNum) ? prev : [...prev, idNum];
        } else {
          newSelection = prev.filter((id) => id !== idNum);
        }
      }

      if (newSelection.length === 0) {
        setIsSelectionMode(false);
        setLastSelectedIndex(null);
      } else if (index !== undefined) {
        setLastSelectedIndex(index);
      }

      return newSelection;
    });
  };

  const handleSendDraft = (email: Email) => {
    setSendDraftEmail(email);
    setReplyingEmail(null);
    setReplyingAllEmail(null);
    setForwardingEmail(null);
    setComposerOpen(true);
  };

  const handleReply = (email: Email) => {
    setReplyingEmail(email);
    setSendDraftEmail(null);
    setReplyingAllEmail(null);
    setForwardingEmail(null);
    setComposerOpen(true);
  };

  const handleReplyAll = (email: Email) => {
    setReplyingAllEmail(email);
    setSendDraftEmail(null);
    setReplyingEmail(null);
    setForwardingEmail(null);
    setComposerOpen(true);
  };

  const handleForward = (email: Email) => {
    setForwardingEmail(email);
    setSendDraftEmail(null);
    setReplyingEmail(null);
    setReplyingAllEmail(null);
    setComposerOpen(true);
  };

  const handleForwardAsAttachment = async (targetEmail?: EmailLike, rawContent?: string) => {
    const emailToForward = targetEmail || (viewingEmail as unknown as EmailLike | null);
    if (!emailToForward) return;
    try {
      // Thread card already provides rawContent — skip network entirely.
      // For single-email view: use the exact same cache key EmailViewer uses,
      // so queryClient.fetchQuery returns the cached string without a network call.
      let raw = rawContent;
      if (!raw) {
        const id = String(emailToForward.id);
        const folderPath = viewingEmailFolder || folder || 'INBOX';
        // Mirror the stableEmailKey logic in EmailViewer.tsx
        const stableKey =
          getMessageId(emailToForward) ||
          `${id}-${emailToForward.Subject || ''}-${emailToForward.Date || ''}`;
        raw = await queryClient.fetchQuery({
          queryKey: rawEmailCacheKey(id, folderPath, stableKey),
          queryFn: () => emailRaw(id, folderPath, false),
          staleTime: 10 * 60 * 1000,
        });
      }
      if (!raw) throw new Error('Failed to load raw email');

      // Encode to base64 safely (chunked to avoid stack overflow on large emails)
      const uint8 = new TextEncoder().encode(raw);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.slice(i, i + chunkSize));
      }
      const base64 = btoa(binary);

      const subject = emailToForward.Subject || 'email';
      const filename = `${subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.eml`;

      resetComposerData();
      setComposerData((prev) => ({
        ...prev,
        subject: `Fwd: ${subject}`,
        html: '<p><br></p>',
        // Backend/snake_case-shaped attachment (mime_type, data), not ComposerEmail's
        // declared camelCase EmailAttachment (mimeType, content) — same pre-existing
        // mismatch already flagged for this composer atom (see CLAUDE.md).
        attachments: [
          {
            filename,
            mime_type: 'message/rfc822',
            data: base64,
            size: uint8.length,
          } as unknown as ComposerAttachment,
        ],
      }));

      setReplyingEmail(null);
      setReplyingAllEmail(null);
      setForwardingEmail(null);
      setSendDraftEmail(null);
      setEditAsNewEmail(null);
      setComposerOpen(true);
    } catch (err) {
      console.error('[ForwardAsAttachment]', err);
      toast.error({ description: 'Failed to prepare email for forwarding as attachment' });
    }
  };

  const handleCloseComposer = () => {
    setComposerOpen(false);
    setReplyingEmail(null);
    setSendDraftEmail(null);
    setReplyingAllEmail(null);
    setForwardingEmail(null);
    setEditAsNewEmail(null);
  };

  const handleNextEmail = () => {
    const currentIndex = emailArray.findIndex((e) => e.id === viewingEmail?.id);
    if (currentIndex < emailArray.length - 1) {
      const nextEmail = emailArray[currentIndex + 1];
      handleEmailClick(nextEmail);
    }
  };

  const handlePrevEmail = () => {
    const currentIndex = emailArray.findIndex((e) => e.id === viewingEmail?.id);
    if (currentIndex > 0) {
      const prevEmail = emailArray[currentIndex - 1];
      handleEmailClick(prevEmail);
    }
  };

  const hasNextEmail = () => {
    const currentIndex = emailArray.findIndex((e) => e.id === viewingEmail?.id);
    return currentIndex < emailArray.length - 1;
  };

  const hasPrevEmail = () => {
    const currentIndex = emailArray.findIndex((e) => e.id === viewingEmail?.id);
    return currentIndex > 0;
  };

  const handleEmailClick = (email: Email) => {
    savedScrollPositionRef.current = emailListScrollRef.current?.scrollTop ?? 0;
    setIsSelectionMode(false);
    setIsKeyboardNavigating(false);
    setViewingEmail(email);
    setViewingEmailFolder(folder);

    const isAlreadySeen = email.FLAGS?.includes('\\Seen');

    if (!isAlreadySeen) {
      const emailIdNum = Number(email.id);
      const msgId = getMessageId(email);
      const rawQueryKey = ['email', 'raw', msgId || email.id.toString(), folder || 'INBOX'];
      const isCached = !!queryClient.getQueryData(rawQueryKey);

      if (isCached) {
        // Email was prefetched with mark_as_read=false — explicitly mark as read now
        markReadMutate(
          { path: folder || 'INBOX', body: [emailIdNum] },
          {
            onSuccess: () => {
              patchEmailFlags([emailIdNum], '\\Seen');
              updateFolderUnreadCount(-1);
            },
          }
        );
      }
      // If not cached, EmailViewer's useEmailRaw will fetch with mark_as_read=true
      // and handle the folder cache invalidation after the fetch completes
    }

    const index = emailArray.findIndex((e) => e.id === email.id);
    if (index !== -1) {
      setCurrentEmailIndex(index);
    }

    if (!isMobile && layout !== 'compact' && layout !== 'modal') {
      setSplitView(true);
    }
  };

  useEffect(() => {
    if (onRegisterClearCallback) {
      onRegisterClearCallback(handleBackToList);
    }
  }, [onRegisterClearCallback]);

  useEffect(() => {
    if (onRegisterClearSelectionCallback) {
      onRegisterClearSelectionCallback(handleDeselectAll);
    }
  }, [onRegisterClearSelectionCallback]);

  const handlePrint = () => {
    if (!viewingEmail) return;
    printEmail(viewingEmail, currentEmailContent, currentAttachments);
  };

  const handleDownload = async () => {
    if (!viewingEmail) return;

    try {
      const { data: rawEmail } = await fetchRawEmail();

      if (!rawEmail) {
        throw new Error('Failed to fetch raw email content');
      }

      const blob = new Blob([rawEmail], { type: 'message/rfc822' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${viewingEmail.Subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.eml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download email:', error);
      setToastMessage('Failed to download email');
      setShowErrorToast(true);
    }
  };

  const handleSaveAsTemplate = async (email: Email) => {
    try {
      const { subject, body } = await prepareTemplateFromCache(
        email.id.toString(),
        folder || 'INBOX'
      );

      await createTemplateMutation.mutateAsync({
        name: `Template: ${subject.slice(0, 30)}`,
        subject: subject,
        body: body,
        is_public: false,
        meta_data: {
          created_by: userDetails?.email || 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      toast.success({
        description: 'Saved! View it in Settings > Templates',
      });
    } catch {
      toast.error({
        description: 'Failed to process email for template',
      });
    }
  };

  const handleViewInWindow = () => {
    if (!viewingEmail) return;
    viewEmailInWindow(viewingEmail, currentEmailContent, currentAttachments);
  };

  const handleViewInRaw = async () => {
    if (!viewingEmail) return;
    const { data: rawEmail } = await fetchRawEmail();
    if (rawEmail) {
      viewEmailRaw(rawEmail);
    }
  };

  const handlePageChange = (page: number) => {
    if (searchState.isActive) {
      setSearchPage(page);
    } else {
      setRegularPage(page);
    }
    setCurrentEmailIndex(0);
    handleDeselectAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEmailContentLoaded = useCallback((content: string) => {
    setCurrentEmailContent(content);
  }, []);

  useEffect(() => {
    setRegularPage(1);
    setSearchPage(1);
    setSearchState({
      isActive: false,
      query: '',
      filters: {},
      results: null,
    });
    setViewingEmail(null);
    setIsKeyboardNavigating(false);
    setSplitView(false);
    // ─── NOTE: We do NOT close the composer on folder change ───
    // handleCloseComposer() is intentionally omitted here so that
    // an open reply/forward/draft composer survives folder navigation.
  }, [folder, setSearchState]);

  useEffect(() => {
    if (!searchState.isActive) {
      setSearchPage(1);
    }
  }, [searchState.isActive]);

  // useEffect(() => {
  //   if (emailArray && emailArray.length > 0) {
  //     const topEmails = emailArray.slice(0, 2);

  //     topEmails.forEach((email) => {
  //       if (email?.id && folder) {
  //         prefetchEmailContent(
  //           email.id.toString(),
  //           folder,
  //           getMessageId(email) || ''
  //         );
  //       }
  //     });
  //   }
  // }, [emailArray, folder, prefetchEmailContent]);

  const renderEmailList = () => (
    <div
      ref={(node) => {
        emailListScrollRef.current = node;
        if (node) node.scrollTop = savedScrollPositionRef.current;
      }}
      className={`h-full overflow-x-hidden bg-[var(--gray-1)] transition-opacity duration-200 ${isFetching ? 'opacity-80' : 'opacity-100'}`}
    >
      <div className="flex flex-col gap-0">
        {emailArray.map((email, index) => (
          <EmailCard
            index={index}
            key={email.id}
            id={`email-card-${email.id}`}
            email={email}
            isSelected={!viewingEmail && checkedEmails.includes(Number(email.id))}
            isSelectionMode={!viewingEmail && isSelectionMode}
            onEnterSelectionMode={viewingEmail ? undefined : handleEnterSelectionMode}
            onSelectionChange={viewingEmail ? () => {} : handleSelectionChange}
            checkedEmails={viewingEmail ? [] : checkedEmails}
            onEmailClick={handleEmailClick}
            total={emailArray.length}
            onMarkAsRead={handleSingleEmailMarkAsRead}
            onDelete={handleSingleEmailDelete}
            folder={folder}
            isActive={viewingEmail?.id === email.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            showSelection={!viewingEmail}
            isKeyboardFocused={
              currentEmailIndex === index && isKeyboardNavigating && viewingEmail?.id !== email.id
            }
            myEmail={userDetails?.email}
            onMoveToFolder={handleQuickMove}
            onToggleFlag={(id, isFlagged) => handleSingleEmailMarkAsFlagged(id, isFlagged)}
            viewingEmail={viewingEmail?.id}
          />
        ))}
      </div>
    </div>
  );

  // ─── renderEmailViewer no longer contains EmailComposer ────────────────────
  // EmailComposer is rendered at the top level of the return so it is NOT
  // unmounted when viewingEmail becomes null (e.g. on folder change).
  const renderEmailViewer = useCallback(
    () => (
      <div className="h-full overflow-y-auto bg-[var(--gray-1)]">
        <EmailViewer
          key={
            getMessageId(viewingEmail) ||
            `${viewingEmail!.id}-${viewingEmail!.Subject || ''}-${viewingEmail!.Date || ''}`
          }
          messageId={viewingEmail!.id.toString()}
          folderPath={viewingEmailFolder}
          subject={viewingEmail!.Subject}
          senderEmail={viewingEmail!.From}
          onBack={layout === 'modal' ? handleBackToList : handleBackToList}
          splitView={layout === 'modal' ? false : splitView}
          date={viewingEmail!.Date}
          onContentLoaded={handleEmailContentLoaded}
          onDraftSend={() => viewingEmail && handleSendDraft(viewingEmail)}
          email={viewingEmail as unknown as EmailLike}
          flagged={viewingEmailFlag}
          onAttachmentsLoaded={setCurrentAttachments}
          onReply={handleReply as unknown as (email: EmailLike) => void}
          onReplyAll={handleReplyAll as unknown as (email: EmailLike) => void}
          onForward={handleForward as unknown as (email: EmailLike) => void}
          onForwardAsAttachment={handleForwardAsAttachment}
          handleSingleEmailDelete={handleSingleEmailDelete}
          handleSingleEmailMarkAsFlagged={handleSingleEmailMarkAsFlagged}
          handleSingleEmailMarkAsRead={handleSingleEmailMarkAsRead}
          onEditAsNew={handleEditAsNew as unknown as (email: EmailLike) => void}
          onSaveAsContact={handleSaveAsContactAction}
        />
      </div>
    ),
    [
      viewingEmail,
      viewingEmailFolder,
      splitView,
      composerOpen,
      replyingEmail,
      replyingAllEmail,
      forwardingEmail,
      handleEmailContentLoaded,
      viewingEmailFlag,
    ]
  );

  useEffect(() => {
    if (!autoRefreshEnabled || composerOpen || isFetching) {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      return;
    }

    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }

    autoRefreshIntervalRef.current = setInterval(() => {
      if (!composerOpen) {
        handleRefresh();
      }
    }, 60000);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, composerOpen, folder, isFetching]);

  if (!emails || !folder || error) {
    return <EmailEmptyState folder={folder} error={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="p-0 w-full mb-4 bg-[var(--gray-1)] overflow-x-hidden">
      {hasActiveSearch() && <SearchResultsBanner resultCount={total_count} />}
      <EmailToolbar
        checkedEmails={viewingEmail ? [Number(viewingEmail.id)] : checkedEmails}
        selectedCount={checkedCount}
        totalSelectedCount={totalSelectedCount}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDelete={handleDelete}
        onMarkAsRead={handleMarkAsRead}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
        showBackButton={!!viewingEmail}
        onBack={handleBackToList}
        total_pages={total_pages || 0}
        total_count={total_count || 0}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        emailList={emails || []}
        onFlagged={handleMarkAsFlagged}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onViewInWindow={handleViewInWindow}
        onViewInRaw={handleViewInRaw}
        onReply={() => viewingEmail && handleReply(viewingEmail)}
        onReplyAll={() => viewingEmail && handleReplyAll(viewingEmail)}
        onForward={() => viewingEmail && handleForward(viewingEmail)}
        onForwardAsAttachment={handleForwardAsAttachment}
        splitView={splitView}
        onToggleSplitView={() => setSplitView(!splitView)}
        onToggleView={() => setViewMode(viewMode === 'left' ? 'down' : 'left')}
        viewMode={viewMode}
        layout={layout}
        onNextEmail={handleNextEmail}
        onPrevEmail={handlePrevEmail}
        hasNextEmail={hasNextEmail()}
        hasPrevEmail={hasPrevEmail()}
        onEditAsNew={() => viewingEmail && handleEditAsNew(viewingEmail)}
        onSaveAsTemplate={() => viewingEmail && handleSaveAsTemplate(viewingEmail)}
        onSaveAsContact={handleSaveAsContactAction}
      />

      <div
        className={`relative w-full bg-[var(--gray-1)] overflow-x-hidden ${viewingEmail ? 'pb-20' : 'pb-32'} md:pb-0 transition-all duration-200 ${
          hasActiveSearch() ? 'h-[calc(100vh-175px)]' : 'h-[calc(100vh-120px)]'
        }`}
      >
        {isFetching && emailArray.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden bg-[var(--gray-4)]">
            <div
              className="h-full bg-[var(--accent-9)]"
              style={{ animation: 'pageLoadProgress 1.4s ease-in-out infinite' }}
            />
          </div>
        )}
        {isFetching && emailArray.length === 0 ? (
          <div className="h-full overflow-y-auto">
            <EmailLoadingSkeleton />
          </div>
        ) : emailArray.length === 0 || error ? (
          <EmailEmptyState folder={folder} error={error} onRetry={handleRefresh} />
        ) : viewingEmail && isMobile ? (
          renderEmailViewer()
        ) : layout === 'modal' ? (
          <>
            {renderEmailList()}
            {viewingEmail && (
              <CustomModal
                isOpen={!!viewingEmail}
                onClose={handleBackToList}
                title={viewingEmail.Subject}
                isFullView={false}
                blocking={false}
                draggable={true}
              >
                {renderEmailViewer()}
              </CustomModal>
            )}
          </>
        ) : viewingEmail ? (
          layout === 'compact' ? (
            renderEmailViewer()
          ) : splitView ? (
            <ResizablePanel
              direction={
                layout === 'vertical-split'
                  ? 'vertical'
                  : viewMode === 'left'
                    ? 'horizontal'
                    : 'vertical'
              }
              defaultSize={
                layout === 'vertical-split'
                  ? panelSizes.verticalEmailViewerSplit
                  : viewMode === 'left'
                    ? panelSizes.emailViewerSplit
                    : panelSizes.verticalEmailViewerSplit
              }
              minSize={35}
              maxSize={75}
              minPixelSizeRight={500}
              onSizeChange={(size) => {
                if (layout === 'vertical-split' || viewMode !== 'left') {
                  updatePanelSize('verticalEmailViewerSplit', size);
                } else {
                  updatePanelSize('emailViewerSplit', size);
                }
              }}
            >
              {renderEmailList()}
              {renderEmailViewer()}
            </ResizablePanel>
          ) : (
            renderEmailViewer()
          )
        ) : (
          <div
            ref={(node) => {
              emailListScrollRef.current = node;
            }}
            className="overflow-x-hidden w-full h-full"
          >
            {emailArray.map((email, index) => (
              <EmailCard
                index={index}
                key={email.id}
                id={`email-card-${email.id}`}
                email={email}
                isSelected={checkedEmails.includes(Number(email.id))}
                onSelectionChange={handleSelectionChange}
                onEmailClick={handleEmailClick}
                total={emailArray.length}
                isSelectionMode={isSelectionMode}
                onEnterSelectionMode={handleEnterSelectionMode}
                onMarkAsRead={handleSingleEmailMarkAsRead}
                onDelete={handleSingleEmailDelete}
                folder={folder}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                checkedEmails={checkedEmails}
                isKeyboardFocused={currentEmailIndex === index && isKeyboardNavigating}
                myEmail={userDetails?.email}
                onMoveToFolder={handleQuickMove}
                onToggleFlag={(id, isFlagged) => handleSingleEmailMarkAsFlagged(id, isFlagged)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── EmailComposer lives here at the top level ──────────────────────────
          Rendering it outside the viewer means it stays mounted across folder
          changes and regardless of whether an email is being viewed.           */}
      {(composerOpen || composerKeepMounted) && (
        <EmailComposer
          email={
            replyingEmail || replyingAllEmail || forwardingEmail || sendDraftEmail || editAsNewEmail
          }
          mode={
            replyingEmail
              ? 'reply'
              : replyingAllEmail
                ? 'replyAll'
                : forwardingEmail
                  ? 'forward'
                  : sendDraftEmail
                    ? 'draft'
                    : editAsNewEmail
                      ? 'editAsNew'
                      : 'new'
          }
          onClose={() => {
            handleRefresh();
            handleCloseComposer();
          }}
          onSend={() => {
            handleCloseComposer();
            handleRefresh();
          }}
          onSendDraft={handleSendDraft}
        />
      )}
      {/* ──────────────────────────────────────────────────────────────────────── */}

      {isMoveDialogOpen && (
        <FolderDialog
          open={isMoveDialogOpen}
          onOpenChange={setIsMoveDialogOpen}
          onFolderSelect={handleFolderSelect}
          currentFolder={folder}
          title="Move to folder"
        />
      )}

      <BulkCreateView
        open={isBulkContactOpen}
        onOpenChange={setIsBulkContactOpen}
        contacts={contactsToCreate}
        onUpdate={(index, field, value) => {
          const updated = [...contactsToCreate];
          updated[index] = { ...updated[index], [field]: value };
          setContactsToCreate(updated);
        }}
        onAdd={() => setContactsToCreate([...contactsToCreate, { name: '', email: '' }])}
        onRemove={(index) => setContactsToCreate(contactsToCreate.filter((_, i) => i !== index))}
        onDuplicate={(index) => {
          const updated = [...contactsToCreate];
          updated.splice(index + 1, 0, { ...contactsToCreate[index] });
          setContactsToCreate(updated);
        }}
        onSave={handleBulkContactSave}
        isLoading={isSavingContacts}
      />
    </div>
  );
};

export default EmailList;
