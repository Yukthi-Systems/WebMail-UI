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

import React, { useState, useEffect, useMemo } from 'react';
import { BsTrash, BsX } from 'react-icons/bs';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { RULE_FIELDS } from './rulesConfig';
import { ActionsFieldRenderer, RulesFieldRenderer } from './RenderFields';
import { ACTIONS } from './actionsConfig';
import { CustomSelect } from './CustomSelect';
import { ScriptSelector } from './ScriptSelector';
import { FiltersList } from './FiltersList';
import ConfirmationModal from '../../common/ConfirmationModal';
import {
  useCreateFilter,
  useCreateScript,
  useDeleteFilter,
  useDeleteScript,
  useDisableFilter,
  useEnableFilter,
  useEnableScript,
  useFilter,
  useFilters,
  useRenameScript,
  useScripts,
  useUpdateFilter,
} from '../../../hooks/useSieve';
import { transformFromApiFormat, transformToApiFormat, type UIFilter } from './filterTransform';
import { CreateScriptDialog } from './CreateScriptDialoge';
import { getScriptRaw } from '../../../api/sieve';
import { useToast } from '../../../hooks/useToast';
import { validateFilter, type ValidationError } from './validation'; // Imported Validation
import { SieveTutorialModal } from './SieveTutorial';
import { useSettingsBridge } from '../../../hooks/useSettingsBridge';
import { useAtom } from 'jotai';
import { userSettingsAtom } from '../../../state/settings';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteConfirmation {
  isOpen: boolean;
  type: 'script' | 'filter' | null;
  name: string;
}

interface FilterSearchParams {
  mode?: string;
  filter?: string;
}

