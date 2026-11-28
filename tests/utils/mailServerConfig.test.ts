import { describe, expect, it } from 'vitest';
import {
  changedConfigFields,
  changesServers,
  configDetailLine,
  configMatches,
  configServersSummary,
  normalizeConfigForm,
  EMPTY_CONFIG_FORM,
} from '../../src/utils/mailServerConfig';
import type { MailServerConfig } from '../../src/api/admin-domain';

const config: MailServerConfig = {
  config_id: 1,
  config_name: 'Cloud A',
  smtp_host: 'mail.example.com',
  smtp_port: 587,
  imap_host: 'mail.example.com',
  imap_port: 993,
  sieve_host: 'mail.example.com',
  sieve_port: 4190,
  domain_count: 3,
  created_at: '',
  updated_at: '',
};

describe('configServersSummary', () => {
  it('shows one host when all services share it', () => {
    expect(configServersSummary(config)).toBe('mail.example.com');
  });

  it('names SMTP when only it differs', () => {
    expect(configServersSummary({ ...config, smtp_host: 'smtp.example.com' })).toBe(
      'mail.example.com · SMTP smtp.example.com'
    );
  });

  it('names every service when they all differ', () => {
    expect(
      configServersSummary({
        smtp_host: 'smtp.example.com',
        imap_host: 'imap.example.com',
        sieve_host: 'sieve.example.com',
      })
    ).toBe('IMAP imap.example.com · SMTP smtp.example.com · Sieve sieve.example.com');
  });
});

describe('normalizeConfigForm', () => {
  it('trims, lower-cases hosts and makes ports numbers', () => {
    expect(
      normalizeConfigForm({
        ...EMPTY_CONFIG_FORM,
        config_name: '  Cloud B ',
        imap_host: ' IMAP.Example.com ',
        imap_port: '143' as unknown as number,
      })
    ).toMatchObject({ config_name: 'Cloud B', imap_host: 'imap.example.com', imap_port: 143 });
  });
});

describe('changedConfigFields', () => {
  const form = {
    config_name: config.config_name,
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port,
    imap_host: config.imap_host,
    imap_port: config.imap_port,
    sieve_host: config.sieve_host,
    sieve_port: config.sieve_port,
  };

  it('is empty when nothing changed (case and spaces ignored on hosts)', () => {
    expect(changedConfigFields(config, { ...form, imap_host: ' MAIL.example.com' })).toEqual({});
  });

  it('a rename does not move domains', () => {
    const fields = changedConfigFields(config, { ...form, config_name: 'Cloud A2' });
    expect(fields).toEqual({ config_name: 'Cloud A2' });
    expect(changesServers(fields)).toBe(false);
  });

  it('a new server or port moves domains', () => {
    const fields = changedConfigFields(config, {
      ...form,
      imap_host: 'mail2.example.com',
      smtp_port: 465,
    });
    expect(fields).toEqual({ imap_host: 'mail2.example.com', smtp_port: 465 });
    expect(changesServers(fields)).toBe(true);
  });
});

describe('configDetailLine', () => {
  it('shows ports when the name is made from the hosts', () => {
    expect(configDetailLine({ ...config, config_name: 'mail.example.com' })).toBe(
      'SMTP 587 · IMAP 993 · SIEVE 4190'
    );
    expect(
      configDetailLine({
        ...config,
        smtp_host: 'smtp.example.net',
        config_name: 'mail.example.com (SMTP smtp.example.net)',
      })
    ).toBe('SMTP 587 · IMAP 993 · SIEVE 4190');
  });

  it('shows the servers when the name does not list them', () => {
    expect(configDetailLine(config)).toBe('mail.example.com');
  });
});

describe('configMatches', () => {
  it('matches the name or any host, ignoring case', () => {
    expect(configMatches(config, 'cloud a')).toBe(true);
    expect(configMatches(config, 'MAIL.EXAMPLE')).toBe(true);
    expect(configMatches(config, 'other')).toBe(false);
    expect(configMatches(config, '  ')).toBe(true);
  });
});
