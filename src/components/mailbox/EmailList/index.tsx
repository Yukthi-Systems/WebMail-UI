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

import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useDeleteMail,
  useEmails,
  useEmailThreads,
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
import { rawEmailCacheKey } from '../../../utils/emailCache';
import { userSettingsAtom } from '../../../state/settings';
import { flagAtom } from '../../../state/flags';
import { printEmail, viewEmailInWindow, viewEmailRaw } from '../../../utils/emailPrint';
import { formatForwardSubject } from '../../../utils/replyForwardHelper';
import { userDetailsAtom } from '../../../state/userDetails';
import { usePanelSizes } from '../../../hooks/usePanelSizes';
import { searchStateAtom } from '../../../state/search';
import SearchResultsBanner from '../../common/header/SearchResultBanner';
import { useSearchEmails } from '../../../hooks/useSearch';
import type { SearchRequest } from '../../../api/search';
import { convertToBytes, mapComparator } from '../../common/header/search/utils';
import { useCreateEmailTemplate, useTemplateActions } from '../../../hooks/useTempelate';
import FolderDialog from './MoveEmail';
import BulkActionDialog from './BulkActionDialog';
import BulkSelectBanner from './BulkSelectBanner';
import { useBulkSelection } from '../../../hooks/useBulkSelection';
import { useStableCallback } from '../../../hooks/useStableCallback';
import {
  bulkConfirmText,
  bulkCounts,
  bulkOfferText,
  bulkProgressTitle,
  bulkSelectedText,
  isRowBulkSelected,
  isRowInBulkRange,
  refreshExclusions,
  setRowsExcluded,
  type BulkScope,
} from '../../../utils/bulkSelection';
import type { CreateContactData } from '../../../utils/contact';
import { useCreateBulkContact } from '../../../hooks/useContacts';
import { scrapeContactsFromEmails } from '../../../utils/contactScrapper';
import { BulkCreateView } from '../../contacts/BulkCreateView';
import CustomModal from '../../composer/CustomModal';
import { useIsMobile } from '../../../hooks/use-mobile';
import { folderDetailsAtom, folderQuotaAtom } from '../../../state/folders';
import PermanentDeleteConfirm from './PermanentDeleteConfirm';
import EmptyFolderBanner from './EmptyFolderBanner';
import {
  useUpdateAnyFolderUnreadCount,
  useSpecialFolderPaths,
  useFolderUidValidity,
} from '../../../hooks/useFolders';
import { useEmailCacheUpdater } from '../../../hooks/useEmailCacheUpdater';
import { countUnread, expandRowIds, rowKey, type EmailLike } from '../../../utils/threads';
import { type ViewAttachment } from '../../../hooks/useEmailView';
import { emailFilterAtom, emailSortAtom } from '../../../state/emailListView';
import { isConversationView } from '../../../utils/emailListUtils';

interface EmailListProps {
  onRegisterClearCallback?: (callback: () => void) => void;
  onRegisterClearSelectionCallback?: (callback: () => void) => void;
  /** UIDs being dragged and the folder they are in. */
  onDragStart?: (emailIds: number[], sourceFolder?: string) => void;
  onDragEnd?: () => void;
  onFocusFolders?: () => void;
}

// Stable "nothing yet" values. A new [] or {} on each render looks like new data
// to the effects below, which then re-render forever while a list is loading.
const NO_EMAILS: Email[] = [];
const NO_FLAGS: string[] = [];
const NO_SELECTION: number[] = [];
const IGNORE_SELECTION = () => {};

