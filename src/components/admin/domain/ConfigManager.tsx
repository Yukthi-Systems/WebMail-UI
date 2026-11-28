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

// The mail server configurations: list, create, edit, delete

import { useMemo, useState } from 'react';
import { AlertDialog } from '@radix-ui/themes';
import { FiEdit2, FiServer, FiTrash2 } from 'react-icons/fi';
import type { MailServerConfig } from '../../../api/admin-domain';
import { useDeleteConfig, useListConfigs } from '../../../hooks/useAdminDomain';
import { configServersSummary, MAIL_SERVICES } from '../../../utils/mailServerConfig';
import ConfigFormDialog from './ConfigFormDialog';

interface ConfigManagerProps {
  search: string;
  /** The "New configuration" dialog, opened from the page header. */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

function ConfigManager({ search, createOpen, onCreateOpenChange }: ConfigManagerProps) {
  const { data: configs = [], isLoading, error } = useListConfigs();
  const deleteMutation = useDeleteConfig();
  const [editing, setEditing] = useState<MailServerConfig | null>(null);
  const [deleting, setDeleting] = useState<MailServerConfig | null>(null);

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return configs;
    return configs.filter((config) =>
      [config.config_name, config.smtp_host, config.imap_host, config.sieve_host].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [configs, search]);

  return (
    <div className="bg-[var(--gray-2)] rounded-xl border border-[var(--gray-4)] overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center p-16 min-h-[300px]">
          <div className="w-10 h-10 border-4 border-[var(--gray-5)] border-t-[var(--accent-9)] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="p-10 text-center text-sm text-[var(--red-11)]">{error.message}</p>
      ) : configs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 min-h-[300px] text-center">
          <div className="w-16 h-16 rounded-xl bg-[var(--accent-3)] flex items-center justify-center mb-4">
            <FiServer className="w-8 h-8 text-[var(--accent-11)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--gray-12)] mb-1">No configurations yet</h3>
          <p className="text-sm text-[var(--gray-11)] mb-5 max-w-sm">
            Save your mail servers once, then pick them when adding domains.
          </p>
          <button
            onClick={() => onCreateOpenChange(true)}
            className="px-5 py-2.5 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white text-sm font-semibold rounded-lg"
          >
            New configuration
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--gray-3)] border-b-2 border-[var(--gray-5)] text-left">
                {['Name', 'Servers', 'Ports', 'Domains', ''].map((heading, index) => (
                  <th
                    key={index}
                    className={`py-3 px-6 text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide ${
                      heading === 'Domains' ? 'text-center' : ''
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[var(--gray-1)]">
              {shown.map((config) => (
                <tr
                  key={config.config_id}
                  className="border-b border-[var(--gray-4)] hover:bg-[var(--accent-2)] transition-colors"
                >
                  <td className="py-3 px-6">
                    <button
                      onClick={() => setEditing(config)}
                      className="font-semibold text-sm text-[var(--gray-12)] hover:text-[var(--accent-11)] hover:underline text-left"
                    >
                      {config.config_name}
                    </button>
                  </td>
                  <td className="py-3 px-6 font-mono text-xs text-[var(--gray-11)]">
                    {configServersSummary(config)}
                  </td>
                  <td className="py-3 px-6 font-mono text-xs text-[var(--gray-11)] whitespace-nowrap">
                    {MAIL_SERVICES.map((service) => (
                      <span key={service} className="mr-3">
                        <span className="text-[var(--gray-9)] uppercase">{service}</span>{' '}
                        {config[`${service}_port`]}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <span
                      className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold ${
                        config.domain_count
                          ? 'bg-[var(--accent-3)] text-[var(--accent-11)]'
                          : 'bg-[var(--gray-3)] text-[var(--gray-10)]'
                      }`}
                    >
                      {config.domain_count}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(config)}
                        aria-label={`Edit ${config.config_name}`}
                        title="Edit"
                        className="p-2 rounded-lg text-[var(--gray-11)] hover:bg-[var(--gray-4)] hover:text-[var(--gray-12)]"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(config)}
                        disabled={config.domain_count > 0}
                        aria-label={`Delete ${config.config_name}`}
                        title={
                          config.domain_count > 0
                            ? 'Move its domains to another configuration first'
                            : 'Delete'
                        }
                        className="p-2 rounded-lg text-[var(--red-11)] hover:bg-[var(--red-3)] disabled:text-[var(--gray-8)] disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-[var(--gray-10)]">
                    No configuration matches “{search.trim()}”
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="bg-[var(--gray-3)] px-6 py-3 border-t border-[var(--gray-5)] text-xs text-[var(--gray-11)]">
            {configs.length} configuration{configs.length === 1 ? '' : 's'} · Editing one moves all
            its domains to the new servers
          </div>
        </div>
      )}

      <ConfigFormDialog open={createOpen} onOpenChange={onCreateOpenChange} />
      <ConfigFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        config={editing}
      />

      <AlertDialog.Root open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialog.Content maxWidth="420px">
          <AlertDialog.Title>Delete configuration?</AlertDialog.Title>
          <AlertDialog.Description size="2">
            “{deleting?.config_name}” isn’t used by any domain. It will be removed permanently.
          </AlertDialog.Description>
          <div className="flex justify-end gap-2 mt-5">
            <AlertDialog.Cancel>
              <button className="px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-lg">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleting &&
                deleteMutation.mutate(deleting.config_id, { onSettled: () => setDeleting(null) })
              }
              className="px-4 py-2 text-sm font-semibold text-white bg-[var(--red-9)] hover:bg-[var(--red-10)] rounded-lg disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  );
}

export default ConfigManager;
