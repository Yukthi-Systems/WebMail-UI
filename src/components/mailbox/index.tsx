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

import { useState, useCallback, useRef } from 'react';
import Folders from './Folders';
import EmailList from './EmailList';
import Composer from '../composer';
import CreateFolder from './CreateFolder';
import ContactView from '../contacts';
import { viewContactModel } from '../../state/contact';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { composerOpenAtom } from '../../state/composer';
import { userSettingsAtom } from '../../state/settings';
import { sidebarCollapsedAtom, sidebarHoveredAtom } from '../../state/sidebar';
import { useMoveMail } from '../../hooks/useEmails';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateAnyFolderUnreadCount } from '../../hooks/useFolders';
import { useToast } from '../ui/ToastComponent';
import { useParams } from '@tanstack/react-router';
import { useWindowSize } from '../../hooks/useWindowSize';
import MobileBottomNav from './MobileBottomNav';
import { panelSizesAtom } from '../../state/resizable';
import ResizablePanel from '../common/ResizeblePanel';
import { useKeyboardNavigation } from '../../hooks/useKeyboardShortcuts';
import { usePanelSizes } from '../../hooks/usePanelSizes';

const Mailbox = () => {
  const sidebarCollapsed = useAtomValue(sidebarCollapsedAtom);
  const sidebarHovered = useAtomValue(sidebarHoveredAtom);
  const [clearSelectedEmail, setClearSelectedEmail] = useState<(() => void) | null>(null);
  // useRef instead of useState — storing a function in useState triggers React's
  // functional-update trap (it calls fn(prevState) instead of storing fn).
  const clearEmailSelectionRef = useRef<(() => void) | null>(null);
  const [viewContact] = useAtom(viewContactModel);
  const userSettings = useAtomValue(userSettingsAtom);
  const { show_sidebar = true } = userSettings?.ui ?? {};
  const setOpenComposer = useSetAtom(composerOpenAtom);
  const { folder } = useParams({ strict: false });
  const { mutate: moveMutate } = useMoveMail();
  const queryClient = useQueryClient();
  const toast = useToast();
  const updateAnyFolderUnreadCount = useUpdateAnyFolderUnreadCount();
  const { isMobile, isDesktop } = useWindowSize();
  const foldersRef = useRef<{ focusFirstFolder: () => void }>(null);
  const [draggedEmails, setDraggedEmails] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const { panelSizes, updatePanelSize } = usePanelSizes();

  const handleFolderClick = useCallback(() => {
    if (clearSelectedEmail) {
      clearSelectedEmail();
    }
  }, [clearSelectedEmail]);

  const handleDragStart = useCallback((emailIds: number[]) => {
    setDraggedEmails(emailIds);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEmails([]);
    setIsDragging(false);
  }, []);

  useKeyboardNavigation({
    onCompose: () => setOpenComposer(true),
  });

  const handleDropOnFolder = useCallback(
    (targetFolder: string) => {
      if (draggedEmails.length === 0 || !folder) return;

      if (targetFolder === folder) {
        handleDragEnd();
        return;
      }

      const folderDisplayName = targetFolder.split('/').pop() || targetFolder;
      const count = draggedEmails.length;
      const loadingId = toast.loading({
        description: `Moving ${count} email${count > 1 ? 's' : ''} to ${folderDisplayName}…`,
      });

      moveMutate(
        {
          path: folder,
          sourceFolder: folder,
          destFolder: targetFolder,
          body: draggedEmails,
        },
        {
          onSuccess: () => {
            // Compute unread delta from cached email pages before invalidating
            const cachedPages = queryClient.getQueriesData<any>({ queryKey: ['folder', folder] });
            let unreadMoved = 0;
            for (const [, data] of cachedPages) {
              const raw = data?.emails;
              if (!raw) continue;
              const emails: any[] = Array.isArray(raw) ? raw : Object.values(raw);
              unreadMoved += emails.filter(
                (e: any) => draggedEmails.includes(Number(e.id)) && !e.FLAGS?.includes('\\Seen')
              ).length;
            }

            // Clear selection before invalidating so the refetch render sees no stale IDs
            clearEmailSelectionRef.current?.();
            handleDragEnd();

            // Update both source and destination folder counts locally
            if (unreadMoved > 0) {
              updateAnyFolderUnreadCount(folder, -unreadMoved);
              updateAnyFolderUnreadCount(targetFolder, unreadMoved);
            }

            toast.dismiss(loadingId);
            toast.success({
              description: `${count} email${count > 1 ? 's' : ''} moved to ${folderDisplayName}`,
            });

            queryClient.invalidateQueries({ queryKey: ['folder', folder] });
          },
          onError: (error: any) => {
            toast.dismiss(loadingId);
            toast.error({
              description: error.message || 'Failed to move emails',
            });
            handleDragEnd();
          },
        }
      );
    },
    [
      draggedEmails,
      folder,
      moveMutate,
      queryClient,
      toast,
      handleDragEnd,
      updateAnyFolderUnreadCount,
    ]
  );

  const handleFocusFolders = useCallback(() => {
    if (foldersRef.current) {
      foldersRef.current.focusFirstFolder();
    }
  }, []);

  const handleFolderSizeChange = useCallback(
    (size: number) => {
      // Use the hook's updater function
      updatePanelSize('folderEmailSplit', size);
    },
    [updatePanelSize]
  );

  // We only use the Resizable Layout if the sidebar is pinned open (User specifically wanted it open)
  // If it's collapsed, we use a static layout where hover actions float over content.
  const useResizableLayout = show_sidebar && isDesktop && !sidebarCollapsed;

  const isExpanded = !sidebarCollapsed || sidebarHovered;

  return (
    <>
      <div className="flex h-full w-full overflow-x-hidden bg-[var(--gray-1)]">
        {/* Resizable Folders + Email List */}
        {useResizableLayout ? (
          <ResizablePanel
            direction="horizontal"
            defaultSize={panelSizes.folderEmailSplit}
            minSize={16}
            minPixelSize={270}
            maxSize={24}
            onSizeChange={handleFolderSizeChange}
          >
            <div className="h-full">
              <Folders
                ref={foldersRef}
                onFolderClick={handleFolderClick}
                onDropOnFolder={handleDropOnFolder}
                isDragging={isDragging}
              />
            </div>
            <div className="h-full">
              <EmailList
                onRegisterClearCallback={setClearSelectedEmail}
                onRegisterClearSelectionCallback={(fn) => {
                  clearEmailSelectionRef.current = fn;
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onFocusFolders={handleFocusFolders}
              />
            </div>
          </ResizablePanel>
        ) : (
          <>
            {show_sidebar && (
              <div
                // If we are on desktop and sidebar is collapsed, this container maintains
                // the w-14 "gap" in the document flow so adjacent content doesn't shift.
                // The Folder component inside will become absolute/fixed when hovered.
                className={`flex-shrink-0 relative h-full ${isDesktop && sidebarCollapsed ? 'w-14' : ''}`}
              >
                <Folders
                  ref={foldersRef}
                  onFolderClick={handleFolderClick}
                  onDropOnFolder={handleDropOnFolder}
                  isDragging={isDragging}
                />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <EmailList
                onRegisterClearCallback={setClearSelectedEmail}
                onRegisterClearSelectionCallback={(fn) => {
                  clearEmailSelectionRef.current = fn;
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onFocusFolders={handleFocusFolders}
              />
            </div>
          </>
        )}

        <MobileBottomNav onFolderClick={handleFolderClick} />

        <Composer />
        <CreateFolder />
        {viewContact && <ContactView />}
        <div className="md:hidden h-20" />
      </div>
    </>
  );
};

export default Mailbox;
