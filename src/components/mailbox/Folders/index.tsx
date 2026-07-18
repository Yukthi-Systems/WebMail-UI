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

// src/components/layout/Folders.tsx
import {
  FaInbox,
  FaPaperPlane,
  FaFileLines,
  FaTriangleExclamation,
  FaTrash,
  FaPlus,
  FaRotateRight,
} from 'react-icons/fa6';
import DefaultFolder from './DefaultFolder';
import CustomFolder from './CustomFolder';
import { composerOpenAtom, createFolderOpenAtom } from '../../../state/composer';
import { useSetAtom, useAtom, useAtomValue } from 'jotai';
import {
  useCreateEmailFolder,
  useDeleteEmailFolder,
  useEditEmailFolder,
} from '../../../hooks/useEmails';
import { useToast } from '../../../hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useFoldersFullPath } from '../../../hooks/useFolders';
import { sidebarCollapsedAtom, sidebarHoveredAtom, sidebarPinnedAtom } from '../../../state/sidebar';
import { buildFolderTree, type FolderNode } from '../../../utils/folderTree';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { folderDetailsAtom, folderQuotaAtom } from '../../../state/folders';
import StorageQuota from '../../common/StorageQuota';
import { userSettingsAtom } from '../../../state/settings';
import ComposeButton, { type ComposeButtonStyle } from './ComposeButton';
import { sortFoldersAscending } from '../../../utils/folderUtils';

interface FoldersProps {
  onFolderClick?: () => void;
  onDropOnFolder?: (folderPath: string) => void;
  isDragging?: boolean;
}

// The initial value (default/order) and the value computed once folderData
// arrives (unread_count/visible) are different shapes — all fields optional
// to fit both.
interface DefaultFolderState {
  name: string;
  path: string;
  default?: boolean;
  order?: number;
  unread_count?: number;
  visible?: boolean;
}

interface DefaultFoldersMap {
  inbox: DefaultFolderState;
  drafts: DefaultFolderState;
  sent: DefaultFolderState;
  spam: DefaultFolderState;
  trash: DefaultFolderState;
}

