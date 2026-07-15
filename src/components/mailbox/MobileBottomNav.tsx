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

import { FaInbox, FaPaperPlane, FaFileLines, FaTrash, FaPen } from 'react-icons/fa6';
import { useSetAtom, useAtomValue } from 'jotai';
import { composerOpenAtom } from '../../state/composer';
import { useNavigate, useRouterState, useParams } from '@tanstack/react-router';
import { userSettingsAtom } from '../../state/settings';
import { folderDetailsAtom } from '../../state/folders';
import { useEffect, useState } from 'react';

interface MobileBottomNavProps {
  onFolderClick?: () => void;
}

const MobileBottomNav = ({ onFolderClick }: MobileBottomNavProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const setOpenComposer = useSetAtom(composerOpenAtom);
  const navigate = useNavigate();
  const routerState = useRouterState();
  const userSettings = useAtomValue(userSettingsAtom);
  const folderData = useAtomValue(folderDetailsAtom);

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const { slug } = useParams({ strict: false });
  // Get current folder from URL
  const currentPath = routerState.location.pathname;
  const currentFolder = currentPath.split('/').pop() || 'INBOX';

  // Get unread counts
  const getUnreadCount = (folderName: string) => {
    if (!folderData) return 0;
    const folder = folderData.find((f: any) => f.folder_name === folderName);
    return folder?.unread_count || 0;
  };

  const inboxCount = getUnreadCount('INBOX');
  const sentCount = getUnreadCount('Sent');
  const draftsCount = getUnreadCount('Draft');
  const trashCount = getUnreadCount('Trash');

  const handleNavClick = (folderPath: string) => {
    if (slug) {
      navigate({
        to: '/$slug/folder/$folder',
        params: { slug, folder: folderPath },
      });
    } else {
      navigate({ to: `/folder/${folderPath}` });
    }
    onFolderClick?.();
  };

  const isActive = (folderPath: string) => {
    return currentFolder === folderPath;
  };

  const { inbox, sent, drafts, trash } = userSettings?.folders ?? {};

  // Only show if folders are visible in settings
  const showInbox = inbox?.show_in_sidebar !== false;
  const showSent = sent?.show_in_sidebar !== false;
  const showDrafts = drafts?.show_in_sidebar !== false;
  const showTrash = trash?.show_in_sidebar !== false;

  return (
    <div
      className={`
          md:hidden fixed bottom-0 left-0 right-0 z-10
          transition-transform duration-300 ease-in-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
    >
      {/* Background with blur effect and rounded top */}
      <div className="absolute inset-0 bg-[var(--gray-1)]/95 backdrop-blur-lg rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" />

      {/* Navigation Content */}
      <div className="relative h-20 px-6 flex items-center justify-between">
        {/* Left Nav Items */}
        <div className="flex items-center gap-4">
          {/* Inbox */}
          {showInbox && (
            <button
              onClick={() => handleNavClick('INBOX')}
              className={`
                  flex flex-col items-center gap-1 min-w-[56px] py-2 px-3 rounded-2xl transition-all duration-200 relative
                  ${
                    isActive('INBOX')
                      ? 'text-[var(--accent-11)] bg-[var(--accent-3)] scale-105'
                      : 'text-[var(--gray-11)]'
                  }
                  active:scale-95
                `}
              aria-label="Inbox"
            >
              <div className="relative">
                <FaInbox size={22} />
                {inboxCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--accent-9)] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Inbox</span>
            </button>
          )}

          {/* Sent */}
          {showSent && (
            <button
              onClick={() => handleNavClick('Sent')}
              className={`
                  flex flex-col items-center gap-1 min-w-[56px] py-2 px-3 rounded-2xl transition-all duration-200 relative
                  ${
                    isActive('Sent')
                      ? 'text-[var(--accent-11)] bg-[var(--accent-3)] scale-105'
                      : 'text-[var(--gray-11)]'
                  }
                  active:scale-95
                `}
              aria-label="Sent"
            >
              <div className="relative">
                <FaPaperPlane size={20} />
                {sentCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--gray-9)] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {sentCount > 99 ? '99+' : sentCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Sent</span>
            </button>
          )}
        </div>

        {/* Center Compose Button - Elevated */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-[var(--accent-9)] rounded-full blur-xl opacity-30"></div>
            <button
              onClick={() => setOpenComposer(true)}
              className="
                  relative w-16 h-16 rounded-full
                  bg-gradient-to-br from-[var(--accent-9)] to-[var(--accent-10)]
                  hover:from-[var(--accent-10)] hover:to-[var(--accent-11)]
                  text-white shadow-2xl
                  flex items-center justify-center
                  transition-all duration-200
                  active:scale-95
                  ring-4 ring-[var(--gray-1)]
                "
              aria-label="Compose"
            >
              <FaPen size={20} />
            </button>
          </div>
        </div>

        {/* Right Nav Items */}
        <div className="flex items-center gap-4">
          {/* Drafts */}
          {showDrafts && (
            <button
              onClick={() => handleNavClick('Draft')}
              className={`
                  flex flex-col items-center gap-1 min-w-[56px] py-2 px-3 rounded-2xl transition-all duration-200 relative
                  ${
                    isActive('Draft')
                      ? 'text-[var(--accent-11)] bg-[var(--accent-3)] scale-105'
                      : 'text-[var(--gray-11)]'
                  }
                  active:scale-95
                `}
              aria-label="Drafts"
            >
              <div className="relative">
                <FaFileLines size={20} />
                {draftsCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--gray-9)] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {draftsCount > 99 ? '99+' : draftsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Drafts</span>
            </button>
          )}

          {/* Trash */}
          {showTrash && (
            <button
              onClick={() => handleNavClick('Trash')}
              className={`
                  flex flex-col items-center gap-1 min-w-[56px] py-2 px-3 rounded-2xl transition-all duration-200 relative
                  ${
                    isActive('Trash')
                      ? 'text-[var(--accent-11)] bg-[var(--accent-3)] scale-105'
                      : 'text-[var(--gray-11)]'
                  }
                  active:scale-95
                `}
              aria-label="Trash"
            >
              <div className="relative">
                <FaTrash size={20} />
                {trashCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--gray-9)] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {trashCount > 99 ? '99+' : trashCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">Trash</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;
