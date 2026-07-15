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

// src/components/layout/header.tsx
import { FaBars, FaChevronDown, FaEnvelope, FaMagnifyingGlass } from 'react-icons/fa6';
import { BgImageService } from '../../../utils/bimiService';
import { TbPinned, TbPinnedOff } from 'react-icons/tb';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import CustomIconButton from '../../ui/IconButton';
import { sidebarCollapsedAtom, sidebarPinnedAtom } from '../../../state/sidebar';
import { FaTimes } from 'react-icons/fa';
import BIMIAvatar from '../BimiAvatar';
import { useLocation } from '@tanstack/react-router';
import SearchDropdown from './search';
import ProfileDropdown from './Profile';
import type { SimplifiedEmail } from '../../mailbox/dummydata';
import { userDetailsAtom } from '../../../state/userDetails';
import { emailAddress, selectedEmailAtom } from '../../../state/emailAddress';
import { userSettingsAtom } from '../../../state/settings';
import { useMatches } from '@tanstack/react-router';
import LayoutSelector from './LayoutSetting';
import { useSettingsBridge } from '../../../hooks/useSettingsBridge';
import { useToast } from '../../ui/ToastComponent';
import { TourTip } from '../TourTips';
import { useIsMobile } from '../../../hooks/use-mobile';
import { getCompanySlugFromPath } from '../../../utils/routeUtils';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  const [sidebarPinned, setSidebarPinned] = useAtom(sidebarPinnedAtom);
  const userDetails = useAtomValue(userDetailsAtom);
  const [email, setEmail] = useAtom(emailAddress);
  const setSelectedEmail = useSetAtom(selectedEmailAtom);
  const userSettings = useAtomValue(userSettingsAtom);
  const setUserSettings = useSetAtom(userSettingsAtom);
  const { show_search_bar = true } = userSettings?.ui ?? {};
  const matches = useMatches();
  const isOnFolderRoute = matches.some(
    (match) =>
      match.routeId === '/_baselayout/folder/$folder/' || match.routeId === '/$slug/folder/$folder/'
  );
  const { updateSettings } = useSettingsBridge();
  const toast = useToast();
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [navLogoUrl, setNavLogoUrl] = useState<string | null>(null);

  const companySlug = getCompanySlugFromPath(location.pathname);

  useEffect(() => {
    const mode = userSettings?.ui?.theme === 'dark' ? 'dark' : 'light';
    if (companySlug) {
      BgImageService.getLogoImageUrlBySlug(companySlug, mode).then(setNavLogoUrl);
    } else {
      setNavLogoUrl(null);
    }
  }, [companySlug, userSettings?.ui?.theme]);

  const handleSearchResults = (query: string, filters: any) => {};

  const handleEmailSelect = (email: any) => {
    setSelectedEmail({
      ...email,
      selectedAt: Date.now(),
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (window.innerWidth < 768) {
      setIsSearchExpanded(false);
    }
  };

  // ✅ FIXED: Now saves to API
  const toggleSidebar = async () => {
    const newCollapsedState = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsedState);

    if (userSettings) {
      try {
        const updatedSettings = {
          ...userSettings,
          ui: {
            ...userSettings.ui,
            sidebar_collapsed: newCollapsedState,
          },
        };

        await updateSettings(updatedSettings);
        setUserSettings(updatedSettings);
      } catch (error) {
        toast.error({
          description: 'Failed to save sidebar preference',
        });
        // Rollback on error
        setSidebarCollapsed(!newCollapsedState);
      }
    }
    setIsSidebarMenuOpen(false);
  };

  const togglePin = async () => {
    const newPinState = !sidebarPinned;
    setSidebarPinned(newPinState);

    if (userSettings) {
      try {
        const updatedSettings = {
          ...userSettings,
          ui: {
            ...userSettings.ui,
            sidebar_pinned: newPinState,
          },
        };

        await updateSettings(updatedSettings);
        setUserSettings(updatedSettings);
      } catch (error) {
        toast.error({
          description: 'Failed to save preference',
        });
        setSidebarPinned(!newPinState);
      }
    }
    setIsSidebarMenuOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      setTimeout(() => {
        const searchInput = document.querySelector('#mobile-search-input') as HTMLInputElement;
        searchInput?.focus();
      }, 100);
    }
  };

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsSidebarMenuOpen(false);
      }
    };

    if (isSidebarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarMenuOpen]);

  useEffect(() => {
    if (userDetails) {
      const name =
        userSettings?.general?.from_address?.name ||
        userDetails?.email.split('@')[0] ||
        ' Unknown Sender';
      const value = {
        name: name,
        address: userDetails?.email,
      };
      setEmail(value);
    } else if (userSettings) {
      const value = {
        name: userSettings?.general?.from_address?.name || '',
        address: userSettings?.general?.from_address?.email || '',
      };

      setEmail(value);
    }
  }, [userSettings, userDetails]);

  // ✅ NEW: Sync sidebar states from API settings on mount
  useEffect(() => {
    if (userSettings?.ui) {
      // Only update if API has a defined value (don't overwrite with undefined)
      if (userSettings.ui.sidebar_collapsed !== undefined) {
        setSidebarCollapsed(userSettings.ui.sidebar_collapsed);
      }
      if (userSettings.ui.sidebar_pinned !== undefined) {
        setSidebarPinned(userSettings.ui.sidebar_pinned);
      }
    }
  }, [userSettings?.ui?.sidebar_collapsed, userSettings?.ui?.sidebar_pinned]);

  // Mobile search overlay
  if (isSearchExpanded) {
    return (
      <div className="top-0 left-0 right-0 z-[60] md:hidden">
        <div className="h-[70px] border-b border-[var(--gray-6)] px-4 flex items-center">
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={toggleSearch}
              className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors flex-shrink-0"
            >
              <FaTimes size={16} />
            </button>
            <div className="flex-1">
              <SearchDropdown
                className="w-full"
                onSearch={handleSearchResults}
                onEmailSelect={handleEmailSelect}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine sidebar state for visual feedback
  const getSidebarState = () => {
    if (!sidebarCollapsed) return 'expanded';
    if (sidebarPinned) return 'collapsed-pinned';
    return 'collapsed-locked';
  };

  const sidebarState = getSidebarState();

  return (
    <div className="h-[70px] bg-[var(--color-panel-solid)] border-b border-[var(--gray-6)] sticky top-0 z-[50] px-2 md:px-6 flex items-center shadow-sm">
      <div className="flex items-center justify-between w-full h-full gap-4">
        {/* Left section - Menu and Logo */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Sidebar Control - Desktop with TourTip */}
          <div className="hidden md:block relative">
            <TourTip
              id="sidebar-menu-control"
              title="Sidebar Controls"
              description="Expand/collapse your sidebar or enable auto-expand mode for quick access."
              placement="bottom"
              delay={1000}
            >
              <button
                ref={buttonRef}
                onClick={() => setIsSidebarMenuOpen(!isSidebarMenuOpen)}
                className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors flex items-center justify-center relative group"
                title="Sidebar options"
              >
                <FaBars size={16} />
                {/* State indicator icon badge */}
                <span className="absolute -bottom-0.5 -right-0.5">
                  {sidebarState === 'expanded' ? (
                    <HiChevronLeft size={10} className="text-[var(--green-9)]" />
                  ) : sidebarState === 'collapsed-pinned' ? (
                    <TbPinned size={10} className="text-[var(--blue-9)]" />
                  ) : (
                    <TbPinnedOff size={10} className="text-[var(--gray-9)]" />
                  )}
                </span>
              </button>
            </TourTip>

            {/* Dropdown Menu */}
            {isSidebarMenuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full left-0 mt-2 w-64 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl p-2 z-[100]"
                style={{
                  animation: 'slideDown 0.2s ease-out',
                }}
              >
                {/* Arrow */}
                <div className="absolute -top-2 left-4 w-4 h-4 bg-[var(--color-panel-solid)] border-l border-t border-[var(--gray-6)] transform rotate-45" />

                <div className="space-y-1 relative z-10">
                  {/* Expand/Collapse */}
                  <button
                    onClick={toggleSidebar}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                      !sidebarCollapsed
                        ? 'bg-[var(--accent-3)] text-[var(--accent-11)]'
                        : 'text-[var(--gray-12)] hover:bg-[var(--gray-3)]'
                    }`}
                  >
                    {sidebarCollapsed ? (
                      <HiChevronRight className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <HiChevronLeft className="w-4 h-4 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                      </div>
                      <div className="text-xs text-[var(--gray-11)]">
                        {sidebarCollapsed ? 'Show full sidebar' : 'Minimize sidebar'}
                      </div>
                    </div>
                  </button>

                  {/* Pin/Unpin - Only show when collapsed */}
                  {sidebarCollapsed && (
                    <>
                      <div className="h-px bg-[var(--gray-4)] my-1" />
                      <button
                        onClick={togglePin}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                          sidebarPinned
                            ? 'bg-[var(--blue-3)] text-[var(--blue-11)]'
                            : 'text-[var(--gray-12)] hover:bg-[var(--gray-3)]'
                        }`}
                      >
                        {sidebarPinned ? (
                          <TbPinned className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <TbPinnedOff className="w-4 h-4 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {sidebarPinned ? 'Auto-expand Enabled' : 'Auto-expand Disabled'}
                          </div>
                          <div className="text-xs text-[var(--gray-11)]">
                            {sidebarPinned ? 'Hover to expand sidebar' : 'Sidebar stays collapsed'}
                          </div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Simple toggle for mobile */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors flex items-center justify-center"
            title="Toggle Menu"
          >
            <FaBars size={16} />
          </button>

          <div
            onClick={() =>
              companySlug
                ? navigate({ to: '/$slug', params: { slug: companySlug } })
                : navigate({ to: '/' })
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === 'Enter' &&
              (companySlug
                ? navigate({ to: '/$slug', params: { slug: companySlug } })
                : navigate({ to: '/' }))
            }
            className="flex items-center gap-3 min-w-0 cursor-pointer"
          >
            {navLogoUrl ? (
              <img
                src={navLogoUrl}
                alt="Domain logo"
                className="h-16 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div className="w-8 h-8 bg-[var(--accent-9)] rounded-lg flex items-center justify-center shadow-sm">
                <FaEnvelope color="white" size={16} />
              </div>
            )}
            {!navLogoUrl && (
              <>
                <h1 className="text-lg font-bold text-[var(--gray-12)] truncate hidden sm:block">
                  Mail Service 25
                </h1>
                <h1 className="text-base font-bold text-[var(--gray-12)] truncate sm:hidden">
                  Mail Service 25
                </h1>
              </>
            )}
          </div>
        </div>

        {/* Center section - Desktop Search */}
        {isOnFolderRoute && show_search_bar && (
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <SearchDropdown
              className="w-full"
              placeholder="Search emails..."
              onSearch={handleSearchResults}
              onEmailSelect={handleEmailSelect}
            />
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSearch}
            className="md:hidden p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
            title="Search"
          >
            <FaMagnifyingGlass size={16} />
          </button>

          {/* Layout Selector - Only show on folder routes */}
          {isOnFolderRoute && !isMobile && <LayoutSelector />}

          {/* Profile Dropdown */}
          <div className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer group transition-all duration-200 
                  hover:bg-[var(--gray-2)] rounded-lg p-1"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <BIMIAvatar
                email={userDetails?.email}
                size={32}
                className="border border-[var(--accent-8)] group-hover:ring-2 group-hover:ring-[var(--accent-8)] 
                 transition-all duration-200"
              />
              <FaChevronDown
                className={`w-3 h-3 text-[var(--gray-11)] group-hover:text-[var(--gray-12)] 
                 transition-all duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
              />
            </div>

            <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Header;
