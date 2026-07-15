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

export type FieldType =
  | 'select'
  | 'text'
  | 'number'
  | 'textarea'
  | 'multi-select'
  | 'toggle'
  | 'date'
  | 'email';

export interface DynamicField {
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  dependentFields?: { [selectedValue: string]: DynamicField[] };
}

export interface OperatorConfig {
  value: string;
  label: string;
  fields?: DynamicField[];
}

export interface RuleFieldConfig {
  value: string;
  label: string;
  operators: OperatorConfig[];
}

const STANDARD_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'is_equal', label: 'is equal to' },
  { value: 'not_equal', label: 'is not equal to' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'not exists' },
  { value: 'matches_expression', label: 'matches expression' },
  { value: 'not_matches_expression', label: 'not matches expression' },
  // { value: 'matches_regex', label: 'matches regular expression' },
  // { value: 'not_matches_regex', label: 'not matches regular expression' },
  // { value: 'count_greater', label: 'count is greater than' },
  // { value: 'count_greater_equal', label: 'count is greater than or equal to' },
  // { value: 'count_less', label: 'count is less than' },
  // { value: 'count_less_equal', label: 'count is less than or equal to' },
  // { value: 'count_equal', label: 'count is equal to' },
  // { value: 'count_not_equal', label: 'count is not equal to' },
];
const STANDARD_DEPENDENCY = {
  contains: [{ type: 'text', placeholder: 'Enter text...' }],
  not_contains: [{ type: 'text', placeholder: 'Enter text...' }],
  is_equal: [{ type: 'text', placeholder: 'Enter text...' }],
  not_equal: [{ type: 'text', placeholder: 'Enter text...' }],
  matches_expression: [{ type: 'text', placeholder: 'Enter expression...' }],
  not_matches_expression: [{ type: 'text', placeholder: 'Enter expression...' }],
  matches_regex: [{ type: 'text', placeholder: 'Enter regex...' }],
  not_matches_regex: [{ type: 'text', placeholder: 'Enter regex...' }],
  count_greater: [{ type: 'number', placeholder: '0' }],
  count_greater_equal: [{ type: 'number', placeholder: '0' }],
  count_less: [{ type: 'number', placeholder: '0' }],
  count_less_equal: [{ type: 'number', placeholder: '0' }],
  count_equal: [{ type: 'number', placeholder: '0' }],
  count_not_equal: [{ type: 'number', placeholder: '0' }],
} as { [selectedValue: string]: DynamicField[] };

