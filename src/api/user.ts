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

import { csrfTokenAtom } from '../state/auth';
import { webmailStore } from '../store';
import { API_URL, authCheck } from './config';
import { fetchWithAuth } from './fetchWrapper';

type Signature = {
  name: string;
  content: string;
  is_default?: boolean;
};

type FromAddress = {
  name: string;
  email: string;
};

// type FolderSettings = {
//   [folder_name: string]: {
//     visible: boolean;
//     quota?: number;
//     description?: string;
//   };
// };

// export type GeneralSettings = {
//   theme: string;
//   color_scheme: string;
//   language: string;
//   timezone: string;
//   mails_per_page: number;
//   default_view: string;
//   signature: Signature[];
//   from_address: FromAddress;
//   undo_send: number;
//   show_avatars: boolean;
//   show_notifications: boolean;
//   show_tooltips: boolean;
//   show_description: boolean;
//   grammar_check: boolean;
//   spell_check: boolean;
//   auto_save: boolean;
//   draft_folder: string;
//   folder_settings: FolderSettings;
//   selected_signature?: string;
// };

export type PanelSizes = {
  folderEmailSplit: number;
  emailViewerSplit: number;
  verticalEmailViewerSplit: number;
};

export type GeneralSettings = {
  ui: {
    theme: string;
    language: string;
    font_size: number;
    timezone: string;
    color_scheme: string;
    show_notifications: boolean;
    show_tooltips: boolean;
    show_avatars: boolean;
    show_sidebar: boolean;
    show_quick_actions: boolean;
    show_search_bar: boolean;
    show_description: boolean;
    layout?: 'side-by-side' | 'vertical-split' | 'compact' | 'immersive' | 'modal';
    panel_sizes?: PanelSizes;
    show_left_navigation?: boolean;
    sidebar_pinned?: boolean;
    sidebar_collapsed?: boolean;
    left_nav_button_position?: number;
    compose_button_style?: string;
    time_format?: '12h' | '24h';
  };
  folders: {
    [folder_name: string]: {
      path: string;
      show_unread_count: boolean;
      show_starred_count: boolean;
      color: string;
      icon: string;
      show_in_sidebar: boolean;
      label: string;
      show_label: boolean;
      description: string;
      visible: boolean;
      quota?: number;
      list_thread_view?: string;
    };
  };
  email: {
    mails_per_page: number;
    default_view: string;
    sent_folder: string;
    draft_folder: string;
    mail_thead_view?: string;
    undo_send: number;
    show_sender: boolean;
    show_recipient: boolean;
    show_subject: boolean;
    show_date: boolean;
    show_attachments: boolean;
    show_body: boolean;
    show_reply_button: boolean;
    show_forward_button: boolean;
    show_delete_button: boolean;
    show_mark_as_read_button: boolean;
    show_mark_as_unread_button: boolean;
    show_star_button: boolean;
    show_header_button: boolean;
    thread_sort_order: 'asc' | 'desc';
    show_quick_hover_actions: boolean;
  };
  compose: {
    show_to_field: boolean;
    show_cc_field: boolean;
    show_bcc_field: boolean;
    show_subject_field: boolean;
    show_body_field: boolean;
    show_send_button: boolean;
    show_save_draft_button: boolean;
    show_attach_file_button: boolean;
    show_insert_link_button: boolean;
    show_insert_image_button: boolean;
    show_insert_table_button: boolean;
    default_editor_tab?: 'richtext' | 'code';
  };
  contacts: {
    show_name: boolean;
    show_email: boolean;
    show_phone: boolean;
    show_notes: boolean;
    show_address: boolean;
    show_website: boolean;
    show_birthday: boolean;
    show_created_date: boolean;
    show_updated_date: boolean;
  };
  general: {
    signature: Signature[];
    selected_signature: string;
    from_address: FromAddress;
    time_format?: '12h' | '24h';
    reply_to?: string; // Add this line
  };
  tutorials?: {
    sieveFilters?: {
      completed: boolean;
      skipped: boolean;
    };
  };
  tour_tips?: {
    [tipId: string]: {
      dismissed: boolean;
      dismissed_at?: string;
    };
  };
};

export type UserSettings = GeneralSettings;

export const userSettings = async (): Promise<UserSettings> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/user/settings`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
  });

  authCheck(res.status);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Unable to get user settings...!');
  }

  const body = await res.json();
  return body.user_settings;
};

export type UpdateResponse = {
  message: string;
};

export const updateUserSettings = async (data: UserSettings): Promise<UpdateResponse> => {
  const csrfToken = webmailStore.get(csrfTokenAtom);
  const res = await fetchWithAuth(`${API_URL}/user/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Login failed');
  }
  return (await res.json()) as UpdateResponse;
};
