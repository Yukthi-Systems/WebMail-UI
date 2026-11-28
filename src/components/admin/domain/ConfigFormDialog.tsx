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

// Create or edit a mail server configuration

import { useEffect, useState } from 'react';
import { Dialog } from '@radix-ui/themes';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import type { MailServerConfig, MailServerConfigData } from '../../../api/admin-domain';
import { useCreateConfig, useUpdateConfig } from '../../../hooks/useAdminDomain';
import {
  EMPTY_CONFIG_FORM,
  MAIL_SERVICES,
  changedConfigFields,
  changesServers,
  configToForm,
  normalizeConfigForm,
  type MailService,
} from '../../../utils/mailServerConfig';

const SERVICE_LABELS: Record<MailService, { title: string; hint: string; placeholder: string }> = {
  smtp: { title: 'SMTP', hint: 'Sending', placeholder: 'smtp.example.com' },
  imap: { title: 'IMAP', hint: 'Mailbox', placeholder: 'imap.example.com' },
  sieve: { title: 'Sieve', hint: 'Filters', placeholder: 'sieve.example.com' },
};

type Errors = Partial<Record<keyof MailServerConfigData, string>>;

const validate = (form: MailServerConfigData): Errors => {
  const errors: Errors = {};
  if (form.config_name.trim().length > 100) errors.config_name = 'At most 100 characters';
  for (const service of MAIL_SERVICES) {
    const host = form[`${service}_host`].trim();
    if (!host) errors[`${service}_host`] = 'Required';
    else if (/\s/.test(host) || host.length > 255) errors[`${service}_host`] = 'Not a valid host';
    const port = Number(form[`${service}_port`]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) errors[`${service}_port`] = '1–65535';
  }
  return errors;
};

const inputClass = (error?: string, extra = '') =>
  `w-full px-3 py-2 bg-[var(--gray-1)] border rounded-lg text-sm text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 transition-all ${
    error
      ? 'border-[var(--red-9)] focus:ring-[var(--red-8)]'
      : 'border-[var(--gray-6)] focus:ring-[var(--accent-8)] focus:border-[var(--accent-9)]'
  } ${extra}`;

interface ConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The configuration to edit; create a new one when absent. */
  config?: MailServerConfig | null;
  /** Called with the created or edited configuration. */
  onSaved?: (config: MailServerConfig) => void;
}

