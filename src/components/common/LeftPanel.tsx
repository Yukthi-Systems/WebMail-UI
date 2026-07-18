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

// src/components/layout/LeftPanel.tsx
import { Link, useLocation } from '@tanstack/react-router';
import { FaMailBulk } from 'react-icons/fa';
import {
  HiOutlineUsers,
  HiOutlineVideoCamera,
  HiOutlineCog6Tooth,
  HiOutlineQuestionMarkCircle,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { sidebarCollapsedAtom } from '../../state/sidebar';
import { useEffect, useState, useRef, useCallback } from 'react';
import { folderDetailsAtom } from '../../state/folders';
import type { FolderDetail } from '../../state/folders';
import { userSettingsAtom } from '../../state/settings';
import { useSettingsBridge } from '../../hooks/useSettingsBridge';
import { leftNavHoverAtom, leftNavTourSeenAtom, leftNavVisibleAtom } from '../../state/leftNav';
import { useToast } from '../../hooks/useToast';
import { TourTip } from './TourTips';
import { getCompanySlugFromPath } from '../../utils/routeUtils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  matchPattern?: string;
}

const LeftNavigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [sidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  const [isMobile, setIsMobile] = useState(false);
  const folderDetails = useAtomValue(folderDetailsAtom);
  const [isVisible, setIsVisible] = useAtom(leftNavVisibleAtom);
  const [tourSeen, setTourSeen] = useAtom(leftNavTourSeenAtom);
  const [isHovered, setIsHovered] = useAtom(leftNavHoverAtom);
  const userSettings = useAtomValue(userSettingsAtom);
  const setUserSettings = useSetAtom(userSettingsAtom);
  const { updateSettings } = useSettingsBridge();
  const toast = useToast();

  // Draggable button state - Default 50% (center)
  const [buttonPosition, setButtonPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false); // Track if actually dragged
  const dragStartY = useRef(0);
  const dragStartPos = useRef(50);

  const unreadCountEmails = folderDetails?.reduce(
    (current: number, item: FolderDetail) => current + (item.unread_count ?? 0),
    0
  );

  // Sync with settings
  useEffect(() => {
    if (userSettings?.ui?.show_left_navigation !== undefined) {
      setIsVisible(userSettings.ui.show_left_navigation);
    }
    // Load saved button position, default to 50 (center)
    if (userSettings?.ui?.left_nav_button_position !== undefined) {
      setButtonPosition(userSettings.ui.left_nav_button_position);
    }
  }, [
    userSettings?.ui?.show_left_navigation,
    userSettings?.ui?.left_nav_button_position,
    setIsVisible,
  ]);

  // Mobile check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isSidebarExpandedOnMobile = isMobile && !sidebarCollapsed;

  const shouldShowPanel = isMobile ? isSidebarExpandedOnMobile : isVisible;

  // Derive company slug from URL — URL is the source of truth for company context
  const companySlug = getCompanySlugFromPath(currentPath);
  const p = companySlug ? `/${companySlug}` : '';

  const navigationItems: NavigationItem[] = [
    {
      id: 'mail',
      label: 'Mail',
      icon: FaMailBulk,
      path: `${p}/folder/INBOX`,
      matchPattern: `${p}/folder`,
      badge: unreadCountEmails,
    },
    { id: 'contacts', label: 'Contacts', icon: HiOutlineUsers, path: `${p}/contacts` },
    { id: 'video', label: 'Video', icon: HiOutlineVideoCamera, path: `${p}/video` },
    { id: 'settings', label: 'Settings', icon: HiOutlineCog6Tooth, path: `${p}/settings` },
    { id: 'help', label: 'Help', icon: HiOutlineQuestionMarkCircle, path: `${p}/help` },
  ];

  const toggleNavigation = async () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    if (userSettings) {
      try {
        const updatedSettings = {
          ...userSettings,
          ui: { ...userSettings.ui, show_left_navigation: newVisibility },
        };
        await updateSettings(updatedSettings);
        setUserSettings(updatedSettings);
        toast.success({ description: `Navigation panel ${newVisibility ? 'shown' : 'hidden'}` });
      } catch {
        toast.error({ description: 'Failed to save preference' });
        setIsVisible(!newVisibility);
      }
    }

    if (!tourSeen && !newVisibility) {
      setTourSeen(true);
    }
  };

  // Save button position to API
  const saveButtonPosition = useCallback(
    async (position: number) => {
      if (userSettings) {
        try {
          const updatedSettings = {
            ...userSettings,
            ui: { ...userSettings.ui, left_nav_button_position: position },
          };
          await updateSettings(updatedSettings);
          setUserSettings(updatedSettings);
        } catch (error) {
          console.error('Failed to save button position:', error);
        }
      }
    },
    [userSettings, updateSettings, setUserSettings]
  );

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setHasMoved(false); // Reset movement tracker
      dragStartY.current = e.clientY;
      dragStartPos.current = buttonPosition;
    },
    [buttonPosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setHasMoved(false); // Reset movement tracker
      dragStartY.current = e.touches[0].clientY;
      dragStartPos.current = buttonPosition;
    },
    [buttonPosition]
  );

  useEffect(() => {
    if (!isDragging) return;

    const DRAG_THRESHOLD = 5; // pixels - must move this much to count as drag

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragStartY.current;

      // Only treat as drag if moved more than threshold
      if (Math.abs(deltaY) > DRAG_THRESHOLD) {
        setHasMoved(true);
      }

      if (Math.abs(deltaY) > DRAG_THRESHOLD) {
        const viewportHeight = window.innerHeight;
        const deltaPercent = (deltaY / viewportHeight) * 100;

        let newPosition = dragStartPos.current + deltaPercent;
        newPosition = Math.max(10, Math.min(90, newPosition));

        setButtonPosition(newPosition);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      // Only save if actually dragged
      if (hasMoved) {
        saveButtonPosition(buttonPosition);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, buttonPosition, hasMoved, saveButtonPosition]);

  if (isMobile && sidebarCollapsed) {
    return null;
  }

  return (
    <>
      {/* HIDDEN STATE - Desktop Only */}
      {!shouldShowPanel && !isMobile && (
        <div
          className="fixed left-0 z-[200]"
          style={{
            top: `${buttonPosition}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <TourTip
            id="sidebar-collapsed-nav"
            title="Navigation Panel Hidden"
            description="Click to expand. Drag to reposition."
            placement="right"
            autoShow={!isVisible && !isMobile}
            delay={500}
          >
            <button
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onClick={() => {
                // Only toggle if not dragging AND didn't move (was a click, not drag)
                if (!isDragging && !hasMoved) {
                  toggleNavigation();
                }
              }}
              onMouseEnter={() => !isDragging && setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`
                h-24 bg-[var(--gray-6)]/80 hover:bg-[var(--gray-5)]
                text-[var(--gray-11)] hover:text-[var(--gray-12)]
                rounded-r-full shadow-md hover:shadow-lg
                flex items-center justify-center
                transition-all duration-300 ease-out
                ${isHovered && !isDragging ? 'w-12 pl-2' : 'w-10'}
                ${isDragging ? 'cursor-grabbing shadow-2xl scale-110 w-12' : 'cursor-grab'}
                group
                ${!tourSeen && !isDragging ? 'animate-pulse' : ''}
              `}
              style={{
                animation: !tourSeen && !isDragging ? 'slideIn 0.5s ease-out' : undefined,
              }}
              aria-label="Show navigation"
              title="Click to expand, drag to move"
            >
              <HiChevronRight
                className={`w-5 h-5 transition-transform duration-300 ${
                  isHovered && !isDragging ? 'translate-x-1' : ''
                }`}
              />
            </button>
          </TourTip>
        </div>
      )}

      {/* VISIBLE STATE */}
      {shouldShowPanel && (
        <div
          className={`
            w-14 bg-[var(--gray-3)] border-r border-[var(--gray-5)] 
            flex flex-col h-full shrink-0 relative
            transition-all duration-300 ease-out
            ${isSidebarExpandedOnMobile ? 'z-[60]' : 'z-10'}
          `}
          style={{
            animation: !isMobile ? 'slideIn 0.3s ease-out' : undefined,
          }}
        >
          <nav className="flex-1 py-3">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const matchPath = item.matchPattern || item.path;
                const isActive = currentPath.startsWith(matchPath);

                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`
                      block w-full py-2 px-1 ml-1 mr-1 transition-all duration-200 group relative
                      ${
                        isActive
                          ? 'bg-[var(--gray-1)] text-[var(--accent-11)] rounded-l-[200px] border-r-0 mr-[-1px] z-10'
                          : 'text-[var(--gray-11)] hover:bg-[var(--gray-4)] hover:text-[var(--gray-12)] rounded-l-[200px]'
                      }
                    `}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 mx-auto" />
                    {item.badge !== undefined && item.badge > 0 && (
                      <div className="absolute top-1 right-3 w-2 h-2 bg-[var(--red-9)] rounded-full z-20" />
                    )}
                    {!isSidebarExpandedOnMobile && (
                      <div className="absolute left-full ml-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 top-1/2 -translate-y-1/2">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--gray-12)]"></div>
                      </div>
                    )}
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-[var(--gray-1)] rounded-l-full -z-10" />
                        <div className="absolute -right-[1px] top-0 bottom-0 w-[1px] bg-[var(--gray-1)]" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-3)] to-transparent rounded-l-full opacity-30 -z-10" />
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Collapse button - Desktop only */}
          {!isMobile && (
            <div className="p-2 pb-3">
              <TourTip
                id="sidebar-hide-hint"
                title="Hide Navigation"
                description="Need more space? Click here to collapse the sidebar."
                placement="right"
                delay={2000}
              >
                <button
                  onClick={toggleNavigation}
                  className="w-full p-2 bg-[var(--gray-2)] hover:bg-[var(--gray-4)]
                    border border-[var(--gray-5)] rounded-lg
                    flex items-center justify-center
                    transition-all duration-200
                    group"
                  title="Hide navigation"
                >
                  <HiChevronLeft className="w-4 h-4 text-[var(--gray-11)] group-hover:text-[var(--gray-12)]" />
                </button>
              </TourTip>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default LeftNavigation;