const FiltersManagement = () => {
  const navigate = useNavigate();
  // TanStack Router's navigate({ search }) type is inferred from the route this
  // component is registered against; this component is rendered from multiple
  // route contexts, so there's no single concrete route/search-schema to infer
  // from. Isolating the one unavoidable `any` here rather than at every call site.
  const navigateWithSearch = (search: FilterSearchParams) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ search: search as any, hash: 'filter' });
  const searchParams = useSearch({ strict: false }) as unknown as FilterSearchParams;
  // Inside component:
  const { updateSettings } = useSettingsBridge();
  const [atomSettings] = useAtom(userSettingsAtom);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isGlobalDisabling, setIsGlobalDisabling] = useState(false);
  const viewMode = searchParams?.mode || 'list';
  const filterName = searchParams?.filter || '';
  const queryClient = useQueryClient();
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const toast = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation>({
    isOpen: false,
    type: null,
    name: '',
  });

  // State for Filter Form
  const [filter, setFilter] = useState<UIFilter>({
    name: '',
    enabled: true,
    scope: 'all',
    rules: [{ id: '1', field: '', values: {} }],
    actions: [{ id: '1', type: '', values: {} }],
  });

  // State for Validation Errors
  const [errors, setErrors] = useState<ValidationError>({});

  // Queries
  const { data: scriptsData, isLoading: scriptsLoading } = useScripts();
  const { data: filtersData, isLoading: filtersLoading } = useFilters(
    selectedScript,
    !!selectedScript
  );
  const { data: existingFilter, isLoading: filterLoading } = useFilter(
    selectedScript,
    filterName,
    viewMode === 'edit' && !!filterName && !!selectedScript
  );

  // Mutations
  const createScriptMutation = useCreateScript();
  const deleteScriptMutation = useDeleteScript();
  const enableScriptMutation = useEnableScript();
  const createFilterMutation = useCreateFilter();
  const updateFilterMutation = useUpdateFilter();
  const deleteFilterMutation = useDeleteFilter();
  const enableFilterMutation = useEnableFilter();
  const disableFilterMutation = useDisableFilter();
  const renameScriptMutation = useRenameScript();

  const activeScript = scriptsData?.scripts.active || '';
  const scripts = useMemo(
    () => [...(activeScript ? [activeScript] : []), ...(scriptsData?.scripts?.scripts ?? [])],
    [activeScript, scriptsData]
  );
  const filters = filtersData?.filters || [];

  // Auto-select first script
  useEffect(() => {
    if (scripts.length > 0 && !selectedScript) {
      setSelectedScript(scripts[0]);
    }
  }, [scripts, selectedScript]);

  // Load existing filter for edit
  useEffect(() => {
    if (viewMode === 'edit' && existingFilter && !filterLoading) {
      const uiFilter = transformFromApiFormat(existingFilter.filter_data);
      setFilter(uiFilter);
    }
  }, [viewMode, existingFilter, filterLoading]);

  // Script handlers (omitted for brevity, assume standard implementations as per your code)
  const handleCreateScript = async (name: string, content: string) => {
    try {
      await createScriptMutation.mutateAsync({ scriptName: name, scriptContent: content });
      setSelectedScript(name);
      toast.success({ description: 'Script created successfully' });
    } catch (error) {
      toast.error({ description: ((error as Error)?.message) || 'Failed to create script' });
    }
  };
  const handleDeleteScript = (name: string) =>
    setDeleteConfirm({ isOpen: true, type: 'script', name });
  const confirmDeleteScript = async () => {
    try {
      await deleteScriptMutation.mutateAsync(deleteConfirm.name);
      if (selectedScript === deleteConfirm.name) setSelectedScript('');
      toast.success({ description: 'Script deleted successfully' });
    } catch (error) {
      toast.error({ description: (error as Error)?.message });
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, name: '' });
    }
  };

  const handleDisableAllFilters = async () => {
    const enabledFilters = filters.filter(
      (f) => f.enabled && !f.name.includes('[vacation]') // skip vacation
    );

    if (enabledFilters.length === 0) return;

    setIsGlobalDisabling(true);
    let successCount = 0;
    let failCount = 0;

    try {
      await Promise.all(
        enabledFilters.map(async (filter) => {
          try {
            await disableFilterMutation.mutateAsync({
              scriptName: selectedScript,
              filterName: filter.name,
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to disable ${filter.name}`, err);
            failCount++;
          }
        })
      );

      // Invalidate filters cache so UI reflects actual state
      await queryClient.invalidateQueries({ queryKey: ['filters', selectedScript] });

      if (failCount === 0) {
        toast.success({ description: `All ${successCount} filters disabled successfully.` });
      } else if (successCount > 0) {
        toast.success({ description: `Disabled ${successCount} filters, failed ${failCount}.` });
      } else {
        toast.error({ description: 'Failed to disable filters.' });
      }
    } catch {
      toast.error({ description: 'An unexpected error occurred.' });
    } finally {
      setIsGlobalDisabling(false);
    }
  };

  const handleRenameScript = async (oldName: string, newName: string) => {
    try {
      await renameScriptMutation.mutateAsync({ oldScriptName: oldName, newScriptName: newName });
      if (selectedScript === oldName) setSelectedScript(newName);
      toast.success({ description: 'Script renamed successfully' });
    } catch (error) {
      toast.error({ description: (error as Error)?.message });
    }
  };
  const handleDownloadScript = async (name: string) => {
    try {
      // getScriptRaw resolves to the raw script string directly, not
      // { raw_data } — same finding as CreateScriptDialoge.tsx/vacation/index.tsx
      // (see CLAUDE.md). data.raw_data is always undefined, so the downloaded
      // file has always contained the literal text "undefined", not the script.
      const data = (await getScriptRaw(name)) as unknown as { raw_data?: string };
      const blob = new Blob([data.raw_data as string], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error({ description: (error as Error)?.message });
    }
  };
  const handleActivateScript = async (name: string) => {
    try {
      await enableScriptMutation.mutateAsync(name);
      toast.success({ description: 'Script activated successfully' });
    } catch (error) {
      toast.error({ description: (error as Error)?.message });
    }
  };

  //tutorials
  useEffect(() => {
    const hasSeenTutorial = atomSettings?.tutorials?.sieveFilters?.completed;

    if (!hasSeenTutorial && viewMode === 'list') {
      setShowTutorial(true);
    }
  }, [atomSettings, viewMode]);

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    await updateSettings({
      tutorials: {
        ...(atomSettings?.tutorials || {}),
        sieveFilters: { completed: true, skipped: false },
      },
    });
  };

  const handleTutorialSkip = async () => {
    setShowTutorial(false);
    await updateSettings({
      tutorials: {
        ...(atomSettings?.tutorials || {}),
        sieveFilters: { completed: true, skipped: true },
      },
    });
  };

  // Filter Navigation Handlers
  const handleCreateFilter = () => {
    setFilter({
      name: '',
      enabled: true,
      scope: 'all',
      rules: [{ id: '1', field: '', values: {} }],
      actions: [{ id: '1', type: '', values: {} }],
    });
    setErrors({}); // Clear errors
    navigateWithSearch({ mode: 'create' });
  };

  const handleEditFilter = (name: string) => {
    setErrors({}); // Clear errors
    navigateWithSearch({ mode: 'edit', filter: name });
  };

  const handleDeleteFilter = (name: string) =>
    setDeleteConfirm({ isOpen: true, type: 'filter', name });
  const confirmDeleteFilter = async () => {
    try {
      await deleteFilterMutation.mutateAsync({
        scriptName: selectedScript,
        filterName: deleteConfirm.name,
      });
      toast.success({ description: 'Filter deleted successfully' });
    } catch (error) {
      toast.error({ description: (error as Error)?.message });
    } finally {
      setDeleteConfirm({ isOpen: false, type: null, name: '' });
    }
  };
  const handleToggleFilter = async (name: string, enabled: boolean) => {
    try {
      if (enabled) {
        // The switch was turned ON -> Call Enable API
        await enableFilterMutation.mutateAsync({
          scriptName: selectedScript,
          filterName: name,
        });
      } else {
        // The switch was turned OFF -> Call Disable API
        await disableFilterMutation.mutateAsync({
          scriptName: selectedScript,
          filterName: name,
        });
      }

      // Update toast to match the actual action taken
      toast.success({
        description: `Filter ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      toast.error({ description: (error as Error)?.message });
    }
  };

  // --- SAVE FILTER HANDLER ---
  const handleSaveFilter = async () => {
    // 1. Validate
    const validationErrors = validateFilter(filter);

    // 2. Update Error State
    setErrors(validationErrors);

    // 3. Check if we have errors
    if (Object.keys(validationErrors).length > 0) {
      toast.error({ description: 'Please fix the errors in the form before saving.' });
      return;
    }

    try {
      const apiFilter = transformToApiFormat(filter);

      if (viewMode === 'edit' && filterName) {
        await updateFilterMutation.mutateAsync({
          scriptName: selectedScript,
          filterName: filterName,
          filter: apiFilter,
        });
        toast.success({ description: 'Filter updated successfully' });
      } else {
        await createFilterMutation.mutateAsync({
          scriptName: selectedScript,
          filter: apiFilter,
        });
        toast.success({ description: 'Filter created successfully' });
      }

      navigateWithSearch({});
    } catch (error) {
      console.error('Failed to save filter:', error);
      toast.error({ description: ((error as Error)?.message) || 'Failed to save filter. Please try again' });
    }
  };

  const handleCancelEdit = () => {
    setErrors({});
    navigateWithSearch({});
  };

  // --- Helper to clear errors on user interaction ---
  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  // Filter form handlers
  const updateFilterName = (name: string) => {
    setFilter({ ...filter, name });
    clearError('name');
  };
  const updateScope = (scope: 'all' | 'any' | 'all_messages') => setFilter({ ...filter, scope });

  const addRule = () => {
    setFilter({
      ...filter,
      rules: [...filter.rules, { id: Date.now().toString(), field: '', values: {} }],
    });
  };

  const removeRule = (id: string) => {
    if (filter.rules.length === 1) return;
    setFilter({ ...filter, rules: filter.rules.filter((rule) => rule.id !== id) });
    // Cleanup errors for this rule? (Optional optimization)
  };

  const updateRuleField = (id: string, field: string) => {
    setFilter({
      ...filter,
      rules: filter.rules.map((rule) => (rule.id === id ? { ...rule, field, values: {} } : rule)),
    });
    clearError(`${id}-root-field`);
  };

  const updateRuleValue = (id: string, path: string, value: string) => {
    setFilter({
      ...filter,
      rules: filter.rules.map((rule) =>
        rule.id === id ? { ...rule, values: { ...rule.values, [path]: value } } : rule
      ),
    });
    // This clearing logic is also handled inside RenderFields, but good to have context here
  };

  const addAction = () => {
    setFilter({
      ...filter,
      actions: [...filter.actions, { id: Date.now().toString(), type: '', values: {} }],
    });
  };

  const removeAction = (id: string) => {
    if (filter.actions.length === 1) return;
    setFilter({ ...filter, actions: filter.actions.filter((action) => action.id !== id) });
  };

  const updateActionType = (id: string, type: string) => {
    setFilter({
      ...filter,
      actions: filter.actions.map((action) =>
        action.id === id ? { ...action, type, values: {} } : action
      ),
    });
    clearError(`${id}-root-type`);
  };

  const updateActionValue = (id: string, name: string, value: unknown) => {
    setFilter({
      ...filter,
      actions: filter.actions.map((action) =>
        action.id === id ? { ...action, values: { ...action.values, [name]: value } } : action
      ),
    });
  };

  const showRules = filter.scope !== 'all_messages';
  const isSaving = createFilterMutation.isPending || updateFilterMutation.isPending;
  const isDeleting = deleteScriptMutation.isPending || deleteFilterMutation.isPending;

  // VIEW: LIST
  if (viewMode === 'list') {
    return (
      <>
        <div className="min-h-screen bg-[var(--gray-2)]">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-[var(--gray-12)]">
                  Filters
                </h1>
                <p className="text-sm text-[var(--gray-11)] mt-1">
                  Manage scripts and email filtering rules{' '}
                  <span
                    onClick={() => setShowTutorial(true)}
                    className="text-[var(--accent-9)] hover:text-[var(--accent-10)] cursor-pointer font-medium"
                  >
                    · Show tutorial
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg p-4">
                  <ScriptSelector
                    scripts={scripts}
                    active={activeScript}
                    selectedScript={selectedScript}
                    onSelectScript={setSelectedScript}
                    onCreateScript={() => setShowScriptDialog(true)}
                    onDeleteScript={handleDeleteScript}
                    onActivateScript={handleActivateScript}
                    isLoading={scriptsLoading}
                    onRenameScript={handleRenameScript}
                    onDownloadScript={handleDownloadScript}
                  />
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg p-4">
                  <FiltersList
                    filters={filters}
                    onCreateFilter={handleCreateFilter}
                    onEditFilter={handleEditFilter}
                    onDeleteFilter={handleDeleteFilter}
                    onToggleFilter={handleToggleFilter}
                    isGlobalProcessing={isGlobalDisabling}
                    onDisableAll={handleDisableAllFilters}
                    isLoading={filtersLoading}
                    hasScript={!!selectedScript}
                    isActiveSet={activeScript === selectedScript}
                    onActivateSet={() => handleActivateScript(selectedScript)}
                  />
                </div>
              </div>
            </div>
          </div>
          <CreateScriptDialog
            open={showScriptDialog}
            onOpenChange={setShowScriptDialog}
            onSubmit={handleCreateScript}
          />
        </div>
        <ConfirmationModal
          isOpen={deleteConfirm.isOpen}
          title={`Delete ${deleteConfirm.type === 'script' ? 'Script' : 'Filter'}?`}
          message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={deleteConfirm.type === 'script' ? confirmDeleteScript : confirmDeleteFilter}
          onCancel={() => setDeleteConfirm({ isOpen: false, type: null, name: '' })}
          isLoading={isDeleting}
        />

        <SieveTutorialModal
          isOpen={showTutorial}
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      </>
    );
  }

  // VIEW: LOADING
  if (filterLoading) {
    return (
      <div className="min-h-screen bg-[var(--gray-2)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // VIEW: EDIT/CREATE
  return (
    <div className="min-h-screen bg-[var(--gray-2)] p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-[var(--gray-12)]">
              {viewMode === 'edit' ? 'Edit Filter' : 'Create Filter'}
            </h1>
            <p className="text-sm text-[var(--gray-11)] mt-1">Filter set: {selectedScript}</p>
          </div>
          <button
            onClick={handleCancelEdit}
            className="p-2 text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
          >
            <BsX className="w-6 h-6" />
          </button>
        </div>
        {/* Filter Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--gray-12)]">
            Filter Name <span className="text-[var(--red-9)]">*</span>
          </label>
          <input
            type="text"
            value={filter.name}
            onChange={(e) => updateFilterName(e.target.value)}
            placeholder="e.g., Important client emails"
            className={`w-full px-3 py-2 border bg-[var(--gray-1)] text-[var(--gray-12)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] transition-all placeholder:text-[var(--gray-9)] disabled:opacity-50 ${
              errors['name']
                ? 'border-[var(--red-9)] focus:border-[var(--red-9)]'
                : 'border-[var(--gray-6)] hover:border-[var(--gray-7)]'
            }`}
          />
          {errors['name'] && <span className="text-xs text-[var(--red-9)]">{errors['name']}</span>}
        </div>
        {/* Scope */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--gray-12)]">
            Apply filter when
          </label>
          <CustomSelect
            value={filter.scope}
            onValueChange={(value) => updateScope(value as 'all' | 'any' | 'all_messages')}
            placeholder="Select scope"
            options={[
              { value: 'all', label: 'Matching all of the following rules' },
              { value: 'any', label: 'Matching any of the following rules' },
              // { value: 'all_messages', label: 'All messages' },
            ]}
            className="w-full"
          />
        </div>
        {/* Rules Section */}
        {showRules && (
          <>
            <div className="border-t border-[var(--gray-5)] my-6" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--gray-12)]">Rules</h3>
                <button
                  onClick={addRule}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--accent-11)] hover:bg-[var(--accent-3)] rounded-md transition-colors"
                >
                  + Add Rule
                </button>
              </div>

              <div className="space-y-2">
                {filter.rules.map((rule) => {
                  const selectedField = RULE_FIELDS.find((f) => f.value === rule.field);
                  const selectedOperator = selectedField?.operators[0];
                  const ruleError = errors[`${rule.id}-root-field`];

                  return (
                    <div
                      key={rule.id}
                      className="flex items-start gap-2 p-3 rounded-md bg-[var(--gray-1)] border border-[var(--gray-5)] hover:border-[var(--gray-6)] transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-2 flex-1 min-w-0">
                        <div className="w-full sm:w-auto sm:min-w-[140px]">
                          <CustomSelect
                            value={rule.field}
                            onValueChange={(value) => updateRuleField(rule.id, value)}
                            placeholder="Select field"
                            options={[
                              { value: '', label: 'Select field...' },
                              ...RULE_FIELDS.map((f) => ({ value: f.value, label: f.label })),
                            ]}
                            className={`w-full ${ruleError ? 'border-[var(--red-9)]' : ''}`}
                          />
                          {ruleError && (
                            <span className="text-xs text-[var(--red-9)] mt-1 block">
                              {ruleError}
                            </span>
                          )}
                        </div>

                        {selectedField && selectedOperator && (
                          <div className="flex-1 w-full min-w-0">
                            <RulesFieldRenderer
                              fields={selectedOperator.fields || []}
                              ruleId={rule.id}
                              pathPrefix="field"
                              rules={filter.rules}
                              updateRuleValue={updateRuleValue}
                              errors={errors}
                              onClearError={clearError}
                            />
                          </div>
                        )}
                      </div>

                      {filter.rules.length > 1 && (
                        <button
                          onClick={() => removeRule(rule.id)}
                          className="p-2 text-[var(--red-11)] hover:bg-[var(--red-3)] rounded-md transition-colors flex-shrink-0"
                        >
                          <BsTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {/* Actions Section */}
        <div className="border-t border-[var(--gray-5)] my-6" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--gray-12)]">Actions</h3>
            <button
              onClick={addAction}
              className="px-3 py-1.5 text-sm font-medium text-[var(--accent-11)] hover:bg-[var(--accent-3)] rounded-md transition-colors"
            >
              + Add Action
            </button>
          </div>

          <div className="space-y-2">
            {filter.actions.map((action) => {
              const selectedAction = ACTIONS.find((a) => a.value === action.type);
              const actionError = errors[`${action.id}-root-type`];

              return (
                <div
                  key={action.id}
                  className="flex items-start gap-2 p-3 rounded-md bg-[var(--gray-1)] border border-[var(--gray-5)] hover:border-[var(--gray-6)] transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="w-full">
                      <CustomSelect
                        value={action.type}
                        onValueChange={(value) => updateActionType(action.id, value)}
                        placeholder="Select action"
                        options={[
                          { value: '', label: 'Select action...' },
                          ...ACTIONS.map((a) => ({ value: a.value, label: a.label })),
                        ]}
                        className={`w-full ${actionError ? 'border-[var(--red-9)]' : ''}`}
                      />
                      {actionError && (
                        <span className="text-xs text-[var(--red-9)] mt-1 block">
                          {actionError}
                        </span>
                      )}
                    </div>

                    {selectedAction && selectedAction.fields.length > 0 && (
                      <div className="pl-4 border-l-2 border-[var(--accent-6)] py-1">
                        <ActionsFieldRenderer
                          fields={selectedAction.fields}
                          actionId={action.id}
                          values={action.values}
                          updateActionValue={updateActionValue}
                          errors={errors}
                          onClearError={clearError}
                        />
                      </div>
                    )}
                  </div>

                  {filter.actions.length > 1 && (
                    <button
                      onClick={() => removeAction(action.id)}
                      className="p-2 text-[var(--red-11)] hover:bg-[var(--red-3)] rounded-md transition-colors flex-shrink-0"
                    >
                      <BsTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--gray-5)]">
          <button
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveFilter}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {viewMode === 'edit' ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersManagement;
