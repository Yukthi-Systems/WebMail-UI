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

// src/components/layout/header/LayoutSetting.tsx
import { useState, useRef, useEffect } from 'react';
import { BsLayoutSplit, BsLayoutSidebar, BsSquare, BsWindow } from 'react-icons/bs';
import { HiMiniArrowsPointingIn } from 'react-icons/hi2';
import { useAtom, useSetAtom } from 'jotai';
import { userSettingsAtom } from '../../../state/settings';
import { useToast } from '../../../hooks/useToast';
import { FaChevronDown, FaCheck } from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import { useSettingsBridge } from '../../../hooks/useSettingsBridge';
import { leftNavVisibleAtom } from '../../../state/leftNav';
import { sidebarCollapsedAtom, sidebarPinnedAtom } from '../../../state/sidebar';
import { TourTip } from '../TourTips';

export type LayoutType = 'side-by-side' | 'vertical-split' | 'compact' | 'immersive' | 'modal';

interface LayoutOption {
  value: LayoutType;
  label: string;
  icon: IconType;
  description: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    value: 'side-by-side',
    label: 'Side-by-Side',
    icon: BsLayoutSidebar,
    description: 'List left, content right',
  },
  {
    value: 'vertical-split',
    label: 'Vertical Split',
    icon: BsLayoutSplit,
    description: 'List top, content bottom',
  },
  {
    value: 'compact',
    label: 'Focused View',
    icon: BsSquare,
    description: 'Show list, click to view details',
  },
  {
    value: 'modal',
    label: 'Modal View',
    icon: BsWindow,
    description: 'Open emails in a floating modal',
  },
  {
    value: 'immersive',
    label: 'Immersive',
    icon: HiMiniArrowsPointingIn,
    description: 'Maximum space for reading',
  },
];

const LayoutSelector = () => {
  const [userSettings] = useAtom(userSettingsAtom);
  const { updateSettings } = useSettingsBridge();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const setLeftNavVisible = useSetAtom(leftNavVisibleAtom);
  const setSidebarCollapsed = useSetAtom(sidebarCollapsedAtom);
  const setSidebarPinned = useSetAtom(sidebarPinnedAtom);

  const currentLayout = userSettings?.ui?.layout || 'side-by-side';

  const activeOption = LAYOUT_OPTIONS.find((l) => l.value === currentLayout) || LAYOUT_OPTIONS[0];
  const CurrentIcon = activeOption.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleLayoutChange = async (newLayout: LayoutType) => {
    setIsOpen(false);

    try {
      // Special handling for immersive layout
      if (newLayout === 'immersive') {
        // Update UI atoms immediately for instant feedback
        setLeftNavVisible(false);
        setSidebarCollapsed(true);
        setSidebarPinned(false);

        await updateSettings((prev) => ({
          ui: {
            ...prev.ui,
            layout: newLayout,
            show_left_navigation: false,
            sidebar_pinned: false,
            sidebar_collapsed: true,
            panel_sizes: {
              folderEmailSplit: 16,
              emailViewerSplit: 30,
              verticalEmailViewerSplit: prev.ui?.panel_sizes?.verticalEmailViewerSplit ?? 40,
            },
          },
        }));
      } else {
        // Regular layout change - also use functional form
        await updateSettings((prev) => ({
          ui: {
            ...prev.ui,
            layout: newLayout,
          },
        }));
      }

      toast.success({
        description: `Layout changed to ${LAYOUT_OPTIONS.find((l) => l.value === newLayout)?.label}`,
        duration: 1500,
      });
    } catch {
      toast.error({
        description: 'Failed to update layout preference',
      });

      // Rollback UI atoms on error
      if (newLayout === 'immersive') {
        setLeftNavVisible(userSettings?.ui?.show_left_navigation ?? true);
        setSidebarCollapsed(false);
        setSidebarPinned(true);
      }
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <TourTip
        id="layout-selector"
        title="Reading Pane Layouts"
        description="Customize how your emails are displayed. Try different layouts to find what works best for you!"
        placement="bottom"
        delay={1500}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors group"
          title="Change View Layout"
        >
          <CurrentIcon
            size={18}
            className={`
              transition-colors group-hover:text-[var(--accent-9)]
              ${currentLayout === 'vertical-split' ? 'rotate-90' : ''}
            `}
          />
          <FaChevronDown
            size={12}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </TourTip>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-lg shadow-xl overflow-hidden z-50">
          {/* Arrow at top */}
          <div className="absolute -top-2 right-4 w-4 h-4 bg-[var(--color-panel-solid)] border-l border-t border-[var(--gray-6)] transform rotate-45" />
          <div className="relative z-10">
            <div className="px-4 py-2 bg-[var(--gray-3)] border-b border-[var(--gray-5)]">
              <span className="text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wider">
                Reading Pane
              </span>
            </div>
            {LAYOUT_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = currentLayout === option.value;
              const isVerticalSplit = option.value === 'vertical-split';

              return (
                <button
                  key={option.value}
                  onClick={() => handleLayoutChange(option.value)}
                  className={`
                    w-full px-4 py-3 flex items-start gap-3 text-left transition-all
                    ${
                      isSelected
                        ? 'bg-[var(--gray-3)] text-[var(--gray-12)]'
                        : 'hover:bg-[var(--gray-2)] text-[var(--gray-11)]'
                    }
                    border-b border-[var(--gray-4)] last:border-b-0
                  `}
                >
                  <div
                    className={`mt-0.5 ${isSelected ? 'text-[var(--accent-9)]' : 'text-[var(--gray-10)]'}`}
                  >
                    <OptionIcon size={18} className={isVerticalSplit ? 'rotate-90' : ''} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-none mb-1.5">{option.label}</div>
                    <div
                      className={`text-xs ${isSelected ? 'text-[var(--gray-11)]' : 'text-[var(--gray-10)]'}`}
                    >
                      {option.description}
                    </div>
                  </div>

                  {isSelected && (
                    <FaCheck size={14} className="flex-shrink-0 mt-1 text-[var(--accent-9)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutSelector;