const Folders = forwardRef<{ focusFirstFolder: () => void }, FoldersProps>(
  ({ onFolderClick, onDropOnFolder, isDragging = false }, ref) => {
    const setOpenComposer = useSetAtom(composerOpenAtom);
    const setOpen = useSetAtom(createFolderOpenAtom);
    const toast = useToast();
    const queryClient = useQueryClient();

    // State & Atoms
    const folderData = useAtomValue(folderDetailsAtom);
    const userSettings = useAtomValue(userSettingsAtom);
    const folderQuota = useAtomValue(folderQuotaAtom);
    const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
    const [sidebarHovered, setSidebarHovered] = useAtom(sidebarHoveredAtom);
    const [sidebarPinned] = useAtom(sidebarPinnedAtom); // Read-only now
    const composeButtonVariant = (userSettings?.ui?.compose_button_style ||
      'default') as ComposeButtonStyle;
    // Tree State
    const [fullFolderTree, setFullFolderTree] = useState<FolderNode[]>([]);
    const [customFoldersTree, setCustomFoldersTree] = useState<FolderNode[]>([]);

    const { refetch: refetchFolders, isRefetching: isFoldersRefetching } = useFoldersFullPath();

    // UI State
    const [isMobile, setIsMobile] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const mouseLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isHoveringCollapsed, setIsHoveringCollapsed] = useState(false);

    const { drafts, inbox, sent, spam, trash } = userSettings?.folders ?? {};
    const hoverExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [defaultFolders, setDefaultFolders] = useState<DefaultFoldersMap>({
      inbox: { name: 'Inbox', path: 'INBOX', default: true, order: 0 },
      drafts: { name: 'Drafts', path: 'Drafts', default: true, order: 2 },
      sent: { name: 'Sent', path: 'Sent', default: true, order: 2 },
      spam: { name: 'Spam', path: 'Spam', default: true, order: 2 },
      trash: { name: 'Trash', path: 'Trash', default: true, order: 2 },
    });

    const { mutate: EditEmail } = useEditEmailFolder();
    const { mutate: DeleteEmail } = useDeleteEmailFolder();
    const { mutate: CreateEmailFolder } = useCreateEmailFolder();

    // Expose focus method
    useImperativeHandle(ref, () => ({
      focusFirstFolder: () => {
        const firstFolder = document.querySelector('[data-folder-item]') as HTMLElement;
        if (firstFolder) {
          firstFolder.focus();
        }
      },
    }));

    // --- Keyboard Navigation ---
    useEffect(() => {
      const handleFolderKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isFolderButton = target.closest('[data-folder-item]');
        if (!isFolderButton) return;

        const allFolders = Array.from(document.querySelectorAll('[data-folder-item]'));
        const currentIndex = allFolders.indexOf(isFolderButton);

        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          e.stopPropagation();
          const nextIndex = Math.min(currentIndex + 1, allFolders.length - 1);
          (allFolders[nextIndex] as HTMLElement)?.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          e.stopPropagation();
          const prevIndex = Math.max(currentIndex - 1, 0);
          (allFolders[prevIndex] as HTMLElement)?.focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          (isFolderButton as HTMLElement).click();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          (isFolderButton as HTMLElement).blur();
        }
      };

      window.addEventListener('keydown', handleFolderKeyDown, true);
      return () => window.removeEventListener('keydown', handleFolderKeyDown, true);
    }, []);

    // --- Mobile & Title Logic ---
    useEffect(() => {
      const checkMobile = () => {
        const mobile = window.innerWidth < 768;
        const wasDesktop = !isMobile && isMobile !== mobile;
        setIsMobile(mobile);
        if (mobile && wasDesktop && !sidebarCollapsed) {
          setSidebarCollapsed(true);
        }
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, [isMobile, sidebarCollapsed, setSidebarCollapsed]);

    useEffect(() => {
      const appName = 'Mail Service 25';
      if (folderData && Array.isArray(folderData)) {
        const inbox = folderData.find((f) => f.folder_name === 'INBOX');
        const count = inbox?.unread_count || 0;
        document.title = count > 0 ? `(${count}) ${appName}` : appName;
      } else {
        document.title = appName;
      }
      return () => {
        document.title = appName;
      };
    }, [folderData]);

    // --- Sidebar Hover Logic (Only if pinned) ---
    const handleMouseEnter = () => {
      if (isMobile) return;
      if (!sidebarPinned) return;
      if (sidebarCollapsed) setIsHoveringCollapsed(true);

      if (mouseLeaveTimeoutRef.current) {
        clearTimeout(mouseLeaveTimeoutRef.current);
        mouseLeaveTimeoutRef.current = null;
      }

      if (sidebarCollapsed) {
        hoverExpandTimerRef.current = setTimeout(() => {
          setSidebarHovered(true);
        }, 1500); // 2s delay
      }
    };

    const handleMouseLeave = (event: React.MouseEvent) => {
      setIsHoveringCollapsed(false);
      // Cancel pending expand if cursor leaves before 2s
      if (hoverExpandTimerRef.current) {
        clearTimeout(hoverExpandTimerRef.current);
        hoverExpandTimerRef.current = null;
      }

      if (isDropdownOpen) return;
      const relatedTarget = event.relatedTarget as Element;
      if (relatedTarget && relatedTarget.closest('[role="menu"]')) return;

      if (sidebarCollapsed) {
        mouseLeaveTimeoutRef.current = setTimeout(() => {
          setSidebarHovered(false);
        }, 100);
      }
    };

    const isExpanded = !sidebarCollapsed || sidebarHovered;
    const isFloating = !isMobile && sidebarCollapsed && sidebarHovered;

    // --- MAIN FOLDER TREE LOGIC ---
    useEffect(() => {
      if (folderData && Array.isArray(folderData)) {
        const folders = folderData;
        const folderSettings = userSettings?.folders || {};

        const isFolderVisible = (folderPath: string, delimiter: string = '.'): boolean => {
          const parts = folderPath.split(delimiter);
          let currentPath = '';

          for (let i = 0; i < parts.length; i++) {
            currentPath = i === 0 ? parts[0] : currentPath + delimiter + parts[i];
            const settings = folderSettings[currentPath];

            if (settings?.show_in_sidebar === false) {
              return false;
            }
          }
          return true;
        };

        const resolveFolderWithFlag = (flag: string, preferredName: string) => {
          const withFlag = folders.filter((f) => f.flags?.includes(flag));
          if (withFlag.length === 1) return withFlag[0];
          if (withFlag.length > 1) {
            return withFlag.find((f) => f.folder_name === preferredName) || withFlag[0];
          }
          return folders.find((f) => f.folder_name === preferredName);
        };

        const inboxFolder = folders.find((f) => f.folder_name === 'INBOX');
        const sentFolder = resolveFolderWithFlag('Sent', 'Sent');
        const draftsFolder = resolveFolderWithFlag('Drafts', 'Drafts');
        const spamFolder =
          resolveFolderWithFlag('Junk', 'spam') ||
          resolveFolderWithFlag('Spam', 'Spam') ||
          folders.find((f) => f.folder_name.toLowerCase() === 'spam');
        const trashFolder = resolveFolderWithFlag('Trash', 'Trash');

        const updatedDefaults = {
          inbox: {
            name: inboxFolder?.folder_name || 'INBOX',
            path: inboxFolder?.folder_name || 'INBOX',
            unread_count: inboxFolder?.unread_count || 0,
            visible: isFolderVisible(inboxFolder?.folder_name || 'INBOX', inboxFolder?.delimiter),
          },
          drafts: {
            name: draftsFolder?.folder_name || 'Drafts',
            path: draftsFolder?.folder_name || 'Drafts',
            unread_count: draftsFolder?.unread_count || 0,
            visible: isFolderVisible(
              draftsFolder?.folder_name || 'Drafts',
              draftsFolder?.delimiter
            ),
          },
          sent: {
            name: sentFolder?.folder_name || 'Sent',
            path: sentFolder?.folder_name || 'Sent',
            unread_count: sentFolder?.unread_count || 0,
            visible: isFolderVisible(sentFolder?.folder_name || 'Sent', sentFolder?.delimiter),
          },
          spam: {
            name: spamFolder?.folder_name || 'Spam',
            path: spamFolder?.folder_name || 'Spam',
            unread_count: spamFolder?.unread_count || 0,
            visible: isFolderVisible(spamFolder?.folder_name || 'Spam', spamFolder?.delimiter),
          },
          trash: {
            name: trashFolder?.folder_name || 'Trash',
            path: trashFolder?.folder_name || 'Trash',
            unread_count: trashFolder?.unread_count || 0,
            visible: isFolderVisible(trashFolder?.folder_name || 'Trash', trashFolder?.delimiter),
          },
        };

        setDefaultFolders(updatedDefaults);

        const defaultPaths = Object.values(updatedDefaults).map((d) => d.path);

        const visibleFolders = folders.filter((f) => {
          return isFolderVisible(f.folder_name, f.delimiter);
        });

        const builtTree = buildFolderTree(visibleFolders);
        setFullFolderTree(builtTree);

        const filteredCustomTree = builtTree.filter((node) => {
          return !defaultPaths.includes(node.path);
        });

        setCustomFoldersTree(sortFoldersAscending(filteredCustomTree));
      }
    }, [folderData, userSettings?.folders]);

    useEffect(() => {
      return () => {
        if (mouseLeaveTimeoutRef.current) clearTimeout(mouseLeaveTimeoutRef.current);
        if (hoverExpandTimerRef.current) clearTimeout(hoverExpandTimerRef.current);
      };
    }, []);

    const getNodeByPath = (path: string | undefined) => {
      if (!path) return undefined;
      return fullFolderTree.find((node) => node.path === path);
    };

    const handleDelete = (folderPath: string) => {
      const loadingId = toast.loading({ description: 'Deleting folder…' });
      DeleteEmail(
        { path: folderPath },
        {
          onSuccess: () => {
            toast.dismiss(loadingId);
            toast.success({ description: 'Folder deleted.' });
            queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error.message || 'Failed to delete folder.' });
          },
        }
      );
    };

    const handleEdit = (oldPath: string, newName: string) => {
      const delimiter = folderData.find((f) => f.folder_name === oldPath)?.delimiter || '.';
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf(delimiter));
      const newPath = parentPath ? `${parentPath}${delimiter}${newName}` : newName;

      const loadingId = toast.loading({ description: 'Renaming folder…' });
      EditEmail(
        { newpath: newPath, oldpath: oldPath },
        {
          onSuccess: () => {
            toast.dismiss(loadingId);
            toast.success({ description: 'Folder renamed.' });
            queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error.message || 'Failed to rename folder.' });
          },
        }
      );
    };

    const handleCreateFolder = (parentPath: string, newFolderName: string) => {
      const delimiter = folderData.find((f) => f.folder_name === parentPath)?.delimiter || '.';
      const fullPath = `${parentPath}${delimiter}${newFolderName}`;

      const loadingId = toast.loading({ description: 'Creating folder…' });
      CreateEmailFolder(
        { path: fullPath },
        {
          onSuccess: () => {
            toast.dismiss(loadingId);
            toast.success({ description: 'Folder created.' });
            queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
          },
          onError: (error) => {
            toast.dismiss(loadingId);
            toast.error({ description: error.message || 'Failed to create folder.' });
          },
        }
      );
    };

    if (!folderData) {
      return (
        <div
          className={`${
            isMobile && isExpanded
              ? 'fixed top-0 left-0 z-50 w-64'
              : isExpanded
                ? 'w-[280px]'
                : 'w-14'
          } h-full bg-[var(--gray-1)] border-r border-[var(--gray-4)]`}
        >
          <div className="p-3">
            <div className="text-sm text-[var(--gray-11)]">Loading...</div>
          </div>
        </div>
      );
    }

    const defaultFoldersList = [
      { key: 'inbox', icon: FaInbox, config: inbox, data: defaultFolders.inbox },
      { key: 'sent', icon: FaPaperPlane, config: sent, data: defaultFolders.sent },
      { key: 'drafts', icon: FaFileLines, config: drafts, data: defaultFolders.drafts },
      { key: 'spam', icon: FaTriangleExclamation, config: spam, data: defaultFolders.spam },
      { key: 'trash', icon: FaTrash, config: trash, data: defaultFolders.trash },
    ];

    return (
      <>
        {isMobile && isExpanded && (
          <div
            className="fixed inset-0 bg-black/40 bg-opacity-50 z-40"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        <div
          className={`
            flex flex-col h-full bg-[var(--gray-1)] border-r border-[var(--gray-4)] transition-all duration-300 ease-in-out
            ${isDragging ? 'pointer-events-auto' : ''}
            ${
              isMobile && isExpanded
                ? 'fixed top-0 left-[46px] z-50 w-64 min-w-[150px] max-w-[90vw] shadow-lg'
                : isFloating
                  ? 'absolute top-0 left-0 z-50 w-[280px] shadow-xl'
                  : isExpanded
                    ? 'w-full min-w-[240px]'
                    : ` ${isMobile ? 'w-0' : 'w-14 min-w-14'}  `
            }
          `}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Subtle progress bar shown while waiting for auto-expand */}
          {isHoveringCollapsed && !sidebarHovered && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                zIndex: 60,
                background: 'var(--gray-4)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--accent-9)',
                  animation: 'sidebar-hover-progress 1.5s linear forwards',
                }}
              />
            </div>
          )}
          <div className={`flex-1 flex flex-col overflow-hidden`}>
            {/* Compose Button */}
            <div className={`${isExpanded ? 'p-3' : 'p-2'} pb-3`}>
              <ComposeButton
                variant={composeButtonVariant}
                isExpanded={isExpanded}
                onClick={() => setOpenComposer(true)}
              />
            </div>
            {/* Default Folders */}
            {/* 2. Unified Scroll Area: Default + Custom Folders */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
              {/* Default Folders Group */}
              <div className="px-3 pb-3">
                <div className="flex flex-col gap-1 mt-2">
                  {defaultFoldersList.map(
                    ({ key, icon, config, data }) =>
                      config?.show_in_sidebar !== false && (
                        <DefaultFolder
                          key={key}
                          folder={data}
                          folderNode={getNodeByPath(data?.path)}
                          icon={icon}
                          onFolderClick={onFolderClick}
                          isCollapsed={!isExpanded}
                          count={data?.unread_count}
                          onDrop={onDropOnFolder}
                          isDragging={isDragging}
                          folderPops={config}
                          onAddFolder={handleCreateFolder}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      )
                  )}
                </div>
              </div>

              {/* Custom Folders Group */}
              <div className="px-3 pb-3">
                {isExpanded && (
                  <>
                    <div className="mx-1 h-px bg-[var(--gray-4)] mb-3" />
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium uppercase tracking-wider text-[var(--gray-11)] px-2">
                        Folders
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 rounded-md text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] transition-colors duration-150"
                          onClick={() => refetchFolders()}
                          title="Refresh folders"
                        >
                          <FaRotateRight
                            size={11}
                            className={isFoldersRefetching ? 'animate-spin' : ''}
                          />
                        </button>
                        <button
                          className="p-1 rounded-md text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] transition-colors duration-150"
                          onClick={() => setOpen(true)}
                          title="New folder"
                        >
                          <FaPlus size={12} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-0.5">
                  {customFoldersTree.map((folderNode) => (
                    <CustomFolder
                      key={folderNode.path}
                      folderNode={folderNode}
                      onFolderClick={onFolderClick}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onAddFolder={handleCreateFolder}
                      isCollapsed={!isExpanded}
                      onDropdownOpenChange={setIsDropdownOpen}
                      onDrop={onDropOnFolder}
                      isDragging={isDragging}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Storage Quota - Now at the bottom without pin button */}

          <div className="mb-2">
            <StorageQuota quota={folderQuota} isCollapsed={!isExpanded} />
          </div>
        </div>
      </>
    );
  }
);

Folders.displayName = 'Folders';

export default Folders;
