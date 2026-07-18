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

import type { SieveFilters, SieveFilterCondition, SieveFilterAction } from '../../../api/sieve';

// UI Format
// Values shape varies per rule `field`/action `type` discriminator with no
// fixed schema (field0, field0.0, size, comparison, etc. depending on which
// rule/action kind it is) — kept as a free-form string bag rather than a
// discriminated union.
export interface UIRule {
  id: string;
  field: string;
  values: { [key: string]: string | undefined };
}

export interface UIAction {
  id: string;
  type: string;
  values: { [key: string]: unknown };
}

// The real API filter payload uses `disabled`, not `SieveFilter.enabled` —
// see the finding in CLAUDE.md. Local shape reflecting what's actually read
// here rather than the (not-quite-matching) shared `SieveFilter` type.
interface ApiFilterInput {
  name: string;
  content?: string;
  conditions?: unknown[][];
  actions?: unknown[][];
  match_type?: 'allof' | 'anyof' | '';
  disabled?: boolean;
}

export interface UIFilter {
  name: string;
  enabled: boolean;
  scope: 'all' | 'any' | 'all_messages';
  rules: UIRule[];
  actions: UIAction[];
}

const normalizeUnit = (u: string) => {
  const unit = u.toUpperCase();
  if (unit === 'KB') return 'K';
  if (unit === 'MB') return 'M';
  if (unit === 'GB') return 'G';
  return unit; // fallback
};

