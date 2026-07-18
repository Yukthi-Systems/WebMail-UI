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

import React from 'react';
import { Heading, Badge } from '@radix-ui/themes';
import type { IconType } from 'react-icons';
import {
  HiOutlineUsers,
  HiOutlineVideoCamera,
  HiOutlineFolder,
  HiOutlinePencilSquare,
  HiOutlineLightBulb,
  HiOutlineDevicePhoneMobile,
  HiOutlineDocumentText,
  HiOutlineFunnel,
  HiOutlineCursorArrowRays,
} from 'react-icons/hi2';
import { LuKeyboard } from 'react-icons/lu';
import { HiOutlineMail } from 'react-icons/hi';
import { FaEnvelope } from 'react-icons/fa';
import { API_CONFIG } from '../../constants/config';

// --- Shortcut Data Definitions ---
interface ShortcutItem {
  keys: string[];
  description: string;
}

const navigationShortcuts: ShortcutItem[] = [
  { description: 'Next email', keys: ['j', '↓'] },
  { description: 'Previous email', keys: ['k', '↑'] },
  { description: 'Open email', keys: ['Enter', 'o'] },
  { description: 'Back to list', keys: ['Esc'] },
  { description: 'Go to next page', keys: ['n'] },
  { description: 'Go to previous page', keys: ['p'] },
  { description: 'Focus folders', keys: ['Shift', 'g'] },
];

const actionShortcuts: ShortcutItem[] = [
  { description: 'Compose', keys: ['c'] },
  { description: 'Reply', keys: ['r'] },
  { description: 'Reply All', keys: ['a'] },
  { description: 'Forward', keys: ['f'] },
  { description: 'Show shortcuts', keys: ['Ctrl', '?'] },
];

const selectionShortcuts: ShortcutItem[] = [
  { description: 'Select conversation', keys: ['x'] },
  { description: 'Select all', keys: ['Shift', '*'] },
  { description: 'Mark as read', keys: ['Shift', 'i'] },
  { description: 'Mark as unread', keys: ['Shift', 'u'] },
  { description: 'Delete', keys: ['#'] },
  { description: 'Mark as Flagged', keys: ['e'] },
  { description: 'Mark as UnFlagged', keys: ['s'] },
];

// --- Custom Components Built from Scratch ---

const KeyboardKey = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium bg-[var(--gray-3)] border border-[var(--gray-6)] rounded shadow-sm text-[var(--gray-12)]">
    {children}
  </span>
);

const ShortcutRow = ({ shortcut }: { shortcut: ShortcutItem }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[var(--gray-4)] last:border-0">
    <span className="text-sm text-[var(--gray-11)]">{shortcut.description}</span>
    <div className="flex items-center gap-1.5">
      {shortcut.keys.map((key, i) => (
        <KeyboardKey key={i}>{key}</KeyboardKey>
      ))}
    </div>
  </div>
);

const ShortcutSection = ({ title, shortcuts }: { title: string; shortcuts: ShortcutItem[] }) => (
  <div className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg p-4 md:p-5">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--gray-10)] mb-4">
      {title}
    </h3>
    <div className="space-y-0">
      {shortcuts.map((shortcut, index) => (
        <ShortcutRow key={index} shortcut={shortcut} />
      ))}
    </div>
  </div>
);

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: IconType;
  title: string;
  description: string;
}) => (
  <div className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg p-4 hover:bg-[var(--gray-3)] transition-colors duration-200">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 p-2 rounded-lg bg-[var(--accent-3)] text-[var(--accent-9)]">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[var(--gray-12)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--gray-11)] leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

const TipCard = ({ title, description }: { title: string; description: string }) => (
  <div className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg p-4 hover:border-[var(--gray-6)] transition-colors duration-200">
    <h3 className="text-sm font-semibold text-[var(--gray-12)] mb-2">{title}</h3>
    <p className="text-sm text-[var(--gray-11)] leading-relaxed">{description}</p>
  </div>
);

const SectionDivider = () => (
  <div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--gray-6)] to-transparent my-8 md:my-12" />
);

// --- Main Help Component ---

