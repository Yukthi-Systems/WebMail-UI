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
import { useAtomValue } from 'jotai';
import * as Switch from '@radix-ui/react-switch';
import { CustomSelect } from './CustomSelect';

import type { DynamicField } from './rulesConfig';
import type { ActionField } from './actionsConfig';
import { folderDetailsAtom } from '../../../state/folders';
import { NestedFolderSelect } from '../../common/NestedFolderSelect';
import type { ValidationError } from './validation';
import type { UIRule } from './filterTransform';

// Helper Component for Error Text
const ErrorText = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <span className="text-xs text-[var(--red-9)] mt-1 block">{error}</span>;
};

interface RulesFieldRendererProps {
  fields: DynamicField[];
  ruleId: string;
  pathPrefix: string;
  rules: UIRule[];
  updateRuleValue: (id: string, path: string, value: string) => void;
  errors: ValidationError;
  onClearError: (key: string) => void;
}

interface ActionsFieldRendererProps {
  fields: ActionField[];
  actionId: string;
  values: { [key: string]: unknown };
  updateActionValue: (id: string, name: string, value: unknown) => void;
  errors: ValidationError;
  onClearError: (key: string) => void;
}

export const RulesFieldRenderer: React.FC<RulesFieldRendererProps> = ({
  fields,
  ruleId,
  pathPrefix,
  rules,
  updateRuleValue,
  errors,
  onClearError,
}) => {
  const renderFields = (
    fields: DynamicField[],
    ruleId: string,
    pathPrefix: string,
    startIndex: number = 0
  ): React.ReactNode[] => {
    return fields.map((field, idx) => {
      const fieldIndex = startIndex + idx;
      const path = `${pathPrefix}${fieldIndex}`;
      const fieldKey = `${ruleId}-${path}`;
      const error = errors[fieldKey];

      const currentValue = rules.find((r) => r.id === ruleId)?.values[path];

      const defaultValue =
        field.type === 'select' && !currentValue && field.options?.[0]
          ? field.options[0].value
          : currentValue || '';

      const handleChange = (val: string) => {
        updateRuleValue(ruleId, path, val);
        onClearError(fieldKey);
      };

      // Styling Helpers
      const getBorderClass = () =>
        error
          ? 'border-[var(--red-9)] focus:border-[var(--red-9)]'
          : 'border-[var(--gray-6)] hover:border-[var(--gray-7)]';

      const inputBaseClass = `flex-1 px-3 py-2 border bg-[var(--gray-1)] text-[var(--gray-12)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] transition-all placeholder:text-[var(--gray-9)] ${getBorderClass()}`;

      let fieldElement: React.ReactNode = null;

      switch (field.type) {
        case 'select':
          // Auto-select first option if value is empty (optional behavior)
          if (!currentValue && field.options && field.options.length > 0) {
            setTimeout(() => updateRuleValue(ruleId, path, field.options![0].value), 0);
          }

          fieldElement = (
            <div className="min-w-[200px] flex-1">
              <CustomSelect
                value={defaultValue}
                onValueChange={handleChange}
                options={field.options || []}
                className={error ? 'border-[var(--red-9)]' : ''}
              />
              <ErrorText error={error} />
            </div>
          );
          break;

        case 'text':
        case 'email':
          fieldElement = (
            <div className="flex-1">
              <input
                type={field.type}
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={field.placeholder}
                className={inputBaseClass}
              />
              <ErrorText error={error} />
            </div>
          );
          break;

        case 'number':
          fieldElement = (
            <div className="flex-1">
              <input
                type="number"
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={field.placeholder}
                className={inputBaseClass}
              />
              <ErrorText error={error} />
            </div>
          );
          break;

        case 'date':
          fieldElement = (
            <div className="min-w-[200px]">
              <input
                type="date"
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={field.placeholder}
                className={inputBaseClass}
              />
              <ErrorText error={error} />
            </div>
          );
          break;

        case 'textarea':
          fieldElement = (
            <div className="flex-1 min-w-[300px]">
              <textarea
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className={`${inputBaseClass} resize-y`}
              />
              <ErrorText error={error} />
            </div>
          );
          break;
      }

      const dependentElements: React.ReactNode[] = [];
      if (field.type === 'select' && currentValue && field.dependentFields?.[currentValue]) {
        dependentElements.push(
          ...renderFields(field.dependentFields[currentValue], ruleId, `${path}.`, 0)
        );
      }

      return (
        <React.Fragment key={fieldKey}>
          {fieldElement}
          {dependentElements}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex flex-wrap items-start gap-2 flex-1 min-w-0">
      {renderFields(fields, ruleId, pathPrefix)}
    </div>
  );
};

export const ActionsFieldRenderer: React.FC<ActionsFieldRendererProps> = ({
  fields,
  actionId,
  values,
  updateActionValue,
  errors,
  onClearError,
}) => {
  const folderDetails = useAtomValue(folderDetailsAtom);

  return (
    <div className="space-y-2">
      {fields.map((field) => {
        const currentValue = values[field.name];
        const currentStringValue = (currentValue as string) || '';
        const fieldKey = `${actionId}-${field.name}`;
        const error = errors[fieldKey];
        const isRequired = field.required !== false;

        const handleChange = (val: unknown) => {
          updateActionValue(actionId, field.name, val);
          onClearError(fieldKey);
        };

        // Common styling
        const borderClass = error
          ? 'border-[var(--red-9)] focus:border-[var(--red-9)]'
          : 'border-[var(--gray-6)] hover:border-[var(--gray-7)]';

        const inputClass = `w-full px-3 py-2 border bg-[var(--gray-1)] text-[var(--gray-12)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] transition-all placeholder:text-[var(--gray-9)] ${borderClass}`;

        // Folders
        if (field.dynamicSource === 'folders') {
          return (
            <div key={fieldKey} className="space-y-1">
              <label className="block text-sm font-medium text-[var(--gray-12)]">
                {field.label} {isRequired && <span className="text-[var(--red-9)]">*</span>}
              </label>
              <NestedFolderSelect
                folders={folderDetails || []}
                value={currentStringValue}
                onChange={handleChange}
                placeholder={field.placeholder || 'Select folder'}
                className={`w-full ${error ? 'border-[var(--red-9)]' : ''}`}
              />
              <ErrorText error={error} />
            </div>
          );
        }

        const selectOptions = field.options || [];
        const defaultValue =
          field.type === 'select' && !currentValue && selectOptions[0]
            ? selectOptions[0].value
            : currentStringValue;

        switch (field.type) {
          case 'select':
            if (!currentValue && selectOptions.length > 0) {
              setTimeout(() => updateActionValue(actionId, field.name, selectOptions[0].value), 0);
            }

            return (
              <div key={fieldKey} className="space-y-1">
                <label className="block text-sm font-medium text-[var(--gray-12)]">
                  {field.label} {isRequired && <span className="text-[var(--red-9)]">*</span>}
                </label>
                <CustomSelect
                  value={defaultValue}
                  onValueChange={handleChange}
                  options={selectOptions}
                  className={`w-full ${error ? 'border-[var(--red-9)]' : ''}`}
                />
                <ErrorText error={error} />
              </div>
            );

          case 'text':
          case 'email':
            return (
              <div key={fieldKey} className="space-y-1">
                <label className="block text-sm font-medium text-[var(--gray-12)]">
                  {field.label} {isRequired && <span className="text-[var(--red-9)]">*</span>}
                </label>
                <input
                  type={field.type}
                  value={currentStringValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
                <ErrorText error={error} />
              </div>
            );

          case 'number':
            return (
              <div key={fieldKey} className="space-y-1">
                <label className="block text-sm font-medium text-[var(--gray-12)]">
                  {field.label} {isRequired && <span className="text-[var(--red-9)]">*</span>}
                </label>
                <input
                  type="number"
                  value={currentStringValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
                <ErrorText error={error} />
              </div>
            );

          case 'textarea':
            return (
              <div key={fieldKey} className="space-y-1">
                <label className="block text-sm font-medium text-[var(--gray-12)]">
                  {field.label} {isRequired && <span className="text-[var(--red-9)]">*</span>}
                </label>
                <textarea
                  value={currentStringValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className={`${inputClass} resize-y`}
                />
                <ErrorText error={error} />
              </div>
            );

          case 'switch':
            return (
              <div
                key={fieldKey}
                className="flex items-center justify-start py-2 px-3 gap-4 rounded-md hover:bg-[var(--gray-2)] transition-colors"
              >
                <Switch.Root
                  checked={Boolean(currentValue)}
                  onCheckedChange={handleChange}
                  className="w-11 h-6 bg-[var(--gray-5)] rounded-full relative data-[state=checked]:bg-[var(--accent-9)] transition-colors outline-none cursor-pointer hover:bg-[var(--gray-6)] data-[state=checked]:hover:bg-[var(--accent-10)]"
                >
                  <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] shadow-sm" />
                </Switch.Root>
                <label className="text-sm font-medium text-[var(--gray-12)]">{field.label}</label>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