export const transformToApiFormat = (uiFilter: UIFilter): SieveFilters => {
  const conditions: SieveFilterCondition[] = uiFilter.rules
    .filter((rule) => rule.field && Object.keys(rule.values).length > 0)
    .map((rule) => {
      const values = rule.values;

      // Extract operator - could be at 'operator', 'field0', or 'comparison'
      const operator = values.field0 || values.operator || values.comparison || 'contains';

      // Extract value - prioritize field0.0 (current UI state) over value (stale)
      const value = values['field0.0'] || values.field1 || values.size || values.value || '';

      // Operator mapping
      const operatorMap: { [key: string]: string } = {
        contains: ':contains',
        not_contains: ':notcontains',

        is_equal: ':is',
        not_equal: ':notis',

        matches_expression: ':matches',
        not_matches_expression: ':notmatches',

        matches_regex: ':regex',
        not_matches_regex: ':notregex',

        // COUNT OPERATORS
        count_greater: ':count gt',
        count_greater_equal: ':count ge',
        count_less: ':count lt',
        count_less_equal: ':count le',
        count_equal: ':count eq',
        count_not_equal: ':count ne',

        // EXISTENCE
        exists: ':exists',
        not_exists: ':notexists',
      };

      const sieveOp = operatorMap[operator] || ':contains';

      // COUNT OPERATORS
      if (operator.startsWith('count_')) {
        const countValue = values['field0.0'] || '0';

        const countOpMap: Record<string, string> = {
          count_greater: 'gt',
          count_greater_equal: 'ge',
          count_less: 'lt',
          count_less_equal: 'le',
          count_equal: 'eq',
          count_not_equal: 'ne',
        };

        const comparison = countOpMap[operator];

        return [rule.field, ':count', comparison, countValue];
      }

      // Special: exists/notexists
      if (operator === 'exists') {
        return ['exists', rule.field];
      }
      if (operator === 'not_exists') {
        return ['notexists', rule.field];
      }

      // Special: size
      if (rule.field === 'size') {
        const comparison = values.comparison || values.field0 || 'over';
        const sizeNum = values.size || values['field0.0'] || values.field1 || '0';
        const rawUnit = values.unit || values['field0.1'] || values.field2 || 'KB';
        const unit = normalizeUnit(rawUnit);
        return ['size', `:${comparison}`, `${sizeNum}${unit}`];
      }

      // Special: body with :raw
      if (rule.field === 'body') {
        return ['body', ':raw', sieveOp, value];
      }

      if (rule.field === 'string') {
        const header = values.field0; // header name (e.g., "hello")
        const op = values.field1 || values.operator || 'contains';
        const value = values['field1.0'] || ''; // value (e.g., "bro")

        const sieveOp = op.startsWith(':') ? op : `:${op}`;

        return [header, sieveOp, value];
      }

      if (rule.field === 'message') {
        const mode = values.field0; // "is_duplicate"
        if (mode === 'is_duplicate') {
          return ['message', ':is', 'duplicate'];
        }
      }

      if (rule.field === '.' || rule.field === 'header') {
        const headerName = values.field0 || '';
        const operator = values.field1 || 'contains';
        const value = values['field1.0'] || '';

        const sieveOp = operator.startsWith(':') ? operator : `:${operator}`;

        return [headerName, sieveOp, value];
      }

      // Special: date/currentdate
      // if (rule.field === 'date' || rule.field === 'current_date') {
      //   const dateFormat = values.date_format || values.field0 || 'date';
      //   const dateOp = values.date_operator || values['field0.0'] || ':is';
      //   const dateValue = values.date_value || values['field0.0.0'] || '';
      //   return ['currentdate', ':zone', '+0000', dateOp, dateFormat, dateValue];
      // }

      if (rule.field === 'date') {
        const datePart = values.field0; // 'year', 'month', 'day', etc.
        const op = values['field0.0'] || 'contains';
        const value = values['field0.0.0'] || '';

        const sieveOp = op.startsWith(':') ? op : `:${op}`;
        const combinedValue = `${datePart} ${value}`; // "year 2023" as single string

        return ['date', sieveOp, combinedValue]; // Only 3 elements now
      }

      if (rule.field === 'current_date') {
        const datePart = values.field0;
        const op = values['field0.0'] || values.operator || 'contains';
        const sieveOp = op.startsWith(':') ? op : `:${op}`;
        const value = values['field0.0.0'] || values.value || '';

        return ['currentdate', ':zone', '+0000', sieveOp, datePart, value];
      }

      // Standard: ["Subject", ":contains", "value"]
      return [rule.field, sieveOp, value];
    });

  const actions: SieveFilterAction[] = uiFilter.actions
    .filter((action) => action.type)
    .map((action) => {
      const vals = action.values;

      switch (action.type) {
        case 'move_to':
          return ['fileinto', vals.folder || 'INBOX'];

        case 'copy_to':
          return ['fileinto', ':copy', vals.folder || 'INBOX'];

        case 'redirect_to':
          return ['redirect', vals.redirect_address || ''];
        case 'send_notification': {
          const notifyArgs: unknown[] = ['notify'];

          // Add importance
          if (vals.importance) {
            notifyArgs.push(':importance', vals.importance);
          }

          // Add message
          if (vals.notification_message) {
            notifyArgs.push(':message', vals.notification_message);
          }

          // Add from
          if (vals.notification_sender) {
            notifyArgs.push(':from', vals.notification_sender);
          }

          // Add options (if any additional headers needed)
          if (vals.notification_options) {
            notifyArgs.push(':options', vals.notification_options);
          }

          // The notification method (mailto:email)
          const notificationMethod =
            vals.notification_target === 'mailto' || vals.notification_target === 'email'
              ? `mailto:${vals.email || ''}`
              : vals.email || '';

          notifyArgs.push(notificationMethod);

          return notifyArgs;
        }
        case 'reply_with_message': {
          const vacationArgs: unknown[] = ['vacation'];

          if (vals.message_subject) {
            vacationArgs.push(':subject', vals.message_subject);
          }
          if (vals.how_often_send_message) {
            vacationArgs.push(':days', parseInt(vals.how_often_send_message as string, 10) || 7);
          }

          if (vals.reply_sender_address) {
            vacationArgs.push(':from', vals.reply_sender_address);
          }
          if (vals.my_email_address) {
            vacationArgs.push(':addresses', vals.my_email_address);
          }

          vacationArgs.push(':mime', vals.message_body || '');

          return vacationArgs;
        }

        case 'set_variable': {
          const setArgs: unknown[] = ['set'];

          // Map UI flags to Sieve modifiers
          if (vals.lower_case) setArgs.push(':lower');
          if (vals.upper_case) setArgs.push(':upper');
          if (vals.first_character_lower_case) setArgs.push(':lowerfirst');
          if (vals.first_character_upper_case) setArgs.push(':upperfirst');
          if (vals.quote) setArgs.push(':quotewildcard'); // Standard Sieve uses :quotewildcard
          if (vals.length) setArgs.push(':length');
          if (vals.special_characters) setArgs.push(':encodeurl'); // Assuming this maps to URL encoding

          // Add Name and Value (Order is standard: set [MODS] "name" "value")
          setArgs.push(vals.variable_name || 'variable');
          setArgs.push(vals.variable_value || '');

          return setArgs;
        }

        case 'send_copy_to':
          return ['redirect', ':copy', vals.copy_to_address || ''];

        case 'delete_message':
          return ['discard'];

        case 'discard_with_message':
          return ['reject', vals.discard_message_body || 'Message rejected'];
        case 'keep_in_inbox':
          return ['keep'];

        case 'stop_rules':
          return ['stop'];

        case 'set_flags':
        case 'add_flags':
        case 'remove_flags': {
          const flags: unknown[] = [];
          if (vals.read) flags.push('\\\\\\\\Seen');
          if (vals.answered) flags.push('\\\\\\\\Answered');
          if (vals.flagged) flags.push('\\\\\\\\Flagged');
          if (vals.deleted) flags.push('\\\\\\\\Deleted');
          if (vals.draft) flags.push('\\\\\\\\Draft');
          if (vals.custom_flag) flags.push(vals.custom_flag);

          const flagAction =
            action.type === 'set_flags'
              ? 'setflag'
              : action.type === 'add_flags'
                ? 'addflag'
                : 'removeflag';
          return flags.length > 0 ? [flagAction, ...flags] : [flagAction];
        }

        default:
          return [action.type];
      }
    });

  // Map scope to match_type
  let match_type: 'allof' | 'anyof' | '';
  if (uiFilter.scope === 'all') {
    match_type = 'allof';
  } else if (uiFilter.scope === 'any') {
    match_type = 'anyof';
  } else {
    match_type = '';
  }

  return {
    name: uiFilter.name,
    enabled: uiFilter.enabled,
    match_type: match_type,
    conditions: conditions,
    actions: actions,
  };
};

