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

// Mail server configurations of the admin screen (shared by the domains on the same servers)

import type { MailServerConfig, MailServerConfigData } from '../api/admin-domain';

export const MAIL_SERVICES = ['smtp', 'imap', 'sieve'] as const;
export type MailService = (typeof MAIL_SERVICES)[number];

export const DEFAULT_PORTS: Record<MailService, number> = { smtp: 587, imap: 993, sieve: 4190 };

export const EMPTY_CONFIG_FORM: MailServerConfigData = {
  config_name: '',
  smtp_host: '',
  smtp_port: DEFAULT_PORTS.smtp,
  imap_host: '',
  imap_port: DEFAULT_PORTS.imap,
  sieve_host: '',
  sieve_port: DEFAULT_PORTS.sieve,
};

type Servers = Pick<MailServerConfig, 'smtp_host' | 'imap_host' | 'sieve_host'>;

/**
 * The servers in a line: one host if all three are the same, otherwise each by
 * service.
 */
export const configServersSummary = (config: Servers): string => {
  const { smtp_host, imap_host, sieve_host } = config;
  if (smtp_host === imap_host && imap_host === sieve_host) return imap_host;
  if (imap_host === sieve_host) return `${imap_host} · SMTP ${smtp_host}`;
  return `IMAP ${imap_host} · SMTP ${smtp_host} · Sieve ${sieve_host}`;
};

export const configToForm = (config: MailServerConfig): MailServerConfigData => ({
  config_name: config.config_name,
  smtp_host: config.smtp_host,
  smtp_port: config.smtp_port,
  imap_host: config.imap_host,
  imap_port: config.imap_port,
  sieve_host: config.sieve_host,
  sieve_port: config.sieve_port,
});

/** The form, trimmed (hosts are stored in lower case) */
export const normalizeConfigForm = (form: MailServerConfigData): MailServerConfigData => ({
  config_name: form.config_name.trim(),
  smtp_host: form.smtp_host.trim().toLowerCase(),
  smtp_port: Number(form.smtp_port),
  imap_host: form.imap_host.trim().toLowerCase(),
  imap_port: Number(form.imap_port),
  sieve_host: form.sieve_host.trim().toLowerCase(),
  sieve_port: Number(form.sieve_port),
});

/**
 * The fields of an edited configuration that changed (the API changes only the
 * fields sent)
 */
export const changedConfigFields = (
  config: MailServerConfig,
  form: MailServerConfigData
): Partial<MailServerConfigData> => {
  const before = configToForm(config);
  const after = normalizeConfigForm(form);
  return Object.fromEntries(
    (Object.keys(after) as (keyof MailServerConfigData)[])
      .filter((key) => after[key] !== before[key])
      .map((key) => [key, after[key]])
  );
};

/**
 * Whether changing these fields moves the configuration's domains to other
 * servers.
 */
export const changesServers = (fields: Partial<MailServerConfigData>): boolean =>
  Object.keys(fields).some((key) => key !== 'config_name');

/** Whether the name already lists every host (names made from the hosts do) */
export const nameListsServers = (
  config: Servers & Pick<MailServerConfig, 'config_name'>
): boolean => {
  const name = config.config_name.toLowerCase();
  return [config.smtp_host, config.imap_host, config.sieve_host].every((host) =>
    name.includes(host.toLowerCase())
  );
};

/** The ports in a line, e.g. "587 · 993 · 4190" with each service named. */
export const configPortsSummary = (config: Pick<MailServerConfig, `${MailService}_port`>): string =>
  MAIL_SERVICES.map((service) => `${service.toUpperCase()} ${config[`${service}_port`]}`).join(
    ' · '
  );

/**
 * A configuration's second line in a picker: its servers, unless the name lists
 * them, then its ports.
 */
export const configDetailLine = (config: MailServerConfig): string =>
  nameListsServers(config) ? configPortsSummary(config) : configServersSummary(config);

/** Whether a configuration matches a search (name or any host) */
export const configMatches = (config: MailServerConfig, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [config.config_name, config.smtp_host, config.imap_host, config.sieve_host].some((value) =>
    value.toLowerCase().includes(needle)
  );
};
