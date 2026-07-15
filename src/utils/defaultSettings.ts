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

import type { UserSettings } from '../api/user';

export const getDefaultUserSettings = (folderData?: any[]): UserSettings => {
  // Helper to find folder by flag
  const findFolder = (flag: string, fallback: string) => {
    if (!folderData) return fallback;
    const folder = folderData.find((f) => f.flags.includes(flag));
    return folder?.folder_name || fallback;
  };

  const inboxName = folderData?.find((f) => f.folder_name === 'INBOX')?.folder_name || 'INBOX';
  const sentName = findFolder('Sent', 'Sent');
  const draftsName = findFolder('Drafts', 'Drafts');
  const spamName = findFolder('Junk', 'Spam');
  const trashName = findFolder('Trash', 'Trash');

  return {
    general: {
      signature: [],
      selected_signature: '',
      from_address: { name: '', email: '' },
    },
    ui: {
      theme: 'light',
      color_scheme: 'orange',
      language: 'en',
      timezone: 'UTC',
      font_size: 14,
      show_notifications: true,
      show_tooltips: true,
      show_avatars: true,
      show_sidebar: true,
      show_quick_actions: true,
      show_search_bar: true,
      show_description: false,
      layout: 'side-by-side',
    },
    email: {
      mails_per_page: 50,
      undo_send: 5,
      default_view: 'INBOX',
      sent_folder: sentName,
      draft_folder: draftsName,
      show_sender: true,
      show_recipient: true,
      show_subject: true,
      show_date: true,
      show_attachments: true,
      show_body: true,
      show_reply_button: true,
      show_forward_button: true,
      show_delete_button: true,
      show_mark_as_read_button: true,
      show_mark_as_unread_button: true,
      show_star_button: true,
      show_header_button: true,
      mail_thead_view: 'all threads',
      thread_sort_order: 'desc',
      show_quick_hover_actions: true,
    },
    compose: {
      show_to_field: true,
      show_cc_field: true,
      show_bcc_field: true,
      show_subject_field: true,
      show_body_field: true,
      show_send_button: true,
      show_save_draft_button: true,
      show_attach_file_button: true,
      show_insert_link_button: true,
      show_insert_image_button: true,
      show_insert_table_button: true,
    },
    contacts: {
      show_name: true,
      show_email: true,
      show_phone: true,
      show_notes: true,
      show_address: true,
      show_website: true,
      show_birthday: true,
      show_created_date: true,
      show_updated_date: true,
    },
    folders: {
      inbox: {
        path: inboxName,
        label: inboxName, // Uses actual name
        color: '#3b82f6',
        icon: '',
        visible: true,
        show_in_sidebar: true,
        show_label: true,
        show_unread_count: true,
        show_starred_count: false,
        description: '',
        list_thread_view: 'threads',
      },
      sent: {
        path: sentName,
        label: sentName, // Uses actual name
        color: '#10b981',
        icon: '',
        visible: true,
        show_in_sidebar: true,
        show_label: true,
        show_unread_count: true,
        show_starred_count: false,
        description: '',
        list_thread_view: 'threads',
      },
      drafts: {
        path: draftsName,
        label: draftsName, // Uses actual name
        color: '#f59e0b',
        icon: '',
        visible: true,
        show_in_sidebar: true,
        show_label: true,
        show_unread_count: true,
        show_starred_count: false,
        description: '',
        list_thread_view: 'list',
      },
      spam: {
        path: spamName,
        label: spamName, // Uses actual name (could be "spam" or "Junk")
        color: '#ef4444',
        icon: '',
        visible: true,
        show_in_sidebar: true,
        show_label: true,
        show_unread_count: true,
        show_starred_count: false,
        description: '',
        list_thread_view: 'list',
      },
      trash: {
        path: trashName,
        label: trashName, // Uses actual name
        color: '#6b7280',
        icon: '',
        visible: true,
        show_in_sidebar: true,
        show_label: true,
        show_unread_count: true,
        show_starred_count: false,
        description: '',
        list_thread_view: 'list',
      },
    },
  };
};

export const mergeWithDefaults = (
  userSettings: Partial<UserSettings> | null,
  folderData?: any[]
): UserSettings => {
  const defaults = getDefaultUserSettings(folderData);

  if (!userSettings) return defaults;

  return {
    general: { ...defaults.general, ...userSettings.general },
    ui: { ...defaults.ui, ...userSettings.ui },
    email: { ...defaults.email, ...userSettings.email },
    compose: { ...defaults.compose, ...userSettings.compose },
    contacts: { ...defaults.contacts, ...userSettings.contacts },
    folders: {
      inbox: { ...defaults.folders.inbox, ...userSettings.folders?.inbox },
      sent: { ...defaults.folders.sent, ...userSettings.folders?.sent },
      drafts: { ...defaults.folders.drafts, ...userSettings.folders?.drafts },
      spam: { ...defaults.folders.spam, ...userSettings.folders?.spam },
      trash: { ...defaults.folders.trash, ...userSettings.folders?.trash },
    },
  };
};