// Only needed once a reply is started (Mailbox fetches the editor while idle)
const EmailComposer = lazy(() => import('./EmailComposer'));

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
  // Server-side sort/filter (applied to the whole folder before pagination)
  const emailSort = useAtomValue(emailSortAtom);
  const [emailFilter, setEmailFilter] = useAtom(emailFilterAtom);
  const sortKey = `${emailSort.sortBy}|${emailSort.sortOrder}|${emailFilter}`;
  const [prevSortKey, setPrevSortKey] = useState(sortKey);

  // Reset page numbers when switching folders to prevent requesting old page indices
  if (folder !== prevFolder) {
    setPrevFolder(folder);
    setRegularPage(1);
    setSearchPage(1);
    setEmailFilter('all');
  }

  // Same when the sort or filter changes: page 1 holds the first results
  if (sortKey !== prevSortKey) {
    setPrevSortKey(sortKey);
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
  const [moveSourceFolder, setMoveSourceFolder] = useState<string>('');
  const isMobile = useIsMobile();
  const folderDetails = useAtomValue(folderDetailsAtom);
  const folderQuota = useAtomValue(folderQuotaAtom);

  const permanentDeleteThreshold = userSettings?.email?.permanent_delete_threshold ?? 90;
  const isQuotaNearFull = (folderQuota?.used_percent ?? 0) >= permanentDeleteThreshold;

  const [isPermanentDeleteDialogOpen, setIsPermanentDeleteDialogOpen] = useState(false);
  const [permanentDeleteEmails, setPermanentDeleteEmails] = useState<number[]>([]);
  const [permanentDeleteFolder, setPermanentDeleteFolder] = useState<string>('');
  const setFolderDetails = useSetAtom(folderDetailsAtom);
  const updateAnyFolderUnreadCount = useUpdateAnyFolderUnreadCount();
  // Resolved Sent/Drafts/Trash/Spam (e.g. "INBOX/Trash" on servers nesting folders under INBOX)
  const specialFolders = useSpecialFolderPaths();
  const { patchEmailFlags } = useEmailCacheUpdater(folder || 'INBOX');
  const { refetch: refetchUidValidity, data: liveUidValidity } = useFolderUidValidity(
    folder || 'INBOX'
  );

  const currentFolderDetail = useMemo(() => {
    if (!Array.isArray(folderDetails)) return null;
    return folderDetails.find((f) => f.folder_name === (folder || 'INBOX'));
  }, [folderDetails, folder]);

  // Conversation view: one row per conversation, grouped by the API across the
  // whole folder (pages, totals and unread counts are per conversation).
  // Otherwise one row per email.
  // The conversation endpoints only order by date: any other sort (sender, size,
  // ...) lists single emails, which /email/fetch and /email/search/all can sort.
  const conversationView =
    isConversationView(userSettings, specialFolders.settingsKey(folder)) &&
    emailSort.sortBy === 'date';

  const plainList = useEmails(
    folder || 'INBOX',
    regularPage,
    PER_PAGE,
    true,
    {
      sortBy: emailSort.sortBy,
      sortOrder: emailSort.sortOrder,
      filterBy: emailFilter,
    },
    !conversationView
  );
  const conversationList = useEmailThreads(
    folder || 'INBOX',
    regularPage,
    PER_PAGE,
    { sortOrder: emailSort.sortOrder, filterBy: emailFilter, sentFolder: specialFolders.sent },
    conversationView
  );
  const {
    data: regularData,
    isFetching: isRegularFetching,
    dataUpdatedAt: regularDataUpdatedAt,
    error: regularError,
  } = conversationView ? conversationList : plainList;

  // When the folder's UID status arrives and differs from the stored one, the
  // cached list may be outdated (new mail, changes elsewhere) — reload it.
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

    // On folder open the list and the status are fetched together: a list that
    // is loading right now, or was loaded in the last few seconds, is already
    // current — invalidating it would just send the same request twice.
    const isListCurrent = isRegularFetching || Date.now() - regularDataUpdatedAt < 10_000;
    if (hasChanged && !isListCurrent) {
      // cancelRefetch: false joins an in-flight fetch instead of restarting it
      queryClient.invalidateQueries(
        { queryKey: ['folder', folder || 'INBOX'] },
        { cancelRefetch: false }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveUidValidity]);

  // The folder shrank under us (deletes, or marking read in the Unread view on
  // the last page): step back to the last page instead of showing an error.
  useEffect(() => {
    if (regularPage > 1 && regularError?.message?.includes('exceeds total pages')) {
      setRegularPage((page) => Math.max(1, page - 1));
    }
  }, [regularError, regularPage]);

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
      sort_by: emailSort.sortBy,
      sort_order: emailSort.sortOrder,
    };
  }, [
    searchState.isActive,
    searchState.filters,
    searchState.query,
    folder,
    searchPage,
    PER_PAGE,
    emailSort.sortBy,
    emailSort.sortOrder,
  ]);

  const { mutate: moveMutate } = useMoveMail();
  const { mutate: markUnReadMutate } = useUnseenMail();
  const { mutate: markReadMutate } = useSeenMail();
  const { mutate: markUnFlaggedMutate } = useUnFlaggedMail();
  const { mutate: markFlaggedMutate } = useFlaggedMail();
  const { mutate: deleteMutate } = useDeleteMail();

  const layout = userSettings?.ui?.layout || 'side-by-side';
  const [pageCheckedEmails, setCheckedEmails] = useState<number[]>([]);
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
    searchState.isActive && searchRequest !== null && !viewingEmail,
    // No filterBy: search doesn't offer the filter (the menu hides it while searching)
    { conversations: conversationView, sentFolder: specialFolders.sent }
  );
  const [viewMode, setViewMode] = useState<'left' | 'down'>(() => {
    return layout === 'vertical-split' ? 'down' : 'left';
  });
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [currentAttachments, setCurrentAttachments] = useState<ViewAttachment[]>([]);
  const [, setShowKeyboardHelp] = useState(false);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);
  const [composerOpen, setComposerOpen] = useAtom(emailComposerOpenAtom);
  const composerKeepMounted = useAtomValue(emailComposerKeepMountedAtom);
  const setComposerData = useSetAtom(emailComposerDataAtom);
  const resetComposerData = useSetAtom(resetEmailComposerDataAtom);
  const { refetch: fetchRawEmail } = useEmailRaw(
    viewingEmail?.id.toString() || '',
    viewingEmail?.folderPath || viewingEmailFolder || folder || 'INBOX',
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
  const emails = (
    searchState.isActive && searchData?.data
      ? searchData.data.data
      : regularData?.emails || NO_EMAILS
  ) as Email[];

  const total_count =
    searchState.isActive && searchData?.data
      ? searchData.data.total_count
      : regularData?.total_count || 0;

  const total_emails = !conversationView
    ? undefined
    : searchState.isActive && searchData?.data
      ? searchData.data.total_messages
      : conversationList.data?.total_messages;

  const total_pages =
    searchState.isActive && searchData?.data
      ? Math.ceil(searchData.data.total_count / PER_PAGE)
      : regularData?.total_pages || 0;

  const isFetching = searchState.isActive ? isSearchFetching : isRegularFetching;
  // A page past the end is recovered above by stepping back, not shown as an error
  const isPageOverflow =
    !searchState.isActive &&
    regularPage > 1 &&
    !!regularError?.message?.includes('exceeds total pages');
  const error = searchState.isActive ? searchError : isPageOverflow ? null : regularError;

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

  // Rows in API order: emails, or conversations (grouped and sorted by the API)
  const emailArray = simpleEmailArray;

  /**
   * Rows to look ids up in: the list, plus the open email (it may come from
   * search)
   */
  const knownRows = (): EmailLike[] =>
    viewingEmail
      ? [...(emailArray as unknown as EmailLike[]), viewingEmail as unknown as EmailLike]
      : (emailArray as unknown as EmailLike[]);

  /**
   * Row ids → UIDs to act on: a conversation row means all its emails in this
   * folder.
   */
  const toEmailUids = (rowIds: number[]) => expandRowIds(knownRows(), rowIds);

  /** The open email: same UID and same folder (UIDs repeat across folders) */
  const isViewing = (email: Email | null | undefined) =>
    !!viewingEmail &&
    !!email &&
    email.id === viewingEmail.id &&
    (email.folderPath ?? '') === (viewingEmail.folderPath ?? '');

  const findRow = (rowId: number) =>
    knownRows().find((row) => Number(row.id) === rowId) as Email | undefined;

  // Folder the listed rows are in: the searched folder while searching
  const listFolder = (searchState.isActive && searchRequest?.folder) || folder || 'INBOX';

  /**
   * Folder of the rows acted on. UIDs are per folder: an action must name the
   * folder of its emails, which is not the open folder for search results in
   * another folder or an email opened from the header search.
   */
  const folderOf = (rowIds: number[]) =>
    (rowIds.length ? findRow(rowIds[0])?.folderPath : undefined) || listFolder;

  useEffect(() => {
    if (emailArray) {
      const email_flag = emailArray.find((email) => isViewing(email));
      setViewingEmailFlag(email_flag?.FLAGS || NO_FLAGS);
    }
  }, [viewingEmail, emails, emailArray, setViewingEmailFlag]);

  // Select all in the folder, filter or search. It stays active across pages:
  // ticks are worked out from each row, so a page shows them as soon as its rows
  // arrive, and only unticking a row excludes it.
  const bulkSelection = useBulkSelection({
    folder: listFolder,
    filterBy: searchState.isActive ? 'all' : emailFilter,
    search: searchState.isActive ? searchRequest : null,
    conversations: conversationView,
    onFinished: () => handleDeselectAll(),
  });
  const bulkMaxUid = bulkSelection.selection?.maxUid;
  const bulkExclusions = bulkSelection.exclusions;
  const checkedEmails = useMemo(
    () =>
      bulkMaxUid === undefined
        ? pageCheckedEmails
        : emailArray
            .filter((email) =>
              isRowBulkSelected(email as unknown as EmailLike, bulkMaxUid, bulkExclusions)
            )
            .map((email) => Number(email.id)),
    [emailArray, pageCheckedEmails, bulkMaxUid, bulkExclusions]
  );
  const checkedCount = checkedEmails.length;
  // What the toolbar checkbox counts as "all": rows newer than max_uid can't be ticked
  const totalSelectedCount =
    bulkMaxUid === undefined
      ? emailArray.length
      : emailArray.filter((email) => isRowInBulkRange(email as unknown as EmailLike, bulkMaxUid))
          .length;
  const isBulkSelected = !!bulkSelection.selection && !viewingEmail;
  const bulkTotal = total_emails ?? total_count;
  const bulkScope: BulkScope = searchState.isActive
    ? 'search'
    : emailFilter !== 'all'
      ? 'filter'
      : 'folder';
  const bulkCount = bulkSelection.selection
    ? bulkCounts(
        bulkSelection.selection.totalAtSelectAll,
        bulkTotal,
        bulkExclusions,
        bulkSelection.selection.maxUid
      )
    : null;

  // Opening an email ends select all; the ticks of this page stay
  useEffect(() => {
    if (!viewingEmail) return;
    if (bulkSelection.selection) setCheckedEmails(checkedEmails);
    bulkSelection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingEmail]);

  // Reloaded rows can hold UIDs an unticked conversation didn't have before
  useEffect(() => {
    bulkSelection.setExclusions((current) =>
      refreshExclusions(current, emailArray as unknown as EmailLike[])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailArray]);

  useEffect(() => {
    setCheckedEmails([]);
  }, [folder]);

  const handleQuickMove = (emailId: string) => {
    setEmailToMove(toEmailUids([Number(emailId)]));
    setMoveSourceFolder(folderOf([Number(emailId)]));
    setIsMoveDialogOpen(true);
  };

  const handleFolderSelect = (newFol: { name: string; path: string }) => {
    const loadingId = toast.loading({ description: `Moving to ${newFol.name}…` });
    const sourceFolder = moveSourceFolder || listFolder;
    moveMutate(
      {
        path: sourceFolder,
        sourceFolder,
        destFolder: newFol.path,
        body: emailToMove,
      },
      {
        onSuccess: () => {
          // Count unread emails being moved (emailToMove is still the closure value here)
          const unreadMoved = countUnread(knownRows(), emailToMove);

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
            updateAnyFolderUnreadCount(sourceFolder, -unreadMoved);
            updateAnyFolderUnreadCount(newFol.path, unreadMoved);
          }

          toast.dismiss(loadingId);
          toast.success({ description: `Moved to ${newFol.name}` });
          // List reload is done by useMoveMail/useDeleteMail (invalidateFolderLists)
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
    onRefresh: () => handleManualRefresh(),
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
    // Select all stays on: this page is ticked again, other pages keep their exclusions
    bulkSelection.setExclusions((current) =>
      setRowsExcluded(current, emailArray as unknown as EmailLike[], false)
    );
  };

  // Also the one way to end select all, besides opening an email: a page without
  // ticks doesn't end it. Called through callbacks kept from the first render,
  // which is fine as it only uses state setters.
  const handleDeselectAll = () => {
    setCheckedEmails([]);
    setIsSelectionMode(false);
    setLastSelectedIndex(null);
    bulkSelection.clear();
  };

  const handleEditAsNew = (email: Email) => {
    setEditAsNewEmail(email);
    setComposerOpen(true);
  };

  const doMoveToTrash = (emailsToActOn: number[], sourceFolder: string) => {
    const actionId = `delete-${Date.now()}-${Math.random()}`;
    const isViewingEmailAffected = viewingEmail && emailsToActOn.includes(Number(viewingEmail.id));

    pendingDeleteActions.current.set(actionId, {
      emailIds: emailsToActOn,
      originalFolder: sourceFolder,
    });

    if (isViewingEmailAffected) {
      handleBackToList();
    }
    toast.success({
      description: 'Email is moving to trash',
      undo: {
        label: 'Undo',
        onClick: () => {
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
          path: sourceFolder,
          sourceFolder,
          destFolder: specialFolders.trash,
          body: emailsToActOn,
        },
        {
          onSuccess: () => {
            toast.dismiss(loadingId);
            handleDeselectAll();
            // List reload is done by useMoveMail/useDeleteMail (invalidateFolderLists)
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
  };

  const doPermanentDelete = (emailsToActOn: number[], sourceFolder: string) => {
    const isViewingEmailAffected = viewingEmail && emailsToActOn.includes(Number(viewingEmail.id));
    const loadingId = toast.loading({ description: 'Deleting email(s)…' });
    deleteMutate(
      {
        path: sourceFolder,
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
          // List reload is done by useMoveMail/useDeleteMail (invalidateFolderLists)
        },
        onError: (error) => {
          toast.dismiss(loadingId);
          toast.error({
            description: error?.message || 'Failed to delete email.',
          });
        },
      }
    );
  };

  /**
   * Delete rows: permanently in Trash, else to Trash (asks first when the quota
   * is nearly full)
   */
  const deleteRows = (rowIds: number[]) => {
    // A conversation row deletes the whole conversation (in its folder)
    const uids = toEmailUids(rowIds);
    const sourceFolder = folderOf(rowIds);
    const inTrash = specialFolders.isFolder(sourceFolder, 'trash');

    if (isQuotaNearFull && !inTrash) {
      setPermanentDeleteEmails(uids);
      setPermanentDeleteFolder(sourceFolder);
      setIsPermanentDeleteDialogOpen(true);
      return;
    }

    if (inTrash) {
      doPermanentDelete(uids, sourceFolder);
    } else {
      doMoveToTrash(uids, sourceFolder);
    }
  };

  const handleDelete = () => {
    if (!isBulkSelected) {
      deleteRows(getEmailsToActOn());
    } else if (
      specialFolders.isFolder(listFolder, 'trash') ||
      specialFolders.isFolder(listFolder, 'spam')
    ) {
      bulkSelection.request('delete');
    } else {
      bulkSelection.request('move', specialFolders.trash, 'Trash');
    }
  };

  const handleSingleEmailDelete = (emailId: string) => deleteRows([Number(emailId)]);

  /**
   * Read / unread of rows. Read: every email of a conversation. Unread: only
   * its latest email (the row's id), like other mail apps.
   */
  const readTargets = (rowIds: number[], markRead: boolean) => {
    const rows = rowIds
      .map(findRow)
      .filter((row): row is Email => !!row)
      .filter((row) => (markRead ? !row.FLAGS?.includes('\\Seen') : row.FLAGS?.includes('\\Seen')));
    return {
      uids: markRead
        ? toEmailUids(rows.map((row) => Number(row.id)))
        : rows.map((row) => Number(row.id)),
      count: markRead
        ? countUnread(
            rows as unknown as EmailLike[],
            rows.map((r) => Number(r.id))
          )
        : rows.length,
    };
  };

  /** Flag: the row's latest email. Unflag: every email of a conversation. */
  const flagTargets = (rowIds: number[], unflag: boolean) =>
    unflag ? toEmailUids(rowIds) : rowIds;

  const handleMarkAsRead = (isSeen: boolean) => {
    // isSeen: the selection is read and should become unread
    if (isBulkSelected) {
      bulkSelection.request(isSeen ? 'unread' : 'read');
      return;
    }
    const rowIds = getEmailsToActOn();
    const emailsFolder = folderOf(rowIds);
    const { uids: targetIds, count } = readTargets(rowIds, !isSeen);

    if (targetIds.length === 0) return;

    const mutation = isSeen ? markUnReadMutate : markReadMutate;
    const loadingId = toast.loading({
      description: isSeen ? 'Marking as unread...' : 'Marking as read...',
    });
    mutation(
      {
        path: emailsFolder,
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

          patchEmailFlags(
            targetIds,
            isSeen ? undefined : '\\Seen',
            isSeen ? '\\Seen' : undefined,
            emailsFolder
          );
          updateAnyFolderUnreadCount(emailsFolder, isSeen ? count : -count);
        },
      }
    );
  };

  const handleSingleEmailMarkAsRead = (emailId: string, isRead: boolean) => {
    const row = findRow(Number(emailId));
    // Read: all emails of a conversation; unread: its latest one
    const targetIds = isRead ? toEmailUids([Number(emailId)]) : [Number(emailId)];
    const unreadChange = isRead ? (row?.thread ? row.thread.unreadCount : 1) : 1;
    const emailsFolder = folderOf([Number(emailId)]);
    const loadingId = toast.loading({
      description: isRead ? 'Marking as read...' : 'Marking as unread...',
    });
    if (isRead) {
      markReadMutate(
        {
          path: emailsFolder,
          body: targetIds,
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email marked as read.',
            });

            patchEmailFlags(targetIds, '\\Seen', undefined, emailsFolder);
            updateAnyFolderUnreadCount(emailsFolder, -unreadChange);
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
          path: emailsFolder,
          body: targetIds,
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email marked as unread.',
            });

            patchEmailFlags(targetIds, undefined, '\\Seen', emailsFolder);
            updateAnyFolderUnreadCount(emailsFolder, unreadChange);
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
    // action: unflag
    if (isBulkSelected) {
      bulkSelection.request(action ? 'unflag' : 'flag');
      return;
    }
    const rowIds = getEmailsToActOn();
    const emailsFolder = folderOf(rowIds);
    const emailsToActOn = flagTargets(rowIds, action);
    const loadingId = toast.loading({
      description: action ? 'Unflagging email(s)...' : 'Flagging email(s)...',
    });
    if (action) {
      markUnFlaggedMutate(
        {
          path: emailsFolder,
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
            patchEmailFlags(emailsToActOn, undefined, '\\Flagged', emailsFolder);
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
          path: emailsFolder,
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
            patchEmailFlags(emailsToActOn, '\\Flagged', undefined, emailsFolder);
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
    const targetIds = flagTargets([Number(emailId)], action);
    const emailsFolder = folderOf([Number(emailId)]);
    const loadingId = toast.loading({
      description: action ? 'Unflagging email...' : 'Flagging email...',
    });
    if (action) {
      markUnFlaggedMutate(
        {
          path: emailsFolder,
          body: targetIds,
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            handleDeselectAll();
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email unmarked as flagged.',
            });
            patchEmailFlags(targetIds, undefined, '\\Flagged', emailsFolder);
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
          path: emailsFolder,
          body: targetIds,
        },
        {
          onSuccess: (res) => {
            toast.dismiss(loadingId);
            handleDeselectAll();
            toast.success({
              description:
                (res as unknown as { message?: string })?.message || 'Email flagged as flagged.',
            });
            patchEmailFlags(targetIds, '\\Flagged', undefined, emailsFolder);
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

  const handleManualRefresh = async () => {
    const loadingId = toast.loading({ description: 'Refreshing…' });
    try {
      await Promise.all([
        // Refetches the visible view; the folder's other filters/sorts/pages are
        // marked stale and reload when shown
        queryClient.invalidateQueries({ queryKey: ['folder', folder || 'INBOX'] }),
        searchState.isActive
          ? queryClient.invalidateQueries({ queryKey: ['search-emails'] })
          : Promise.resolve(),
        // Folder unread counts (GET /folder/path)
        queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] }),
      ]);
    } finally {
      toast.dismiss(loadingId);
    }
  };

  // Auto-refresh (every minute, after sending): cheap check for new mail first
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

    // cancelRefetch: false — the UID-status effect above may already be
    // reloading the list for the same change; join that request, don't restart it
    await queryClient.invalidateQueries(
      { queryKey: ['folder', folder || 'INBOX'] },
      { cancelRefetch: false }
    );

    if (searchState.isActive) {
      await queryClient.invalidateQueries(
        { queryKey: ['search-emails'] },
        { cancelRefetch: false }
      );
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

  // Dragging a conversation row moves all its emails of this folder
  const handleCardDragStart = (rowIds: number[]) =>
    onDragStart?.(toEmailUids(rowIds), folderOf(rowIds));

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

    // Also while select all waits for the server: its ticks apply once it's active
    if (bulkSelection.selection || bulkSelection.isSelecting) {
      const rows =
        shiftKey && lastSelectedIndex !== null && index !== undefined
          ? emailArray.slice(Math.min(lastSelectedIndex, index), Math.max(lastSelectedIndex, index) + 1)
          : emailArray.filter((email) => Number(email.id) === idNum);
      bulkSelection.setExclusions((current) =>
        setRowsExcluded(current, rows as unknown as EmailLike[], !isSelected)
      );
      if (bulkSelection.selection) {
        if (index !== undefined) setLastSelectedIndex(index);
        return;
      }
    }

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
        const uid = String(emailToForward.id);
        const folderPath = emailToForward.folderPath || viewingEmailFolder || folder || 'INBOX';
        // Same cache entry (folder + UID) as the viewer's raw fetch
        raw = await queryClient.fetchQuery({
          queryKey: rawEmailCacheKey(folderPath, uid),
          queryFn: () => emailRaw(uid, folderPath, false),
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
        subject: formatForwardSubject(subject),
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
    const currentIndex = emailArray.findIndex((e) => isViewing(e));
    if (currentIndex < emailArray.length - 1) {
      const nextEmail = emailArray[currentIndex + 1];
      handleEmailClick(nextEmail);
    }
  };

  const handlePrevEmail = () => {
    const currentIndex = emailArray.findIndex((e) => isViewing(e));
    if (currentIndex > 0) {
      const prevEmail = emailArray[currentIndex - 1];
      handleEmailClick(prevEmail);
    }
  };

  const hasNextEmail = () => {
    const currentIndex = emailArray.findIndex((e) => isViewing(e));
    return currentIndex < emailArray.length - 1;
  };

  const hasPrevEmail = () => {
    const currentIndex = emailArray.findIndex((e) => isViewing(e));
    return currentIndex > 0;
  };

  const handleEmailClick = (email: Email) => {
    savedScrollPositionRef.current = emailListScrollRef.current?.scrollTop ?? 0;
    setIsSelectionMode(false);
    setIsKeyboardNavigating(false);
    setViewingEmail(email);
    setViewingEmailFolder(folder);

    // Marking as read happens in the viewer (useMarkSeenOnOpen): once, by the
    // view that shows the email, also when it was prefetched without marking

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        email.folderPath || folder || 'INBOX'
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
    if (bulkSelection.selection) {
      // Select all stays active; a shift-click range must not span two pages
      setLastSelectedIndex(null);
    } else {
      handleDeselectAll();
    }
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

  // "Empty Trash/Spam now" bar (renders nothing for other folders)
  const renderEmptyFolderBanner = () =>
    !searchState.isActive && (
      <EmptyFolderBanner
        folder={folder || 'INBOX'}
        folderDetail={currentFolderDetail}
        emailCount={
          currentFolderDetail?.status?.MESSAGES ?? (emailFilter === 'all' ? total_count : undefined)
        }
        onEmptied={() => {
          if (viewingEmail) handleBackToList();
          handleDeselectAll();
          setRegularPage(1);
        }}
      />
    );

  const renderBulkBanner = () => {
    if (viewingEmail || emailArray.length === 0 || total_pages <= 1) return null;
    if (isBulkSelected && bulkCount) {
      return (
        <BulkSelectBanner
          message={bulkSelectedText(bulkCount.total, bulkCount.excluded, bulkScope)}
          actionLabel="Clear selection"
          onAction={handleDeselectAll}
        />
      );
    }
    if (checkedCount !== emailArray.length) return null;
    const offer = bulkOfferText(emailArray.length, bulkTotal, conversationView, bulkScope);
    return (
      <BulkSelectBanner
        message={offer.message}
        actionLabel={bulkSelection.isSelecting ? 'Selecting…' : offer.action}
        onAction={() => bulkSelection.selectAll(bulkTotal)}
        disabled={bulkSelection.isSelecting}
      />
    );
  };

  // Stable props for the memoized rows: selecting one row re-renders that row only
  const onRowSelectionChange = useStableCallback(handleSelectionChange);
  const onRowClick = useStableCallback(handleEmailClick as (email: unknown) => void);
  const onRowMarkAsRead = useStableCallback(handleSingleEmailMarkAsRead);
  const onRowDelete = useStableCallback(handleSingleEmailDelete);
  const onRowDragStart = useStableCallback(handleCardDragStart);
  const onRowEnterSelectionMode = useStableCallback(handleEnterSelectionMode);
  const onRowMove = useStableCallback(handleQuickMove);
  const onRowToggleFlag = useStableCallback(handleSingleEmailMarkAsFlagged);
  const getCheckedEmails = useStableCallback(() => (viewingEmail ? NO_SELECTION : checkedEmails));

  // Runs when the element is attached, not on each render: an inline ref would be
  // called every time and pull the list back to the saved scroll position
  const attachEmailList = useCallback((node: HTMLDivElement | null) => {
    emailListScrollRef.current = node;
    if (node) node.scrollTop = savedScrollPositionRef.current;
  }, []);

  const renderEmailList = () => (
    <div
      ref={attachEmailList}
      className={`h-full overflow-x-hidden bg-[var(--gray-1)] transition-opacity duration-200 ${isFetching ? 'opacity-80' : 'opacity-100'}`}
    >
      {renderEmptyFolderBanner()}
      {renderBulkBanner()}
      <div className="flex flex-col gap-0">
        {emailArray.map((email, index) => (
          <EmailCard
            index={index}
            key={rowKey(email as unknown as EmailLike)}
            id={`email-card-${email.id}`}
            email={email}
            isSelected={!viewingEmail && checkedEmails.includes(Number(email.id))}
            isSelectionMode={!viewingEmail && isSelectionMode}
            onEnterSelectionMode={viewingEmail ? undefined : onRowEnterSelectionMode}
            onSelectionChange={viewingEmail ? IGNORE_SELECTION : onRowSelectionChange}
            getCheckedEmails={getCheckedEmails}
            onEmailClick={onRowClick}
            total={emailArray.length}
            onMarkAsRead={onRowMarkAsRead}
            onDelete={onRowDelete}
            folder={folder}
            isActive={isViewing(email)}
            onDragStart={onRowDragStart}
            onDragEnd={onDragEnd}
            showSelection={!viewingEmail}
            isKeyboardFocused={
              currentEmailIndex === index && isKeyboardNavigating && !isViewing(email)
            }
            myEmail={userDetails?.email}
            onMoveToFolder={onRowMove}
            onToggleFlag={onRowToggleFlag}
            hasOpenEmail={!!viewingEmail}
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
          // folder + UID identify the email
          key={`${viewingEmail!.folderPath || viewingEmailFolder}:${viewingEmail!.id}`}
          messageId={viewingEmail!.id.toString()}
          folderPath={viewingEmail!.folderPath || viewingEmailFolder}
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
    return (
      <EmailEmptyState
        folder={folder}
        error={error}
        onRetry={handleManualRefresh}
        filter={searchState.isActive ? 'all' : emailFilter}
      />
    );
  }

  return (
    <div className="p-0 w-full mb-4 bg-[var(--gray-1)] overflow-x-hidden">
      {hasActiveSearch() && <SearchResultsBanner resultCount={total_count} />}
      <EmailToolbar
        checkedEmails={viewingEmail ? [Number(viewingEmail.id)] : checkedEmails}
        actionEmailIds={toEmailUids(viewingEmail ? [Number(viewingEmail.id)] : checkedEmails)}
        actionFolder={folderOf(viewingEmail ? [Number(viewingEmail.id)] : checkedEmails)}
        selectedCount={checkedCount}
        totalSelectedCount={totalSelectedCount}
        bulkSelectedCount={isBulkSelected ? bulkCount?.selected : undefined}
        onBulkMove={(destination) =>
          bulkSelection.request('move', destination.path, destination.name)
        }
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDelete={handleDelete}
        onMarkAsRead={handleMarkAsRead}
        onRefresh={handleManualRefresh}
        isRefreshing={isFetching}
        showBackButton={!!viewingEmail}
        onBack={handleBackToList}
        total_pages={total_pages || 0}
        total_count={total_count || 0}
        total_emails={total_emails}
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
          <EmailEmptyState
            folder={folder}
            error={error}
            onRetry={handleManualRefresh}
            filter={searchState.isActive ? 'all' : emailFilter}
          />
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
            {renderEmptyFolderBanner()}
            {renderBulkBanner()}
            {emailArray.map((email, index) => (
              <EmailCard
                index={index}
                key={rowKey(email as unknown as EmailLike)}
                id={`email-card-${email.id}`}
                email={email}
                isSelected={checkedEmails.includes(Number(email.id))}
                onSelectionChange={onRowSelectionChange}
                onEmailClick={onRowClick}
                total={emailArray.length}
                isSelectionMode={isSelectionMode}
                onEnterSelectionMode={onRowEnterSelectionMode}
                onMarkAsRead={onRowMarkAsRead}
                onDelete={onRowDelete}
                folder={folder}
                onDragStart={onRowDragStart}
                onDragEnd={onDragEnd}
                getCheckedEmails={getCheckedEmails}
                isKeyboardFocused={currentEmailIndex === index && isKeyboardNavigating}
                myEmail={userDetails?.email}
                onMoveToFolder={onRowMove}
                onToggleFlag={onRowToggleFlag}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── EmailComposer lives here at the top level ──────────────────────────
          Rendering it outside the viewer means it stays mounted across folder
          changes and regardless of whether an email is being viewed.           */}
      <Suspense fallback={null}>
        {(composerOpen || composerKeepMounted) && (
          <EmailComposer
            email={
              replyingEmail ||
              replyingAllEmail ||
              forwardingEmail ||
              sendDraftEmail ||
              editAsNewEmail
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
      </Suspense>
      {/* ──────────────────────────────────────────────────────────────────────── */}

      {bulkSelection.pending && (
        <BulkActionDialog
          open
          action={bulkSelection.pending.action}
          progressTitle={bulkProgressTitle(
            bulkSelection.pending.action,
            bulkSelection.pending.destName
          )}
          {...bulkConfirmText(
            bulkSelection.pending.action,
            bulkCount?.selected ?? 0,
            conversationView,
            bulkSelection.pending.destName
          )}
          progress={bulkSelection.progress}
          onConfirm={bulkSelection.run}
          onCancel={bulkSelection.cancel}
        />
      )}

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

      <PermanentDeleteConfirm
        open={isPermanentDeleteDialogOpen}
        onOpenChange={setIsPermanentDeleteDialogOpen}
        emailCount={permanentDeleteEmails.length}
        quotaPercent={folderQuota?.used_percent}
        onMoveToTrash={() => {
          setIsPermanentDeleteDialogOpen(false);
          doMoveToTrash(permanentDeleteEmails, permanentDeleteFolder || listFolder);
        }}
        onPermanentDelete={() => {
          setIsPermanentDeleteDialogOpen(false);
          doPermanentDelete(permanentDeleteEmails, permanentDeleteFolder || listFolder);
        }}
      />
    </div>
  );
};

export default EmailList;
