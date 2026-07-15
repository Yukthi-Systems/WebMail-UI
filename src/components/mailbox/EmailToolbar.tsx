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

// EmailToolbar.tsx
import { Flex, Button, Checkbox, Separator, Text } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import {
  FaTrash,
  FaRotateRight,
  FaArrowLeft,
  FaAngleLeft,
  FaAngleRight,
  FaRegFlag,
  FaPrint,
  FaDownload,
  FaEllipsisVertical,
  FaReply,
  FaReplyAll,
  FaShare,
} from 'react-icons/fa6';
import {
  MdAttachEmail,
  MdContentCopy,
  MdDriveFileMoveOutline,
  MdMarkEmailRead,
  MdMarkEmailUnread,
  MdOutlineViewSidebar,
  MdOutlineViewStream,
  MdPersonAdd,
  MdSaveAs,
} from 'react-icons/md';
import { LuFlagOff } from 'react-icons/lu';
import { RiSpam2Line } from 'react-icons/ri';
import FolderDialog from './MoveEmail';
import { useCopyMail, useMoveMail } from '../../hooks/useEmails';
import { useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateAnyFolderUnreadCount } from '../../hooks/useFolders';
import type { Email } from '../../api/mailbox';
import {
  FaCompressArrowsAlt,
  FaEllipsisH,
  FaExpandArrowsAlt,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import DropdownWrapper, { type DropdownItem } from '../common/DropdownWrapper';
import Pagination from '../common/Pagination';
import { useAtomValue } from 'jotai';
import { userSettingsAtom } from '../../state/settings';
import type { LayoutType } from '../common/header/LayoutSetting';
import { folderQuotaAtom } from '../../state/folders'; // Import folderQuotaAtom
import { useToast } from '../ui/ToastComponent';

interface Folder {
  id: string;
  name: string;
  count?: number;
  color?: string;
  children?: Folder[];
  path?: string;
}

interface EmailToolbarProps {
  checkedEmails: number[];
  selectedCount: number;
  totalSelectedCount: number;
  total_count: number;
  total_pages: number;
  currentPage: number;
  isRefreshing?: boolean;
  showBackButton?: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onMarkAsRead: (isSeen: boolean) => void;
  onRefresh: () => void;
  onBack?: () => void;
  onPageChange: (page: number) => void;
  emailList: Email[];
  onFlagged: (isFlagged: boolean) => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onViewInWindow?: () => void;
  onViewInRaw?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onForwardAsAttachment?: () => void;
  splitView?: boolean;
  onToggleSplitView?: () => void;
  viewMode?: string;
  onToggleView?: () => void;
  layout?: LayoutType;
  onNextEmail?: () => void;
  onPrevEmail?: () => void;
  onEditAsNew?: () => void;
  onSaveAsTemplate?: () => void;
  onSaveAsContact?: () => void;
  hasNextEmail?: boolean;
  hasPrevEmail?: boolean;
}

const EmailToolbar = ({
  checkedEmails = [],
  selectedCount,
  totalSelectedCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMarkAsRead,
  onRefresh,
  isRefreshing = false,
  showBackButton = false,
  onBack,
  total_count,
  total_pages,
  currentPage,
  onPageChange,
  emailList = [],
  onFlagged,
  onPrint,
  onDownload,
  onViewInWindow,
  onViewInRaw,
  onReply,
  onReplyAll,
  onForward,
  onForwardAsAttachment,
  splitView = false,
  onToggleSplitView,
  viewMode = 'left',
  onToggleView,
  layout,
  onNextEmail,
  onPrevEmail,
  hasNextEmail,
  hasPrevEmail,
  onEditAsNew,
  onSaveAsTemplate,
  onSaveAsContact,
}: EmailToolbarProps) => {
  const { folder: folderNameParam } = useParams({ strict: false });
  const folderName = folderNameParam ?? '';
  const toast = useToast(); // Add toast
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | string | undefined | null>(
    undefined
  );
  const [isSeen, setIsSeen] = useState<boolean>(false);
  const [isFlagged, setIsFlagged] = useState<boolean>(false);
  const isAllSelected = selectedCount === totalSelectedCount && totalSelectedCount > 0;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalSelectedCount;
  const hasSelection = selectedCount > 0 || showBackButton;
  const { mutate: moveMutate } = useMoveMail();
  const { mutate: copyMutate } = useCopyMail();
  const queryClient = useQueryClient();
  const updateAnyFolderUnreadCount = useUpdateAnyFolderUnreadCount();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const userSettings = useAtomValue(userSettingsAtom);
  const folderQuota = useAtomValue(folderQuotaAtom); // Get folder quota data
  const [isThreadView, setIsThreadView] = useState(false);

  // Check if quota is exceeded (greater than 98%)
  const isQuotaExceeded = folderQuota?.used_percent !== undefined && folderQuota.used_percent > 98;

  const {
    show_delete_button = true,
    show_forward_button = true,
    show_mark_as_read_button = true,
    show_mark_as_unread_button = true,
    show_reply_button = true,
  } = userSettings?.email ?? {};

  useEffect(() => {
    if (showBackButton && checkedEmails.length > 0) {
      const email = emailList.find((e) => Number(e.id) === checkedEmails[0]);
      if (email) {
        const seenStatus = email.FLAGS.includes('\\Seen');
        const isFlagged = email.FLAGS.includes('\\Flagged');
        // const isThreadView = email[''];
        setIsSeen(seenStatus);
        setIsFlagged(isFlagged);
      }
    }
  }, [checkedEmails, emailList, showBackButton]);

  const handleFolderSelect = (folder: Folder, action: 'move' | 'copy') => {
    // Check if quota is exceeded for copy operation
    if (action === 'copy' && isQuotaExceeded) {
      toast.error({
        description:
          'Cannot copy emails: Storage quota exceeded (98%+ used). Please free up space.',
      });
      setCopyDialogOpen(false);
      return;
    }

    const label =
      action === 'move'
        ? `Moving to ${folder?.name ?? 'folder'}…`
        : `Copying to ${folder?.name ?? 'folder'}…`;
    const loadingId = toast.loading({ description: label });

    setSelectedFolder(folder);
    const mutation = action === 'move' ? moveMutate : copyMutate;
    mutation(
      {
        path: folderName,
        sourceFolder: folderName,
        destFolder: folder?.path || folderName || '',
        body: checkedEmails,
      },
      {
        onSuccess: () => {
          // Count unread emails being moved (checkedEmails/emailList are closure values)
          if (action === 'move') {
            const unreadMoved = emailList.filter(
              (e: any) => checkedEmails.includes(Number(e.id)) && !e.FLAGS?.includes('\\Seen')
            ).length;
            if (unreadMoved > 0) {
              updateAnyFolderUnreadCount(folderName, -unreadMoved);
              updateAnyFolderUnreadCount(folder?.path || '', unreadMoved);
            }
          }

          // Clear selection and close dialogs BEFORE invalidating the query so
          // the re-render from the refetch never sees stale checkedEmails IDs.
          onDeselectAll();
          setDialogOpen(false);
          setCopyDialogOpen(false);
          setSelectedFolder('');

          toast.dismiss(loadingId);
          toast.success({
            description:
              action === 'move' ? `Moved to ${folder?.name}` : `Copied to ${folder?.name}`,
          });

          // Invalidate directly rather than going through onRefresh() so we skip
          // the UID-validity check (which can bail early and skip the invalidation).
          queryClient.invalidateQueries({ queryKey: ['folder', folderName] });

          if (showBackButton && onBack) {
            onBack();
          }
        },
        onError: (error: any) => {
          toast.dismiss(loadingId);
          const quota =
            isQuotaExceeded && action === 'copy'
              ? ' Storage quota exceeded (98%+ used). Please free up space.'
              : '';
          toast.error({
            description: error?.message || `Failed to ${action} email.${quota}`,
          });
        },
      }
    );
  };

  useEffect(() => {
    if (checkedEmails.length > 0) {
      const seenStatus = checkedEmails.every((emailId) => {
        const email = emailList.find((e) => Number(e.id) === emailId);
        return email?.FLAGS.includes('\\Seen');
      });
      setIsSeen(seenStatus);
    } else {
      setIsSeen(false);
    }
  }, [checkedEmails]);

  useEffect(() => {
    if (checkedEmails.length > 0) {
      const isFlagged = checkedEmails.every((emailId) => {
        const email = emailList.find((e) => Number(e.id) === emailId);
        return email?.FLAGS.includes('\\Flagged');
      });
      setIsFlagged(isFlagged);
    } else {
      setIsFlagged(false);
    }
  }, [checkedEmails]);

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handlePrevPage = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNextPage = () => onPageChange(Math.min(total_pages, currentPage + 1));

  // Function to open move dialog with quota check
  const handleMoveClick = () => {
    // alert("TEST")
    // if (hasSelection) {
    //   setDialogOpen(true);
    // }
    if (isQuotaExceeded) {
      toast.error({
        description:
          'Cannot move emails: Storage quota exceeded (98%+ used). Please free up space.',
      });
      return;
    }
    setDialogOpen(true);
  };

  // Function to open copy dialog with quota check
  const handleCopyClick = () => {
    // if (hasSelection) {
    if (isQuotaExceeded) {
      toast.error({
        description:
          'Cannot copy emails: Storage quota exceeded (98%+ used). Please free up space.',
      });
      return;
    }
    setCopyDialogOpen(true);
    // }
  };

  // Mobile dropdown items for bulk actions
  const mobileDropdownItems: DropdownItem[] = [
    ...(show_delete_button
      ? [
          {
            key: 'delete',
            label: 'Delete',
            icon: FaTrash,
            color: 'red',
            onSelect: onDelete,
            disabled: !hasSelection,
          },
        ]
      : []),

    ...(show_mark_as_read_button || show_mark_as_unread_button
      ? [
          {
            key: 'read',
            label: isSeen ? 'Mark as Unread' : 'Mark as Read',
            icon: isSeen ? MdMarkEmailUnread : MdMarkEmailRead,
            onSelect: () => onMarkAsRead(isSeen),
            disabled: !hasSelection,
          },
        ]
      : []),

    {
      key: 'spam',
      label: folderName === 'Junk' || folderName === 'Spam' ? 'Mark as Not Spam' : 'Mark as Spam',
      icon: RiSpam2Line,
      onSelect: () => {},
      disabled: !hasSelection,
    },
    {
      key: 'move',
      label: 'Move',
      icon: MdDriveFileMoveOutline,
      onSelect: handleMoveClick,
      disabled: !hasSelection,
    },
    {
      key: 'copy',
      label: 'Copy',
      icon: MdContentCopy,
      onSelect: handleCopyClick,
      disabled: !hasSelection || isQuotaExceeded, // Disable copy if quota exceeded
    },
    {
      key: 'flag',
      label: 'Flag',
      icon: isFlagged ? LuFlagOff : FaRegFlag,
      onSelect: () => onFlagged(isFlagged),
      disabled: !hasSelection,
    },
  ];

  // Single email view dropdown items
  const singleEmailDropdownItems: DropdownItem[] = [
    ...(show_reply_button
      ? [
          {
            key: 'reply',
            label: 'Reply',
            icon: FaReply,
            onSelect: onReply,
          },
          {
            key: 'reply-all',
            label: 'Reply All',
            icon: FaReplyAll,
            onSelect: onReplyAll,
          },
        ]
      : []),
    ...(show_forward_button
      ? [
          {
            key: 'forward',
            label: 'Forward',
            icon: FaShare,
            onSelect: onForward,
          },
          {
            key: 'forward-as-attachment',
            label: 'Forward as Attachment',
            icon: MdAttachEmail,
            onSelect: () => onForwardAsAttachment?.(),
          },
        ]
      : []),
    {
      key: 'separator1',
      label: '',
      separator: true,
    },
    ...(show_delete_button
      ? [
          {
            key: 'delete',
            label: 'Delete',
            icon: FaTrash,
            color: 'red',
            onSelect: onDelete,
          },
        ]
      : []),
    ...(show_mark_as_read_button || show_mark_as_unread_button
      ? [
          {
            key: 'read',
            label: isSeen ? 'Mark as Unread' : 'Mark as Read',
            icon: isSeen ? MdMarkEmailUnread : MdMarkEmailRead,
            onSelect: () => onMarkAsRead(isSeen),
          },
        ]
      : []),
    {
      key: 'spam',
      label: folderName === 'Junk' || folderName === 'Spam' ? 'Not Spam' : 'Spam',
      icon: RiSpam2Line,
      onSelect: () => {},
    },
    {
      key: 'move',
      label: 'Move',
      icon: MdDriveFileMoveOutline,
      onSelect: handleMoveClick,
    },
    {
      key: 'copy',
      label: 'Copy',
      icon: MdContentCopy,
      onSelect: handleCopyClick,
      disabled: isQuotaExceeded, // Disable copy if quota exceeded
    },
    {
      key: 'flag',
      label: 'Flag',
      icon: isFlagged ? LuFlagOff : FaRegFlag,
      onSelect: () => onFlagged(isFlagged),
    },
    {
      key: 'separator2',
      label: '',
      separator: true,
    },
    {
      key: 'print',
      label: 'Print',
      icon: FaPrint,
      onSelect: onPrint,
    },
    {
      key: 'download',
      label: 'Download',
      icon: FaDownload,
      onSelect: onDownload,
    },
    {
      key: 'forward-as-attachment',
      label: 'Forward as Attachment',
      icon: MdAttachEmail,
      onSelect: onForwardAsAttachment,
    },
    {
      key: 'window',
      label: 'View in Window',
      icon: FaExternalLinkAlt,
      onSelect: onViewInWindow,
    },
    {
      key: 'raw',
      label: 'Raw Email',
      icon: FaExternalLinkAlt,
      onSelect: onViewInRaw,
    },
    {
      key: 'edit-as-new',
      label: 'Edit as New',
      icon: FaRotateRight, // Or a suitable icon like MdOutlineContentCopy
      onSelect: onEditAsNew, // We will add this prop
    },
    {
      key: 'save-template',
      label: 'Save as Template',
      icon: MdSaveAs,
      onSelect: onSaveAsTemplate,
    },
    {
      key: 'save-contact',
      label: 'Save as Contact',
      icon: MdPersonAdd,
      onSelect: onSaveAsContact,
    },
  ];

  useEffect(() => {
    if (showBackButton) {
      setDisableButton(false);
      return;
    }
    if (splitView == false) {
      setDisableButton(false);
    } else if (splitView && selectedCount == 0) {
      setDisableButton(false);
    } else {
      setDisableButton(true);
    }
  }, [splitView, selectedCount, showBackButton]);

  return (
    <>
      {showBackButton ? (
        // Single Email View - Mobile Optimized
        <div className="border-b border-[var(--accent-6)] bg-[var(--accent-1)] p-2">
          {/* Mobile Layout */}

          {/* <Button
            title="Go back"
            aria-label="Close email"
            variant="outline"
            size="2"
            onClick={onBack}
            style={{ gap: '0.5rem' }}
          >
            <FaArrowLeft size={14} />
          </Button> */}
          <div className="flex md:hidden items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors"
            >
              <FaArrowLeft size={14} />
              Back
            </button>

            <div className="flex items-center gap-1">
              {show_reply_button && (
                <>
                  <button
                    onClick={onReply}
                    className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors"
                    title="Reply"
                  >
                    <FaReply size={16} />
                  </button>
                  <button
                    onClick={onReplyAll}
                    className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors"
                    title="Reply All"
                  >
                    <FaReplyAll size={16} />
                  </button>
                </>
              )}
              {show_forward_button && (
                <button
                  onClick={onForward}
                  className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors"
                  title="Forward"
                >
                  <FaShare size={16} />
                </button>
              )}

              <button
                onClick={onPrevEmail}
                disabled={!hasPrevEmail}
                className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors disabled:opacity-50"
                title="Previous"
              >
                <FaAngleLeft size={16} />
              </button>
              <button
                onClick={onNextEmail}
                disabled={!hasNextEmail}
                className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors disabled:opacity-50"
                title="Next"
              >
                <FaAngleRight size={16} />
              </button>

              <DropdownWrapper
                items={singleEmailDropdownItems}
                trigger={
                  <button className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors">
                    <FaEllipsisH size={16} />
                  </button>
                }
              />
            </div>
          </div>

          {/* Desktop Layout - Original */}
          <div className=" w-full flex items-center gap-2 overflow-x-auto ">
            {splitView && (
              <div className={disableButton ? ' w-[80%]' : 'w-1/2'}>
                <div className="hidden md:flex items-center gap-2">
                  {!showBackButton && (
                    <>
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAllToggle}
                        style={{
                          opacity: isPartialSelected ? 0.5 : 1,
                        }}
                      />

                      {hasSelection && (
                        <Text size="2" color="gray">
                          {selectedCount} selected
                        </Text>
                      )}

                      <Separator orientation="vertical" style={{ height: '1.5rem' }} />
                    </>
                  )}

                  {!showBackButton && (
                    <Flex align="center" gap="2" justify="between" style={{ flexGrow: 1 }}>
                      <Flex align="center" gap="1">
                        {hasSelection && (
                          <>
                            {show_delete_button && (
                              <Button
                                variant="soft"
                                size="2"
                                onClick={onDelete}
                                disabled={!hasSelection}
                                title="Delete"
                              >
                                <FaTrash />
                              </Button>
                            )}

                            {(show_mark_as_read_button || show_mark_as_unread_button) && (
                              <Button
                                variant="soft"
                                size="2"
                                onClick={() => onMarkAsRead(isSeen)}
                                title={isSeen ? 'Mark as Unread' : 'Mark as Read'}
                              >
                                {isSeen ? (
                                  <MdMarkEmailUnread size={16} />
                                ) : (
                                  <MdMarkEmailRead size={16} />
                                )}
                              </Button>
                            )}

                            <Button
                              variant="soft"
                              size="2"
                              onClick={() => {}}
                              title={
                                folderName === 'Junk' || folderName === 'Spam'
                                  ? 'Mark as Not Spam'
                                  : 'Mark as Spam'
                              }
                            >
                              {folderName === 'Junk' || folderName === 'Spam' ? (
                                'Not Spam'
                              ) : (
                                <RiSpam2Line size={16} />
                              )}
                            </Button>

                            <Button variant="soft" size="2" onClick={handleMoveClick} title="Move">
                              <MdDriveFileMoveOutline size={16} />
                            </Button>

                            <Button
                              variant="soft"
                              size="2"
                              onClick={handleCopyClick}
                              title="Copy"
                              disabled={isQuotaExceeded}
                              className={isQuotaExceeded ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <MdContentCopy size={16} />
                            </Button>

                            <Button
                              variant="soft"
                              size="2"
                              onClick={() => onFlagged(isFlagged)}
                              title={isFlagged ? 'Flag' : 'Unflag'}
                            >
                              {isFlagged ? <LuFlagOff size={16} /> : <FaRegFlag size={16} />}
                            </Button>
                          </>
                        )}

                        <Button
                          variant="soft"
                          size="2"
                          onClick={onRefresh}
                          disabled={isRefreshing}
                          style={{ gap: '0.5rem' }}
                        >
                          <FaRotateRight
                            style={{
                              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                            }}
                          />
                        </Button>
                      </Flex>

                      {/* <Flex align="center" gap="3">
                      <Text size="1" color="gray">
                        Page {currentPage} of {total_pages} • {total_count} emails
                      </Text>
                      <Flex gap="1">
                        <Button
                          variant="soft"
                          size="2"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          aria-label="Previous Page"
                        >
                          <FaAngleLeft />
                        </Button>
                        <Button
                          variant="soft"
                          size="2"
                          onClick={handleNextPage}
                          disabled={currentPage === total_pages}
                          aria-label="Next Page"
                        >
                          <FaAngleRight />
                        </Button>
                      </Flex>
                    </Flex> */}
                      <Pagination
                        currentPage={currentPage}
                        totalPages={total_pages}
                        totalCount={total_count}
                        onPageChange={onPageChange}
                      />
                    </Flex>
                  )}

                  {showBackButton && (
                    <Button
                      variant="soft"
                      size="2"
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      style={{ gap: '0.5rem' }}
                    >
                      <FaRotateRight
                        style={{
                          animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                        }}
                      />
                    </Button>
                  )}

                  {showBackButton && (
                    <div className="flex flex-grow justify-end">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={total_pages}
                        totalCount={total_count}
                        onPageChange={onPageChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="hidden md:flex items-center gap-2">
              {!splitView && (
                <Button variant="outline" size="2" onClick={onBack} style={{ gap: '0.5rem' }}>
                  <FaArrowLeft />
                </Button>
              )}

              <Separator orientation="vertical" style={{ height: '1.5rem' }} />

              <Flex gap="1">
                {show_reply_button && (
                  <>
                    <Button variant="soft" size="2" onClick={onReply} title="Reply">
                      <FaReply size={16} />
                    </Button>

                    <Button variant="soft" size="2" onClick={onReplyAll} title="Reply All">
                      <FaReplyAll size={16} />
                    </Button>
                  </>
                )}
                {show_forward_button && (
                  <Button variant="soft" size="2" onClick={onForward} title="Forward">
                    <FaShare size={16} />
                  </Button>
                )}

                <Separator orientation="vertical" style={{ height: '1.5rem' }} />
                {!disableButton && (
                  <>
                    {show_delete_button && (
                      <Button variant="soft" size="2" onClick={onDelete} title="Delete">
                        <FaTrash />
                      </Button>
                    )}
                    {(show_mark_as_read_button || show_mark_as_unread_button) && (
                      <Button
                        variant="soft"
                        size="2"
                        onClick={() => onMarkAsRead(isSeen)}
                        title={isSeen ? 'Mark as Unread' : 'Mark as Read'}
                      >
                        {isSeen ? <MdMarkEmailUnread size={16} /> : <MdMarkEmailRead size={16} />}
                      </Button>
                    )}

                    <Button
                      variant="soft"
                      size="2"
                      onClick={() => {}}
                      title={
                        folderName === 'Junk' || folderName === 'Spam'
                          ? 'Mark as Not Spam'
                          : 'Mark as Spam'
                      }
                    >
                      {folderName === 'Junk' || folderName === 'Spam' ? (
                        'Not Spam'
                      ) : (
                        <RiSpam2Line size={16} />
                      )}
                    </Button>

                    <Button
                      variant="soft"
                      size="2"
                      onClick={handleMoveClick}
                      title="Move"
                      disabled={isQuotaExceeded}
                      className={isQuotaExceeded ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <MdDriveFileMoveOutline size={16} />
                    </Button>

                    <Button
                      variant="soft"
                      size="2"
                      onClick={handleCopyClick}
                      title="Copy"
                      disabled={isQuotaExceeded}
                      className={isQuotaExceeded ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <MdContentCopy size={16} />
                    </Button>
                    <Button
                      variant="soft"
                      size="2"
                      onClick={() => onFlagged(isFlagged)}
                      title={isFlagged ? 'Unflag' : 'Flag'}
                    >
                      {isFlagged ? <LuFlagOff size={16} /> : <FaRegFlag size={16} />}
                    </Button>
                  </>
                )}

                <DropdownWrapper
                  items={[
                    {
                      key: 'print',
                      label: 'Print',
                      icon: FaPrint,
                      onSelect: onPrint,
                    },
                    {
                      key: 'download',
                      label: 'Download (.eml)',
                      icon: FaDownload,
                      onSelect: onDownload,
                    },
                    {
                      key: 'forward-as-attachment',
                      label: 'Forward as Attachment',
                      icon: MdAttachEmail,
                      onSelect: () => onForwardAsAttachment?.(),
                    },
                    {
                      key: 'window',
                      label: 'View ',
                      icon: FaExternalLinkAlt,
                      onSelect: onViewInWindow,
                    },
                    {
                      key: 'raw',
                      label: 'Raw Email',
                      icon: FaExternalLinkAlt,
                      onSelect: onViewInRaw,
                    },
                    {
                      key: 'edit-as-new',
                      label: 'Edit as New',
                      icon: FaRotateRight, // Or a suitable icon like MdOutlineContentCopy
                      onSelect: onEditAsNew, // We will add this prop
                    },
                    {
                      key: 'save-template',
                      label: 'Save as Template',
                      icon: MdSaveAs,
                      onSelect: onSaveAsTemplate,
                    },
                    {
                      key: 'save-contact',
                      label: 'Save as Contact',
                      icon: MdPersonAdd,
                      onSelect: onSaveAsContact,
                    },
                  ]}
                  trigger={
                    <Button variant="soft" size="2" title="More actions">
                      <FaEllipsisVertical size={16} />
                    </Button>
                  }
                />

                <Flex gap="1">
                  <Button
                    variant="soft"
                    size="2"
                    onClick={onPrevEmail}
                    disabled={!hasPrevEmail}
                    title="Previous email"
                  >
                    <FaAngleLeft size={16} />
                  </Button>
                  <Button
                    variant="soft"
                    size="2"
                    onClick={onNextEmail}
                    disabled={!hasNextEmail}
                    title="Next email"
                  >
                    <FaAngleRight size={16} />
                  </Button>
                </Flex>
              </Flex>
            </div>
          </div>
        </div>
      ) : (
        // Email List View - Mobile Optimized
        <div className="border-b border-[var(--accent-6)] bg-[var(--accent-1)] p-2">
          {/* Mobile Layout */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAllToggle}
                style={{
                  opacity: isPartialSelected ? 0.5 : 1,
                }}
              />

              {hasSelection && (
                <span className="text-sm text-[var(--gray-11)]">{selectedCount} selected</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <FaRotateRight
                  size={16}
                  style={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
              </button>

              {hasSelection && (
                <DropdownWrapper
                  items={mobileDropdownItems}
                  trigger={
                    <button className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-lg transition-colors">
                      <FaEllipsisH size={16} />
                    </button>
                  }
                />
              )}
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="flex md:hidden items-center justify-between mt-2 pt-2 border-t border-[var(--gray-4)]">
            <span className="text-xs text-[var(--gray-11)]">{total_count} emails</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--gray-11)]">
                {currentPage}/{total_pages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-1.5 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded disabled:opacity-50 transition-colors"
                  aria-label="Previous Page"
                >
                  <FaAngleLeft size={14} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === total_pages}
                  className="p-1.5 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded disabled:opacity-50 transition-colors"
                  aria-label="Next Page"
                >
                  <FaAngleRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Layout - Original */}
          <div className="hidden md:flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAllToggle}
              style={{
                opacity: isPartialSelected ? 0.5 : 1,
              }}
            />

            {hasSelection && (
              <Text size="2" color="gray">
                {selectedCount} selected
              </Text>
            )}

            <Separator orientation="vertical" style={{ height: '1.5rem' }} />

            <Flex align="center" gap="2" justify="between" style={{ flexGrow: 1 }}>
              <Flex align="center" gap="1">
                {hasSelection && (
                  <>
                    {show_delete_button && (
                      <Button
                        variant="soft"
                        size="2"
                        onClick={onDelete}
                        disabled={!hasSelection}
                        title="Delete"
                      >
                        <FaTrash />
                      </Button>
                    )}
                    {(show_mark_as_read_button || show_mark_as_unread_button) && (
                      <Button
                        variant="soft"
                        size="2"
                        onClick={() => onMarkAsRead(isSeen)}
                        title={isSeen ? 'Mark as Unread' : 'Mark as Read'}
                      >
                        {isSeen ? <MdMarkEmailUnread size={16} /> : <MdMarkEmailRead size={16} />}
                      </Button>
                    )}

                    <Button
                      variant="soft"
                      size="2"
                      onClick={() => {}}
                      title={
                        folderName === 'Junk' || folderName === 'Spam'
                          ? 'Mark as Not Spam'
                          : 'Mark as Spam'
                      }
                    >
                      {folderName === 'Junk' || folderName === 'Spam' ? (
                        'Not Spam'
                      ) : (
                        <RiSpam2Line size={16} />
                      )}
                    </Button>

                    <Button
                      variant="soft"
                      size="2"
                      onClick={handleMoveClick}
                      title="Move"
                      disabled={isQuotaExceeded}
                      className={isQuotaExceeded ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <MdDriveFileMoveOutline size={16} />
                    </Button>

                    <Button
                      variant="soft"
                      size="2"
                      onClick={handleCopyClick}
                      title="Copy"
                      disabled={!hasSelection || isQuotaExceeded}
                      className={isQuotaExceeded ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <MdContentCopy size={16} />
                    </Button>

                    <Button
                      variant="soft"
                      size="2"
                      onClick={() => onFlagged(isFlagged)}
                      title={isFlagged ? 'Unflag' : 'Flag'}
                    >
                      {isFlagged ? <LuFlagOff size={16} /> : <FaRegFlag size={16} />}
                    </Button>
                  </>
                )}

                <Button
                  variant="soft"
                  size="2"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  style={{ gap: '0.5rem' }}
                >
                  <FaRotateRight
                    style={{
                      animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                </Button>
              </Flex>

              {/* <Flex align="center" gap="3">
                <Text size="1" color="gray">
                  Page {currentPage} of {total_pages} • {total_count} emails
                </Text>
                <Flex gap="1">
                  <Button
                    variant="soft"
                    size="2"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    aria-label="Previous Page"
                  >
                    <FaAngleLeft />
                  </Button>
                  <Button
                    variant="soft"
                    size="2"
                    onClick={handleNextPage}
                    disabled={currentPage === total_pages}
                    aria-label="Next Page"
                  >
                    <FaAngleRight />
                  </Button>
                </Flex>
              </Flex> */}
              <Pagination
                currentPage={currentPage}
                totalPages={total_pages}
                totalCount={total_count}
                onPageChange={onPageChange}
              />
            </Flex>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Move Dialog */}
      <FolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onFolderSelect={(folder) => handleFolderSelect(folder, 'move')}
        currentFolder={selectedFolder}
        title="Move to folder"
      />

      {/* Copy Dialog */}
      <FolderDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onFolderSelect={(folder) => handleFolderSelect(folder, 'copy')}
        currentFolder={selectedFolder}
        title="Copy to folder"
        isQuotaExceeded={isQuotaExceeded} // Pass quota status to dialog
      />
    </>
  );
};

export default EmailToolbar;
