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

import React, { useState } from 'react';
import BIMIAvatar from '../BimiAvatar';
import { useLogout } from '../../../hooks/useLogout';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { FaSignOutAlt, FaTimes, FaMobileAlt, FaShareAlt } from 'react-icons/fa';
import { userDetailsAtom } from '../../../state/userDetails';
import { userSettingsAtom } from '../../../state/settings';
import { webmailStore } from '../../../store';
import { csrfTokenAtom } from '../../../state/auth';
import { useLocation } from '@tanstack/react-router';
import { getCompanySlugFromPath } from '../../../utils/routeUtils';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose }) => {
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const userDetails = useAtomValue(userDetailsAtom);
  const userSettings = useAtomValue(userSettingsAtom);
  const location = useLocation();
  const slug = getCompanySlugFromPath(location.pathname);

  const [deferredPrompt, setDeferredPrompt] = useState(
    () => window._deferredPWAPrompt ?? null
  );

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  const showIOSHint = isIOS && !isInStandaloneMode;

  const currentUser = {
    email: userDetails?.email || '',
    name: userSettings?.general?.from_address?.name || '',
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    onClose();
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        webmailStore.set(csrfTokenAtom, null);
        localStorage.clear();
        if (slug) {
          navigate({ to: '/$slug', params: { slug } });
        } else {
          navigate({ to: '/login' });
        }
        onClose();
      },
      onError: () => {
        webmailStore.set(csrfTokenAtom, null);
        localStorage.clear();
        if (slug) {
          navigate({ to: '/$slug', params: { slug } });
        } else {
          navigate({ to: '/login' });
        }
        onClose();
      },
    });
  };

  const handleManageAccount = () => {
    if (slug) {
      navigate({ to: '/$slug/settings', params: { slug } });
    } else {
      navigate({ to: '/settings' });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      <div className="absolute top-full right-0 mt-2 sm:w-80 w-64 max-w-80 bg-[var(--gray-1)] border border-[var(--gray-6)] rounded-2xl shadow-lg overflow-hidden z-50">
        <div className="p-3 sm:p-4 bg-[var(--gray-1)] border-b border-[var(--gray-4)]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div></div>
            <span className="text-xs sm:text-sm text-[var(--gray-11)] truncate px-2">
              {currentUser.email}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-full transition-colors flex-shrink-0"
            >
              <FaTimes size={14} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2 sm:mb-3">
              <BIMIAvatar
                email={currentUser.email}
                size={64}
                className="sm:w-20 sm:h-20 border-2 sm:border-4 border-[var(--accent-8)] shadow-lg"
              />
            </div>

            {currentUser.name !== '' && (
              <h3 className="text-base sm:text-lg font-semibold text-[var(--gray-12)] mb-2 sm:mb-3 truncate max-w-full">
                Hi, {currentUser.name}!
              </h3>
            )}

            <button
              onClick={handleManageAccount}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--gray-1)] border border-[var(--gray-6)] text-[var(--gray-12)] text-xs sm:text-sm font-medium rounded-full hover:bg-[var(--gray-2)] transition-colors"
            >
              Manage your Account
            </button>
          </div>
        </div>

        <div className="p-2 sm:p-3 pb-2 flex flex-col gap-2">
          {/* Android / Desktop install */}
          {deferredPrompt && !isInStandaloneMode && (
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-center gap-2 p-2 sm:p-3 bg-[var(--accent-3)] border border-[var(--accent-6)] text-[var(--accent-11)] text-xs sm:text-sm font-medium rounded-lg hover:bg-[var(--accent-4)] transition-colors"
            >
              <FaMobileAlt size={14} className="sm:w-4 sm:h-4" />
              Install App
            </button>
          )}

          {/* iOS hint */}
          {showIOSHint && (
            <div className="w-full flex items-start gap-2 p-2 sm:p-3 bg-[var(--accent-3)] border border-[var(--accent-6)] text-[var(--accent-11)] text-xs sm:text-sm rounded-lg">
              <span>
                Tap <strong>Share</strong> <FaShareAlt className="inline" size={10} /> then{' '}
                <strong>Add to Home Screen</strong> to install.
              </span>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 p-2 sm:p-3 bg-[var(--gray-1)] border border-[var(--red-6)] text-[var(--red-12)] text-xs sm:text-sm font-medium rounded-lg hover:bg-[var(--red-2)] transition-colors"
            >
              <FaSignOutAlt size={12} className="sm:w-3.5 sm:h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileDropdown;
