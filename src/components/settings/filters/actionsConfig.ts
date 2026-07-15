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

export type ActionFieldType = 'select' | 'text' | 'textarea' | 'email' | 'number' | 'switch';

export interface ActionField {
  type: ActionFieldType;
  name: string;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  dynamicSource?: 'folders';
  required?: boolean;
}

export interface ActionConfig {
  value: string;
  label: string;
  fields: ActionField[];
}

export const ACTIONS: ActionConfig[] = [
  // ==================== MOVE MESSAGE TO ====================
  {
    value: 'move_to',
    label: 'Move message to',
    fields: [
      {
        type: 'select',
        name: 'folder',
        label: 'Select folder',
        placeholder: 'Choose destination folder',
        dynamicSource: 'folders',
        options: [],
      },
    ],
  },

  // ==================== COPY MESSAGE TO ====================
  {
    value: 'copy_to',
    label: 'Copy message to',
    fields: [
      {
        type: 'select',
        name: 'folder',
        label: 'Select folder',
        placeholder: 'Choose destination folder',
        dynamicSource: 'folders',
        options: [],
      },
    ],
  },

  // ==================== REDIRECT MESSAGE TO ====================
  {
    value: 'redirect_to',
    label: 'Redirect message to',
    fields: [
      {
        type: 'email',
        name: 'redirect_address',
        label: 'Redirect address',
        placeholder: 'Enter email address',
      },
    ],
  },

  // ==================== SEND MESSAGE COPY TO ====================
  {
    value: 'send_copy_to',
    label: 'Send message copy to',
    fields: [
      {
        type: 'email',
        name: 'copy_to_address',
        label: 'Copy to address',
        placeholder: 'Enter email address',
      },
    ],
  },

  // ==================== DISCARD WITH MESSAGE ====================
  {
    value: 'discard_with_message',
    label: 'Discard with message',
    fields: [
      {
        type: 'textarea',
        name: 'discard_message_body',
        label: 'Message body',
        placeholder: 'Enter discard message...',
      },
    ],
  },

  // ==================== REPLY WITH MESSAGE ====================
  // {
  //   value: 'reply_with_message',
  //   label: 'Reply with message',
  //   fields: [
  //     {
  //       type: 'textarea',
  //       name: 'message_body',
  //       label: 'Message body',
  //       placeholder: 'Enter message body...',
  //     },
  //     {
  //       type: 'text',
  //       name: 'message_subject',
  //       label: 'Message subject',
  //       placeholder: 'Enter subject...',
  //     },
  //     {
  //       type: 'email',
  //       name: 'reply_sender_address',
  //       label: 'Reply sender address',
  //       placeholder: 'Enter sender address...',
  //     },
  //     {
  //       type: 'email',
  //       name: 'my_email_address',
  //       label: 'My email address',
  //       placeholder: 'Enter your email...',
  //     },
  //     {
  //       type: 'number',
  //       name: 'how_often_send_message',
  //       label: 'How often to send message (days)',
  //       placeholder: '0',
  //     },
  //   ],
  // },

  // ==================== DELETE MESSAGE ====================
  {
    value: 'delete_message',
    label: 'Delete message',
    fields: [],
  },

  // ==================== SET FLAGS TO MESSAGE ====================
  {
    value: 'set_flags',
    label: 'Set flags to the message',
    fields: [
      {
        type: 'switch',
        name: 'read',
        label: 'Read',
      },
      {
        type: 'switch',
        name: 'answered',
        label: 'Answered',
      },
      {
        type: 'switch',
        name: 'flagged',
        label: 'Flagged',
      },
      {
        type: 'switch',
        name: 'deleted',
        label: 'Deleted',
      },
      {
        type: 'switch',
        name: 'draft',
        label: 'Draft',
      },
      {
        type: 'text',
        name: 'custom_flag',
        label: 'Custom flag',
        placeholder: 'Enter custom flag...',
      },
    ],
  },

  // ==================== ADD FLAGS TO MESSAGE ====================
  {
    value: 'add_flags',
    label: 'Add flags to the message',
    fields: [
      {
        type: 'switch',
        name: 'read',
        label: 'Read',
      },
      {
        type: 'switch',
        name: 'answered',
        label: 'Answered',
      },
      {
        type: 'switch',
        name: 'flagged',
        label: 'Flagged',
      },
      {
        type: 'switch',
        name: 'deleted',
        label: 'Deleted',
      },
      {
        type: 'switch',
        name: 'draft',
        label: 'Draft',
      },
      {
        type: 'text',
        name: 'custom_flag',
        label: 'Custom flag',
        placeholder: 'Enter custom flag...',
      },
    ],
  },

  // ==================== REMOVE FLAGS FROM MESSAGE ====================
  {
    value: 'remove_flags',
    label: 'Remove flags from the message',
    fields: [
      {
        type: 'switch',
        name: 'read',
        label: 'Read',
      },
      {
        type: 'switch',
        name: 'answered',
        label: 'Answered',
      },
      {
        type: 'switch',
        name: 'flagged',
        label: 'Flagged',
      },
      {
        type: 'switch',
        name: 'deleted',
        label: 'Deleted',
      },
      {
        type: 'switch',
        name: 'draft',
        label: 'Draft',
      },
      {
        type: 'text',
        name: 'custom_flag',
        label: 'Custom flag',
        placeholder: 'Enter custom flag...',
      },
    ],
  },

  // ==================== SET VARIABLE ====================
  // {
  //   value: 'set_variable',
  //   label: 'Set variable',
  //   fields: [
  //     {
  //       type: 'text',
  //       name: 'variable_name',
  //       label: 'Variable name',
  //       placeholder: 'Enter variable name...',
  //     },
  //     {
  //       type: 'text',
  //       name: 'variable_value',
  //       label: 'Variable value',
  //       placeholder: 'Enter variable value...',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'lower_case',
  //       label: 'Convert to lowercase',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'upper_case',
  //       label: 'Convert to uppercase',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'first_character_lower_case',
  //       label: 'First character lowercase',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'first_character_upper_case',
  //       label: 'First character uppercase',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'quote',
  //       label: 'Quote value',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'special_characters',
  //       label: 'Encode special characters',
  //     },
  //     {
  //       type: 'switch',
  //       name: 'length',
  //       label: 'Get length',
  //     },
  //   ],
  // },

  // ==================== SEND NOTIFICATION ====================
  // {
  //   value: 'send_notification',
  //   label: 'Send notification',
  //   fields: [
  //     {
  //       type: 'select',
  //       name: 'notification_target',
  //       label: 'Notification target',
  //       placeholder: 'Select target...',
  //       options: [{ value: 'mailto', label: 'Email' }],
  //     },
  //     {
  //       type: "email",
  //       name: "email",
  //       label: "Email address",
  //       placeholder: "Enter email address...",
  //     },
  //     {
  //       type: 'textarea',
  //       name: 'notification_message',
  //       label: 'Notification message (optional)',
  //       placeholder: 'Enter notification message...',
  //     },
  //     {
  //       type: 'text',
  //       name: 'notification_sender',
  //       label: 'Notification sender (optional)',
  //       placeholder: 'Enter sender...',
  //     },
  //     {
  //       type: 'select',
  //       name: 'importance',
  //       label: 'Importance',
  //       placeholder: 'Select importance...',
  //       options: [
  //         { value: 'low', label: 'Low' },
  //         { value: 'normal', label: 'Normal' },
  //         { value: 'high', label: 'High' },
  //       ],
  //     },
  //     {
  //       type: 'text',
  //       name: 'notification_options',
  //       label: 'Additional options (optional)',
  //       placeholder: 'Enter options...',
  //     },
  //   ],
  // },

  // ==================== KEEP MESSAGE IN INBOX ====================
  {
    value: 'keep_in_inbox',
    label: 'Keep message in Inbox',
    fields: [],
  },

  // ==================== STOP EVALUATING RULES ====================
  {
    value: 'stop_rules',
    label: 'Stop evaluating rules',
    fields: [],
  },
];
