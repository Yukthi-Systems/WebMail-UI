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

import { RULE_FIELDS, type DynamicField } from './rulesConfig';
import { ACTIONS } from './actionsConfig';
import type { UIFilter } from './filterTransform';

// ----------------------------------------------------------------------
// Types & Constants
// ----------------------------------------------------------------------

export interface ValidationError {
  [key: string]: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Allows: Letters, Numbers, Spaces, Underscores, and Hyphens
const FILTER_NAME_REGEX = /^[a-zA-Z0-9 _-]+$/;

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------

const validateSingleField = (
  value: any,
  fieldConfig: any,
  errorKey: string,
  errors: ValidationError
) => {
  // 1. Check Required (Default to true unless explicitly false)
  const isRequired = fieldConfig.required !== false;

  if (isRequired) {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      errors[errorKey] = `${fieldConfig.label || 'Field'} is required`;
      return; // Stop further validation for this field if it's empty
    }
  }

  // 2. Check Email Format
  if (fieldConfig.type === 'email' && value) {
    if (!EMAIL_REGEX.test(value)) {
      errors[errorKey] = 'Invalid email address format';
    }
  }
};

// --- Recursive Validator for Rules ---
const validateRuleFieldsRecursively = (
  fields: DynamicField[],
  values: { [key: string]: any },
  pathPrefix: string,
  ruleId: string,
  errors: ValidationError
) => {
  fields.forEach((fieldDef, idx) => {
    // Construct the path (e.g., field0, field0.0, field0.0.0)
    const currentPath = `${pathPrefix}${idx}`;
    const errorKey = `${ruleId}-${currentPath}`;
    const value = values[currentPath];

    // Validate the current field
    validateSingleField(value, fieldDef, errorKey, errors);

    // Recursively validate dependent fields
    if (fieldDef.type === 'select' && value && fieldDef.dependentFields?.[value]) {
      validateRuleFieldsRecursively(
        fieldDef.dependentFields[value],
        values,
        `${currentPath}.`, // Append dot for the next level
        ruleId,
        errors
      );
    }
  });
};

// ----------------------------------------------------------------------
// Main Validation Function
// ----------------------------------------------------------------------

export const validateFilter = (filter: UIFilter): ValidationError => {
  const errors: ValidationError = {};

  // --- 1. Validate Filter Name ---
  if (!filter.name || !filter.name.trim()) {
    errors['name'] = 'Filter name is required';
  } else if (!FILTER_NAME_REGEX.test(filter.name)) {
    // New validation check for special characters
    errors['name'] =
      'Filter name can only contain letters, numbers, spaces, hyphens (-), and underscores (_)';
  }

  // --- 2. Validate Rules (if scope requires them) ---
  if (filter.scope !== 'all_messages') {
    filter.rules.forEach((rule) => {
      // Validate that a field is selected
      if (!rule.field) {
        errors[`${rule.id}-root-field`] = 'Rule field is required';
        return;
      }

      // Find the config for the selected field
      const selectedFieldConfig = RULE_FIELDS.find((f) => f.value === rule.field);
      const selectedOperator = selectedFieldConfig?.operators[0];

      if (selectedOperator?.fields) {
        // Start recursive validation from the top-level operator fields
        // pathPrefix is "field" because the first level is "field0", "field1", etc.
        validateRuleFieldsRecursively(
          selectedOperator.fields,
          rule.values,
          'field',
          rule.id,
          errors
        );
      }
    });
  }

  // --- 3. Validate Actions ---
  filter.actions.forEach((action) => {
    // Validate that an action type is selected
    if (!action.type) {
      errors[`${action.id}-root-type`] = 'Action type is required';
      return;
    }

    const selectedActionConfig = ACTIONS.find((a) => a.value === action.type);

    if (selectedActionConfig?.fields) {
      selectedActionConfig.fields.forEach((fieldDef) => {
        // Actions use named keys (e.g. 'folder', 'email') rather than positional paths
        // We generally assume actions don't have deep conditional nesting like rules
        const errorKey = `${action.id}-${fieldDef.name}`;
        const value = action.values[fieldDef.name];

        validateSingleField(value, fieldDef, errorKey, errors);
      });
    }
  });

  return errors;
};
