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

// Pick a domain's mail server configuration: a searchable list, one or two short lines per configuration

import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from '@radix-ui/themes';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';
import type { MailServerConfig } from '../../../api/admin-domain';
import { configDetailLine, configMatches } from '../../../utils/mailServerConfig';

/** The value for a domain without a mail server (SSO sign-in only) */
export const SSO_ONLY = 'sso';

type Option = { value: string; title: string; detail: string; meta?: string };

interface ConfigPickerProps {
  id?: string;
  configs: MailServerConfig[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  error?: string;
}

function ConfigPicker({ id, configs, value, onChange, loading, error }: ConfigPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const options = useMemo<Option[]>(
    () => [
      ...configs
        .filter((config) => configMatches(config, query))
        .map((config) => ({
          value: String(config.config_id),
          title: config.config_name,
          detail: configDetailLine(config),
          meta: `${config.domain_count} domain${config.domain_count === 1 ? '' : 's'}`,
        })),
      ...(!query.trim() || 'sso only no mail server internal'.includes(query.trim().toLowerCase())
        ? [
            {
              value: SSO_ONLY,
              title: 'No mail server',
              detail: 'SSO sign-in only (internal domain)',
            },
          ]
        : []),
    ],
    [configs, query]
  );

  const selected = useMemo(() => {
    if (value === SSO_ONLY) return { title: 'No mail server', detail: 'SSO sign-in only' };
    const config = configs.find((item) => String(item.config_id) === value);
    return config ? { title: config.config_name, detail: configDetailLine(config) } : null;
  }, [configs, value]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(
      Math.max(
        0,
        options.findIndex((option) => option.value === value)
      )
    );
    // Only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (option?: Option) => {
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(options[active]);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          id={id}
          type="button"
          disabled={loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`w-full flex items-center gap-3 px-4 py-2.5 bg-[var(--gray-1)] border rounded-lg text-left focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
            error
              ? 'border-[var(--red-9)] focus:ring-[var(--red-8)]'
              : 'border-[var(--gray-6)] focus:ring-[var(--accent-8)] focus:border-[var(--accent-9)]'
          }`}
        >
          <span className="flex-1 min-w-0">
            {selected ? (
              <>
                <span className="block truncate text-sm font-medium text-[var(--gray-12)]">
                  {selected.title}
                </span>
                <span className="block truncate text-xs font-mono text-[var(--gray-10)]">
                  {selected.detail}
                </span>
              </>
            ) : (
              <span className="block text-sm text-[var(--gray-9)] py-[9px]">
                {loading
                  ? 'Loading configurations…'
                  : configs.length
                    ? 'Choose a configuration'
                    : 'No configurations yet — create one'}
              </span>
            )}
          </span>
          <FiChevronDown className="w-4 h-4 shrink-0 text-[var(--gray-10)]" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        align="start"
        sideOffset={4}
        className="!p-0 overflow-hidden"
        style={{ width: 'var(--radix-popover-trigger-width)', maxWidth: 'calc(100vw - 32px)' }}
      >
        <div className="flex items-center gap-2 px-3 border-b border-[var(--gray-5)]">
          <FiSearch className="w-4 h-4 text-[var(--gray-9)] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search name or server…"
            aria-label="Search configurations"
            className="w-full py-2.5 bg-transparent text-sm text-[var(--gray-12)] placeholder:text-[var(--gray-9)] outline-none"
          />
        </div>
        <div ref={listRef} role="listbox" className="max-h-[320px] overflow-y-auto py-1">
          {options.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-[var(--gray-10)]">
              No configuration matches “{query.trim()}”
            </p>
          )}
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                title={`${option.title}\n${option.detail}`}
                onMouseMove={() => setActive(index)}
                onClick={() => choose(option)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                  index === active ? 'bg-[var(--accent-3)]' : ''
                } ${option.value === SSO_ONLY ? 'border-t border-[var(--gray-4)] mt-1' : ''}`}
              >
                <span className="w-4 shrink-0">
                  {isSelected && <FiCheck className="w-4 h-4 text-[var(--accent-11)]" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-[var(--gray-12)]">
                    {option.title}
                  </span>
                  <span className="block truncate text-xs font-mono text-[var(--gray-10)]">
                    {option.detail}
                  </span>
                </span>
                {option.meta && (
                  <span className="shrink-0 text-[11px] text-[var(--gray-10)]">{option.meta}</span>
                )}
              </div>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

export default ConfigPicker;