export const RULE_FIELDS: RuleFieldConfig[] = [
  // ==================== SUBJECT ====================
  {
    value: 'subject',
    label: 'Subject',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  // ==================== FROM ====================
  {
    value: 'from',
    label: 'From',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  // ==================== TO ====================
  {
    value: 'to',
    label: 'To',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  // ==================== CC ====================
  {
    value: 'cc',
    label: 'CC',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  // ==================== BCC ====================
  {
    value: 'bcc',
    label: 'BCC',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  // ==================== BODY ====================
  {
    value: 'body',
    label: 'Body',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  //============= ... ====================

  {
    value: '.',
    label: '...',
    operators: [
      {
        value: 'operator',
        label: 'Operator',
        fields: [
          { type: 'text', placeholder: 'Enter header name...' },
          {
            type: 'select',
            options: STANDARD_OPERATORS,
            dependentFields: STANDARD_DEPENDENCY,
          },
        ],
      },
    ],
  },

  // ==================== SIZE ====================
  {
    value: 'size',
    label: 'Size',
    operators: [
      {
        value: 'comparison',
        label: 'Comparison',
        fields: [
          {
            type: 'select',
            options: [
              { value: 'over', label: 'over' },
              { value: 'under', label: 'under' },
            ],
            dependentFields: {
              over: [
                { type: 'number', placeholder: '0' },
                {
                  type: 'select',
                  options: [
                    { value: 'B', label: 'B' },
                    { value: 'KB', label: 'KB' },
                    { value: 'MB', label: 'MB' },
                    { value: 'GB', label: 'GB' },
                  ],
                },
              ],
              under: [
                { type: 'number', placeholder: '0' },
                {
                  type: 'select',
                  options: [
                    { value: 'B', label: 'B' },
                    { value: 'KB', label: 'KB' },
                    { value: 'MB', label: 'MB' },
                    { value: 'GB', label: 'GB' },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },

  // ==================== DATE ====================
  {
    value: 'date',
    label: 'Date',
    operators: [
      {
        value: 'date_format',
        label: 'date format selector',
        fields: [
          {
            type: 'select',
            options: [
              { value: 'date_yyyy_mm_dd', label: 'date (yyyy-mm-dd)' },
              { value: 'date_iso8601', label: 'date (ISO8601)' },
              { value: 'date_rfc2822', label: 'date (RFC2822)' },
              { value: 'date_julian', label: 'date (julian)' },
              { value: 'time_hh_mm_ss', label: 'time (hh:mm:ss)' },
              { value: 'year', label: 'year' },
              { value: 'month', label: 'month' },
              { value: 'day', label: 'day' },
              { value: 'hour', label: 'hour' },
              { value: 'minute', label: 'minute' },
              { value: 'weekday', label: 'weekday(0-6)' },
              { value: 'timezone', label: 'timezone' },
            ],
            dependentFields: {
              date_yyyy_mm_dd: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              date_iso8601: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              date_rfc2822: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              date_julian: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              time_hh_mm_ss: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              year: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              month: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              day: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              hour: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              minute: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              second: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              weekday: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              timezone: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
            },
          },
        ],
      },
      {
        value: 'exists',
        label: 'exists',
      },
      {
        value: 'not_exists',
        label: 'not exists',
      },
    ],
  },

  // ==================== CURRENT DATE ====================
  {
    value: 'current_date',
    label: 'Current date',
    operators: [
      {
        value: 'current_date_format',
        label: 'date format selector',
        fields: [
          {
            type: 'select',
            options: [
              { value: 'date_yyyy_mm_dd', label: 'date (yyyy-mm-dd)' },
              { value: 'date_iso8601', label: 'date (ISO8601)' },
              { value: 'date_rfc2822', label: 'date (RFC2822)' },
              { value: 'date_julian', label: 'date (julian)' },
              { value: 'time_hh_mm_ss', label: 'time (hh:mm:ss)' },
              { value: 'year', label: 'year' },
              { value: 'month', label: 'month' },
              { value: 'day', label: 'day' },
              { value: 'hour', label: 'hour' },
              { value: 'minute', label: 'minute' },
              { value: 'weekday', label: 'weekday(0-6)' },
              { value: 'timezone', label: 'timezone' },
            ],
            dependentFields: {
              date_yyyy_mm_dd: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              date_iso8601: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              date_rfc2822: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              date_julian: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              time_hh_mm_ss: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              year: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              month: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              day: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              hour: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              minute: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              second: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              weekday: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
              timezone: [
                {
                  type: 'select',
                  options: STANDARD_OPERATORS,
                  dependentFields: STANDARD_DEPENDENCY,
                },
              ],
            },
          },
        ],
      },
      {
        value: 'exists',
        label: 'exists',
      },
      {
        value: 'not_exists',
        label: 'not exists',
      },
    ],
  },

  // ==================== STRING ====================
  // {
  //   value: 'string',
  //   label: 'String',
  //   operators: [
  //     {
  //       value: 'operator',
  //       label: 'Operator',
  //       fields: [
  //         { type: 'text', placeholder: 'Enter header name...' },
  //         {
  //           type: 'select',
  //           options: [
  //             { value: 'contains', label: 'contains' },
  //             { value: 'not_contains', label: 'not contains' },
  //             { value: 'is_equal', label: 'is equal to' },
  //             { value: 'not_equal', label: 'is not equal to' },
  //             { value: 'exists', label: 'exists' },
  //             { value: 'not_exists', label: 'not exists' },
  //             { value: 'matches_expression', label: 'matches expression' },
  //             { value: 'not_matches_expression', label: 'not matches expression' },
  //             { value: 'matches_regex', label: 'matches regular expression' },
  //             { value: 'not_matches_regex', label: 'not matches regular expression' },
  //           ],
  //           dependentFields: {
  //             contains: [{ type: 'text', placeholder: 'Enter value...' }],
  //             not_contains: [{ type: 'text', placeholder: 'Enter value...' }],
  //             is_equal: [{ type: 'text', placeholder: 'Enter value...' }],
  //             not_equal: [{ type: 'text', placeholder: 'Enter value...' }],
  //             matches_expression: [{ type: 'text', placeholder: 'Enter expression...' }],
  //             not_matches_expression: [{ type: 'text', placeholder: 'Enter expression...' }],
  //             matches_regex: [{ type: 'text', placeholder: 'Enter regex...' }],
  //             not_matches_regex: [{ type: 'text', placeholder: 'Enter regex...' }],
  //           },
  //         },
  //       ],
  //     },
  //   ],
  // },

  // ==================== MESSAGE ====================
  {
    value: 'message',
    label: 'Message',
    operators: [
      {
        value: 'duplicate',
        label: 'Duplicate',
        fields: [
          {
            type: 'select',
            options: [
              { value: 'is_duplicate', label: 'is duplicate' },
              { value: 'is_not_duplicate', label: 'is not duplicate' },
            ],
          },
        ],
      },
    ],
  },
];