function ConfigFormDialog({ open, onOpenChange, config, onSaved }: ConfigFormDialogProps) {
  const isEdit = !!config;
  const [form, setForm] = useState<MailServerConfigData>(EMPTY_CONFIG_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const createMutation = useCreateConfig();
  const updateMutation = useUpdateConfig();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(config ? configToForm(config) : EMPTY_CONFIG_FORM);
    setErrors({});
  }, [open, config]);

  const changed = config ? changedConfigFields(config, form) : null;
  const movesDomains = !!config && !!changed && changesServers(changed) && config.domain_count > 0;

  const setField = <K extends keyof MailServerConfigData>(
    key: K,
    value: MailServerConfigData[K]
  ) => {
    setForm((previous) => {
      const next = { ...previous, [key]: value };
      // Most setups use one host for all three: the SMTP host fills in IMAP and Sieve
      // while they are empty or still follow it
      if (key === 'smtp_host') {
        for (const service of ['imap', 'sieve'] as const) {
          const current = previous[`${service}_host`];
          if (!current || current === previous.smtp_host) next[`${service}_host`] = value as string;
        }
      }
      return next;
    });
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    if (isEdit && !form.config_name.trim()) found.config_name = 'A configuration needs a name';
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const done = (saved: MailServerConfig) => {
      onSaved?.(saved);
      onOpenChange(false);
    };
    if (config) {
      if (!changed || Object.keys(changed).length === 0) {
        onOpenChange(false);
        return;
      }
      updateMutation.mutate({ configId: config.config_id, data: changed }, { onSuccess: done });
    } else {
      createMutation.mutate(normalizeConfigForm(form), { onSuccess: done });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <Dialog.Content maxWidth="560px" aria-describedby={undefined}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <Dialog.Title mb="1">
                {isEdit ? 'Edit configuration' : 'New mail server configuration'}
              </Dialog.Title>
              <p className="text-sm text-[var(--gray-11)]">
                {isEdit
                  ? `Used by ${config.domain_count} domain${config.domain_count === 1 ? '' : 's'}`
                  : 'Domains you add can then pick it instead of typing servers again'}
              </p>
            </div>
            <Dialog.Close>
              <button
                type="button"
                aria-label="Close"
                className="p-1.5 rounded-lg text-[var(--gray-11)] hover:bg-[var(--gray-4)]"
              >
                <FiX className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="config_name"
                className="block text-sm font-medium text-[var(--gray-12)]"
              >
                Name{' '}
                {!isEdit && <span className="text-[var(--gray-9)] font-normal">(optional)</span>}
              </label>
              <input
                id="config_name"
                type="text"
                autoFocus
                maxLength={100}
                placeholder={isEdit ? '' : 'e.g. Cloud 27 — named after the servers if empty'}
                value={form.config_name}
                onChange={(event) => setField('config_name', event.target.value)}
                className={inputClass(errors.config_name)}
              />
              {errors.config_name && (
                <p className="text-xs text-[var(--red-11)]">{errors.config_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[72px_1fr_96px] gap-2 text-xs font-medium text-[var(--gray-11)]">
                <span />
                <span>Server</span>
                <span>Port</span>
              </div>
              {MAIL_SERVICES.map((service) => {
                const hostError = errors[`${service}_host`];
                const portError = errors[`${service}_port`];
                return (
                  <div key={service} className="grid grid-cols-[72px_1fr_96px] gap-2 items-start">
                    <div className="pt-2 leading-tight">
                      <div className="text-sm font-semibold text-[var(--gray-12)]">
                        {SERVICE_LABELS[service].title}
                      </div>
                      <div className="text-[11px] text-[var(--gray-10)]">
                        {SERVICE_LABELS[service].hint}
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        aria-label={`${SERVICE_LABELS[service].title} server`}
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={SERVICE_LABELS[service].placeholder}
                        value={form[`${service}_host`]}
                        onChange={(event) => setField(`${service}_host`, event.target.value)}
                        className={inputClass(hostError, 'font-mono')}
                      />
                      {hostError && (
                        <p className="text-xs text-[var(--red-11)] mt-1">{hostError}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`${SERVICE_LABELS[service].title} port`}
                        min={1}
                        max={65535}
                        value={Number.isNaN(form[`${service}_port`]) ? '' : form[`${service}_port`]}
                        onChange={(event) =>
                          setField(`${service}_port`, event.target.valueAsNumber)
                        }
                        className={inputClass(portError, 'font-mono')}
                      />
                      {portError && (
                        <p className="text-xs text-[var(--red-11)] mt-1">{portError}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {!isEdit && (
                <p className="text-xs text-[var(--gray-10)] pl-[80px]">
                  The SMTP server fills in IMAP and Sieve; change them if they differ.
                </p>
              )}
            </div>

            {movesDomains && (
              <div className="flex gap-2.5 p-3 rounded-lg bg-[var(--amber-3)] border border-[var(--amber-6)] text-sm text-[var(--amber-12)]">
                <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--amber-11)]" />
                <span>
                  All {config.domain_count} domain{config.domain_count === 1 ? '' : 's'} on this
                  configuration will use the new servers. Users already signed in switch at their
                  next sign-in.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close>
              <button
                type="button"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="submit"
              disabled={isPending || (isEdit && Object.keys(changed ?? {}).length === 0)}
              className="px-4 py-2 text-sm font-semibold text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isEdit ? 'Save changes' : 'Create configuration'}
            </button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default ConfigFormDialog;
