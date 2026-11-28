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

// Add or edit a domain: its name, whether it is active and its mail server configuration

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { FiArrowLeft, FiEdit2, FiPlus } from 'react-icons/fi';
import { Switch } from '@radix-ui/themes';
import { useAtomValue } from 'jotai';
import {
  useCreateDomain,
  useGetDomain,
  useListConfigs,
  useUpdateDomain,
} from '../../../hooks/useAdminDomain';
import { apiKeyAtom } from '../../../state/auth';
import type { MailServerConfig } from '../../../api/admin-domain';
import { MAIL_SERVICES } from '../../../utils/mailServerConfig';
import ConfigFormDialog from './ConfigFormDialog';
import ConfigPicker, { SSO_ONLY } from './ConfigPicker';

const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

const toSelection = (configId: number | null | undefined) =>
  configId == null ? SSO_ONLY : String(configId);

function DomainForm() {
  const navigate = useNavigate();
  const apiKey = useAtomValue(apiKeyAtom);
  const params = useParams({ strict: false }) as { domain?: string };
  const isEditMode = !!params.domain;

  const { data: domainData, isLoading } = useGetDomain(params.domain);
  const { data: configs = [], isLoading: configsLoading } = useListConfigs();
  const createMutation = useCreateDomain();
  const updateMutation = useUpdateDomain();

  const [domain, setDomain] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selection, setSelection] = useState('');
  const [errors, setErrors] = useState<{ domain?: string; config?: string }>({});
  const [configDialog, setConfigDialog] = useState<'new' | 'edit' | null>(null);

  const original = domainData?.data;
  useEffect(() => {
    if (isEditMode && original) {
      setDomain(original.domain);
      setIsActive(original.is_active);
      setSelection(toSelection(original.config_id));
    }
  }, [isEditMode, original]);

  // A new domain on the only configuration there is
  useEffect(() => {
    if (!isEditMode && !selection && configs.length === 1) {
      setSelection(String(configs[0].config_id));
    }
  }, [isEditMode, selection, configs]);

  useEffect(() => {
    if (!apiKey && !sessionStorage.getItem('apiKey')) {
      navigate({ to: '/1219/admin/login' });
    }
  }, [apiKey, navigate]);

  const selectedConfig = useMemo(
    () => configs.find((config) => String(config.config_id) === selection) ?? null,
    [configs, selection]
  );
  // Other domains on the selected configuration (editing it changes them too)
  const otherDomains = selectedConfig
    ? selectedConfig.domain_count -
      (isEditMode && original?.config_id === selectedConfig.config_id ? 1 : 0)
    : 0;

  const isDirty =
    !isEditMode ||
    (!!original &&
      (original.is_active !== isActive || toSelection(original.config_id) !== selection));
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = domain.trim().toLowerCase();
    const found: typeof errors = {};
    if (!isEditMode) {
      if (!name) found.domain = 'Domain name is required';
      else if (!DOMAIN_PATTERN.test(name)) found.domain = 'Enter a domain like example.com';
    }
    if (!selection) found.config = 'Choose a mail server configuration';
    setErrors(found);
    if (found.domain || found.config) return;

    const config_id = selection === SSO_ONLY ? null : Number(selection);
    const done = { onSuccess: () => navigate({ to: '/1219/admin/domain' }) };
    if (isEditMode && params.domain) {
      updateMutation.mutate(
        { domain: params.domain, data: { is_active: isActive, config_id } },
        done
      );
    } else {
      createMutation.mutate({ domain: name, is_active: isActive, config_id }, done);
    }
  };

  const onConfigSaved = (config: MailServerConfig) => {
    setSelection(String(config.config_id));
    setErrors((previous) => ({ ...previous, config: undefined }));
  };

  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-[var(--gray-2)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fieldClass = (error?: string, extra = '') =>
    `w-full px-4 py-2.5 bg-[var(--gray-1)] border rounded-lg text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 transition-all ${
      error
        ? 'border-[var(--red-9)] focus:ring-[var(--red-8)]'
        : 'border-[var(--gray-6)] focus:ring-[var(--accent-8)] focus:border-[var(--accent-9)]'
    } ${extra}`;

  return (
    <div className="min-h-screen bg-[var(--gray-2)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate({ to: '/1219/admin/domain' })}
            className="inline-flex items-center gap-2 text-sm text-[var(--gray-11)] hover:text-[var(--gray-12)] mb-3 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to domains
          </button>
          <h1 className="text-3xl font-semibold text-[var(--gray-12)]">
            {isEditMode ? 'Edit Domain' : 'Add New Domain'}
          </h1>
          <p className="text-[var(--gray-11)] mt-2">
            Pick the mail server configuration this domain uses
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {/* Domain */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--gray-12)] uppercase tracking-wider">
              Domain
            </h2>
            <div className="space-y-1.5">
              <label htmlFor="domain" className="block text-sm font-medium text-[var(--gray-12)]">
                Domain name {!isEditMode && <span className="text-[var(--red-9)]">*</span>}
              </label>
              <input
                id="domain"
                type="text"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={!isEditMode}
                placeholder="example.com"
                readOnly={isEditMode}
                value={domain}
                onChange={(event) => {
                  setDomain(event.target.value);
                  if (errors.domain) setErrors((previous) => ({ ...previous, domain: undefined }));
                }}
                className={fieldClass(
                  errors.domain,
                  `font-mono ${isEditMode ? 'bg-[var(--gray-3)] cursor-not-allowed' : ''}`
                )}
              />
              {errors.domain ? (
                <p className="text-sm text-[var(--red-11)]">{errors.domain}</p>
              ) : (
                isEditMode && (
                  <p className="text-xs text-[var(--gray-11)]">Domain name cannot be changed</p>
                )
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm font-medium text-[var(--gray-12)]">Domain is active</span>
            </label>
          </section>

          <div className="border-t border-[var(--gray-5)]" />

          {/* Mail server */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--gray-12)] uppercase tracking-wider">
                Mail server
              </h2>
              <button
                type="button"
                onClick={() => setConfigDialog('new')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-11)] hover:text-[var(--accent-12)]"
              >
                <FiPlus className="w-4 h-4" />
                New configuration
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="config" className="block text-sm font-medium text-[var(--gray-12)]">
                Configuration <span className="text-[var(--red-9)]">*</span>
              </label>
              <ConfigPicker
                id="config"
                configs={configs}
                value={selection}
                loading={configsLoading}
                error={errors.config}
                onChange={(next) => {
                  setSelection(next);
                  if (errors.config) setErrors((previous) => ({ ...previous, config: undefined }));
                }}
              />
              {errors.config && <p className="text-sm text-[var(--red-11)]">{errors.config}</p>}
            </div>

            {selectedConfig && (
              <div className="rounded-xl border border-[var(--gray-5)] bg-[var(--gray-1)] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[var(--gray-3)] border-b border-[var(--gray-5)]">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--gray-12)] truncate">
                      {selectedConfig.config_name}
                    </div>
                    <div className="text-xs text-[var(--gray-11)]">
                      {otherDomains > 0
                        ? `Also used by ${otherDomains} other domain${otherDomains === 1 ? '' : 's'}`
                        : 'Not used by other domains'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigDialog('edit')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md shrink-0"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
                <dl className="divide-y divide-[var(--gray-4)]">
                  {MAIL_SERVICES.map((service) => (
                    <div
                      key={service}
                      className="grid grid-cols-[64px_1fr_auto] gap-3 px-4 py-2 text-sm"
                    >
                      <dt className="font-semibold text-[var(--gray-11)] uppercase text-xs pt-0.5">
                        {service}
                      </dt>
                      <dd className="font-mono text-xs text-[var(--gray-12)] break-all pt-0.5">
                        {selectedConfig[`${service}_host`]}
                      </dd>
                      <dd className="font-mono text-xs text-[var(--gray-11)] pt-0.5">
                        {selectedConfig[`${service}_port`]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {selection === SSO_ONLY && (
              <p className="text-sm text-[var(--gray-11)] p-3 rounded-lg bg-[var(--gray-3)]">
                Internal domain: its users sign in with SSO only, there is no password sign-in.
              </p>
            )}
          </section>

          <div className="border-t border-[var(--gray-5)]" />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: '/1219/admin/domain' })}
              className="px-5 py-2.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !isDirty}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isEditMode ? 'Update Domain' : 'Create Domain'}
            </button>
          </div>
        </form>
      </div>

      <ConfigFormDialog
        open={configDialog === 'new'}
        onOpenChange={(open) => !open && setConfigDialog(null)}
        onSaved={onConfigSaved}
      />
      <ConfigFormDialog
        open={configDialog === 'edit'}
        onOpenChange={(open) => !open && setConfigDialog(null)}
        config={selectedConfig}
        onSaved={onConfigSaved}
      />
    </div>
  );
}

export default DomainForm;