// Transform API format to UI format

export const transformFromApiFormat = (apiFilter: ApiFilterInput): UIFilter => {
  const scriptContent = apiFilter.content || '';

  const rules: UIRule[] = (apiFilter.conditions || []).map((rawCondition: unknown[], index: number) => {
    // Sieve condition tuples are ["field", ":operator", "value", ...] — always
    // strings in practice (the one numeric-looking case, size, is still read
    // via string methods below), so cast once here rather than per access.
    const condition = rawCondition as string[];
    // Handle exists
    if (condition[0] === 'exists') {
      return {
        id: `rule-${index}`,
        field: condition[1],
        values: { field0: 'exists', operator: 'exists' },
      };
    }

    // Handle not-exists
    if (condition[0] === 'notexists') {
      return {
        id: `rule-${index}`,
        field: condition[1],
        values: { field0: 'not_exists', operator: 'not_exists' },
      };
    }

    // SIZE RULE
    if (condition[0] === 'size') {
      const comparison = condition[1].replace(':', '');
      const sizeWithUnit = condition[2];
      const matches = sizeWithUnit.match(/^(\d+)([A-Z]+)$/i);
      const sizeNum = matches ? matches[1] : sizeWithUnit;
      const unit = matches ? matches[2].toUpperCase() : 'KB';

      return {
        id: `rule-${index}`,
        field: 'size',
        values: {
          field0: comparison,
          'field0.0': sizeNum,
          'field0.1': unit.length === 1 ? unit + 'B' : unit,
          comparison,
          operator: comparison,
          value: sizeWithUnit,
        },
      };
    }

    // BODY RULE
    if (condition[0] === 'body') {
      const operator = condition[2];
      const value = condition[3];
      const uiOp = operator.replace(':', '').replace('notcontains', 'not_contains');

      return {
        id: `rule-${index}`,
        field: 'body',
        values: {
          field0: uiOp,
          'field0.0': value,
          operator: uiOp,
          value: value,
        },
      };
    }

    // DATE RULE
    if (condition[0] === 'date') {
      const sieveOp = condition[1].replace(':', '');
      const combinedValue = condition[2];
      const parts = combinedValue.split(' ');
      const datePart = parts[0];
      const value = parts.slice(1).join(' ');

      return {
        id: `rule-${index}`,
        field: 'date',
        values: {
          field0: datePart,
          'field0.0': sieveOp,
          'field0.0.0': value,
          operator: sieveOp,
          value,
        },
      };
    }

    // MESSAGE test (duplicate detection)
    if (condition[0] === 'message') {
      const op = condition[1]?.replace(':', '') || '';
      const val = condition[2] || '';

      if (op === 'is' && val === 'duplicate') {
        return {
          id: `rule-${index}`,
          field: 'message',
          values: {
            field0: 'is_duplicate',
          },
        };
      }
    }

    // CURRENTDATE RULE
    if (condition[0] === 'currentdate') {
      const sieveOp = condition[3].replace(':', '');
      const datePart = condition[4];
      const value = condition[5];

      return {
        id: `rule-${index}`,
        field: 'current_date',
        values: {
          field0: datePart,
          'field0.0': sieveOp,
          'field0.0.0': value,
          operator: sieveOp,
          value,
        },
      };
    }

    // STANDARD FIELDS (subject/from/to/cc/bcc)
    const field = condition[0];
    const operator = condition[1];
    const value = condition[2];

    const standardFields = ['subject', 'from', 'to', 'cc', 'bcc'];

    if (standardFields.includes(field.toLowerCase())) {
      const uiOperator = operator
        .replace(':', '')
        .replace('notcontains', 'not_contains')
        .replace('notis', 'not_equal')
        .replace('notmatches', 'not_matches_expression')
        .replace('notregex', 'not_matches_regex')
        .replace('is', 'is_equal')
        .replace('matches', 'matches_expression')
        .replace('regex', 'matches_regex');

      return {
        id: `rule-${index}`,
        field: field.toLowerCase(),
        values: {
          field0: uiOperator,
          'field0.0': value,
          operator: uiOperator,
          value: value,
        },
      };
    }

    // CUSTOM HEADER CHECK - LAST
    if (scriptContent) {
      const filterName = apiFilter.name;
      const ruleRegex = new RegExp(`# rule:${filterName}[\\s\\S]*?if[^{]*{`, 'i');
      const ruleMatch = scriptContent.match(ruleRegex);

      if (ruleMatch) {
        const ruleBlock = ruleMatch[0];
        const customHeaderPattern = new RegExp(
          `header\\s+${operator}\\s+"${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s+"${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`,
          'i'
        );

        if (customHeaderPattern.test(ruleBlock)) {
          const uiOperator = operator
            .replace(':', '')
            .replace('notcontains', 'not_contains')
            .replace('notis', 'not_equal')
            .replace('notmatches', 'not_matches_expression')
            .replace('notregex', 'not_matches_regex')
            .replace('is', 'is_equal')
            .replace('matches', 'matches_expression')
            .replace('regex', 'matches_regex');

          return {
            id: `rule-${index}`,
            field: '.',
            values: {
              field0: field,
              field1: uiOperator,
              'field1.0': value,
            },
          };
        }
      }
    }

    // FALLBACK - Unknown field
    const uiOperator = operator
      .replace(':', '')
      .replace('notcontains', 'not_contains')
      .replace('notis', 'not_equal')
      .replace('notmatches', 'not_matches_expression')
      .replace('notregex', 'not_matches_regex')
      .replace('is', 'is_equal')
      .replace('matches', 'matches_expression')
      .replace('regex', 'matches_regex');

    return {
      id: `rule-${index}`,
      field,
      values: {
        field0: uiOperator,
        'field0.0': value,
        operator: uiOperator,
        value: value,
      },
    };
  });

  const actions: UIAction[] = (apiFilter.actions || []).map((action: unknown[], index: number) => {
    if (action[0] === 'fileinto') {
      if (action[1] === ':copy') {
        return {
          id: `action-${index}`,
          type: 'copy_to',
          values: { folder: action[2] },
        };
      }
      return {
        id: `action-${index}`,
        type: 'move_to',
        values: { folder: action[1] },
      };
    }

    if (action[0] === 'redirect') {
      if (action[1] === ':copy') {
        return {
          id: `action-${index}`,
          type: 'send_copy_to',
          values: { copy_to_address: action[2] },
        };
      }
      return {
        id: `action-${index}`,
        type: 'redirect_to',
        values: { redirect_address: action[1] },
      };
    }

    if (action[0] === 'vacation') {
      const values: Record<string, unknown> = {};

      if (scriptContent) {
        const filterName = apiFilter.name;
        const ruleRegex = new RegExp(`# rule:${filterName}[\\s\\S]*?vacation\\s+([^;]+);`);
        const ruleMatch = scriptContent.match(ruleRegex);

        if (ruleMatch) {
          const vacationLine = ruleMatch[1];

          const subjectMatch = vacationLine.match(/:subject\s+"([^"]*)"/);
          const daysMatch = vacationLine.match(/:days\s+(\d+)/);
          const fromMatch = vacationLine.match(/:from\s+"([^"]*)"/);
          const addressesMatch = vacationLine.match(/:addresses\s+"([^"]*)"/);
          const mimeMatch = vacationLine.match(/:mime\s+"([^"]*)"/);

          if (subjectMatch) values.message_subject = subjectMatch[1];
          if (daysMatch) values.how_often_send_message = daysMatch[1];
          if (fromMatch) values.reply_sender_address = fromMatch[1];
          if (addressesMatch) values.my_email_address = addressesMatch[1];
          if (mimeMatch) values.message_body = mimeMatch[1];
        }
      }

      return { id: `action-${index}`, type: 'reply_with_message', values };
    }

    if (action[0] === 'reject') {
      return {
        id: `action-${index}`,
        type: 'discard_with_message',
        values: { discard_message_body: action[1] || '' },
      };
    }

    if (action[0] === 'set') {
      const values: Record<string, unknown> = {
        lower_case: false,
        upper_case: false,
        first_character_lower_case: false,
        first_character_upper_case: false,
        quote: false,
        length: false,
        special_characters: false,
        variable_name: '',
        variable_value: '',
      };

      // The last two arguments are always Name and Value
      const argsLen = action.length;
      if (argsLen >= 3) {
        values.variable_value = action[argsLen - 1]; // Last arg is value
        values.variable_name = action[argsLen - 2]; // Second to last is name
      }

      // Everything between index 1 and (length - 2) are modifiers
      for (let i = 1; i < argsLen - 2; i++) {
        const mod = action[i];
        if (mod === ':lower') values.lower_case = true;
        if (mod === ':upper') values.upper_case = true;
        if (mod === ':lowerfirst') values.first_character_lower_case = true;
        if (mod === ':upperfirst') values.first_character_upper_case = true;
        if (mod === ':quotewildcard') values.quote = true;
        if (mod === ':length') values.length = true;
        if (mod === ':encodeurl') values.special_characters = true;
      }

      return {
        id: `action-${index}`,
        type: 'set_variable',
        values: values,
      };
    }

    if (action[0] === 'notify') {
      const values: Record<string, unknown> = {};

      // Parse the notify command arguments
      for (let i = 1; i < action.length; i++) {
        if (action[i] === ':importance' && action[i + 1]) {
          values.importance = action[i + 1];
          i++;
        } else if (action[i] === ':message' && action[i + 1]) {
          values.notification_message = action[i + 1];
          i++;
        } else if (action[i] === ':from' && action[i + 1]) {
          values.notification_sender = action[i + 1];
          i++;
        } else if (action[i] === ':options' && action[i + 1]) {
          values.notification_options = action[i + 1];
          i++;
        } else if (typeof action[i] === 'string' && (action[i] as string).startsWith('mailto:')) {
          values.email = (action[i] as string).replace('mailto:', '');
          values.notification_target = 'mailto';
        }
      }

      return {
        id: `action-${index}`,
        type: 'send_notification',
        values,
      };
    }

    if (action[0] === 'discard') {
      return { id: `action-${index}`, type: 'delete_message', values: {} };
    }

    if (action[0] === 'keep') {
      return { id: `action-${index}`, type: 'keep_in_inbox', values: {} };
    }

    if (action[0] === 'stop') {
      return { id: `action-${index}`, type: 'stop_rules', values: {} };
    }

    if (action[0] === 'setflag' || action[0] === 'addflag' || action[0] === 'removeflag') {
      const actionType =
        action[0] === 'setflag'
          ? 'set_flags'
          : action[0] === 'addflag'
            ? 'add_flags'
            : 'remove_flags';
      const flags = action.slice(1) as string[];
      const flagValues: Record<string, unknown> = {};
      flags.forEach((flag) => {
        if (flag === '\\\\Seen') flagValues.read = true;
        else if (flag === '\\Answered') flagValues.answered = true;
        else if (flag === '\\Flagged') flagValues.flagged = true;
        else if (flag === '\\Deleted') flagValues.deleted = true;
        else if (flag === '\\Draft') flagValues.draft = true;
        else flagValues.custom_flag = flag;
      });
      return { id: `action-${index}`, type: actionType, values: flagValues };
    }

    return { id: `action-${index}`, type: action[0] as string, values: {} };
  });

  let scope: 'all' | 'any' | 'all_messages' = 'all';
  if (apiFilter.match_type === 'allof') scope = 'all';
  else if (apiFilter.match_type === 'anyof') scope = 'any';
  else if (!apiFilter.match_type && (!apiFilter.conditions || apiFilter.conditions.length === 0)) {
    scope = 'all_messages';
  }

  return {
    name: apiFilter.name,
    enabled: !apiFilter.disabled,
    scope,
    rules: rules.length > 0 ? rules : [{ id: '1', field: '', values: {} }],
    actions: actions.length > 0 ? actions : [{ id: '1', type: '', values: {} }],
  };
};