const Help = () => {
  return (
    <div className="h-full overflow-y-auto bg-[var(--gray-1)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-20">
        {/* Header Section with About-style Design */}
        <div className="text-center space-y-4 md:space-y-6 py-6 md:py-10">
          {/* App Icon */}
          <div className="flex justify-center">
            <div className="p-3 md:p-4 bg-[var(--accent-3)] rounded-2xl text-[var(--accent-9)] shadow-sm animate-in fade-in duration-500">
              <FaEnvelope size={32} className="md:w-10 md:h-10" />
            </div>
          </div>

          {/* Title & Version */}
          <div className="space-y-2">
            <Badge size="1" color="gray" variant="surface" radius="full" className="px-3 py-1">
              Help Center • v{API_CONFIG.version}
            </Badge>
            <Heading
              size={{ initial: '6', md: '8' }}
              className="text-[var(--gray-12)] tracking-tight font-bold"
            >
              Mail Service 25
            </Heading>
          </div>

          {/* Description */}
          <p className="text-[var(--gray-11)] text-center leading-relaxed max-w-2xl mx-auto block px-4">
            A next-generation email experience designed for speed, security, and simplicity. Built
            to help you manage communications effortlessly across all devices.
          </p>
        </div>

        {/* Features Overview */}
        <section className="mb-8 md:mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <FeatureCard
              icon={HiOutlineMail}
              title="Smart Mailbox"
              description="Organize emails with custom folders, drag-and-drop actions, and powerful threading to keep conversations together."
            />
            <FeatureCard
              icon={HiOutlinePencilSquare}
              title="Rich Editor"
              description="Compose beautiful emails using our Tiptap-powered editor with support for attachments, formatting, and templates."
            />
            <FeatureCard
              icon={HiOutlineUsers}
              title="Contact Management"
              description="Manage your address book efficiently. Create, edit, and search for contacts instantly from the sidebar."
            />
            <FeatureCard
              icon={HiOutlineVideoCamera}
              title="Instant Video Calls"
              description="Start instant meetings directly from your mailbox without needing external applications."
            />
            <FeatureCard
              icon={HiOutlineDevicePhoneMobile}
              title="Mobile Responsive"
              description="Fully optimized for mobile devices with touch-friendly interfaces and responsive layouts that work seamlessly on any screen size."
            />

            <FeatureCard
              icon={HiOutlineFolder}
              title="Smart Organization"
              description="Create nested folders with custom colors and icons to organize your emails exactly how you want."
            />
            <FeatureCard
              icon={HiOutlineDocumentText}
              title="Email Templates"
              description="Create and save reusable email templates in Settings. Quickly insert templates while composing to save time on repetitive emails."
            />
            <FeatureCard
              icon={HiOutlineFunnel}
              title="Sieve Filters"
              description="Set up powerful server-side filters using Sieve scripts to automatically sort, label, and manage incoming mail based on custom rules."
            />
            <FeatureCard
              icon={HiOutlineCursorArrowRays}
              title="Quick Preview"
              description="Hover over any sender name in the email list to see a quick preview dropdown with sender info and recent emails. Toggle this feature in General Settings."
            />
          </div>
        </section>

        <SectionDivider />

        {/* Keyboard Shortcuts Section */}
        <section id="shortcuts" className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <LuKeyboard size={24} className="text-[var(--accent-9)]" />
            <Heading size={{ initial: '4', md: '5' }} className="text-[var(--gray-12)]">
              Keyboard Shortcuts
            </Heading>
          </div>

          <p className="text-sm md:text-base text-[var(--gray-11)] mb-5 md:mb-6">
            Boost your productivity by using these keyboard shortcuts to navigate and manage your
            inbox.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            <ShortcutSection title="Navigation" shortcuts={navigationShortcuts} />
            <ShortcutSection title="Actions" shortcuts={actionShortcuts} />
            <ShortcutSection title="Selection & Management" shortcuts={selectionShortcuts} />
          </div>
        </section>

        <SectionDivider />

        {/* Pro Tips Section */}
        <section>
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <HiOutlineLightBulb className="text-[var(--yellow-9)]" size={24} />
            <Heading size={{ initial: '4', md: '5' }} className="text-[var(--gray-12)]">
              Pro Tips & Features
            </Heading>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <TipCard
              title="Drag & Drop to Folders"
              description="Click and drag any email from the list and drop it into a folder in the sidebar to move it instantly. A quick way to organize without opening menus."
            />
            <TipCard
              title="Theme Personalization"
              description="Navigate to Settings → General to switch between Light, Dark, or System themes. Choose your preferred accent color and adjust UI density for comfort."
            />
            <TipCard
              title="Email Templates"
              description="Go to Settings → Templates to create and manage reusable email templates. When composing, click the template button to insert pre-written content and save time."
            />
            <TipCard
              title="Sieve Filter Rules"
              description="Set up automated email filtering in Settings → Filters. Use Sieve script syntax to create rules that sort, flag, or move emails automatically based on sender, subject, or content."
            />
            <TipCard
              title="Quick Sender Preview"
              description="Hover your mouse over any sender's name in the email list to see a popup with their contact information and other recipients. You can disable this feature in Settings → General → Hover Preview."
            />
            <TipCard
              title="Advanced Search"
              description="Use the search bar at the top to filter emails by sender, subject, or content. Combine with folder navigation to find exactly what you need quickly."
            />
            <TipCard
              title="Conversation Threading"
              description="Related emails are automatically grouped into threads. Click any email to see the full conversation history with all replies and forwards in chronological order."
            />
            <TipCard
              title="Mobile-Optimized"
              description="Access your email on any device. The interface automatically adapts to your screen size with touch-friendly buttons and swipe gestures for mobile users."
            />
          </div>
        </section>

        {/* Footer Spacer */}
        <div className="h-8 md:h-12" />
      </div>
    </div>
  );
};

export default Help;
