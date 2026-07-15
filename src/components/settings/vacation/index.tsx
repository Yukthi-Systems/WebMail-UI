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

import React, { useState, useEffect, useCallback } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { BsCalendar3, BsEnvelope, BsClock, BsInfoCircle, BsCheckCircleFill } from 'react-icons/bs';
import {
  useScripts,
  useScriptRaw,
  useCreateScript,
  useEnableScript,
} from '../../../hooks/useSieve';
import { useToast } from '../../ui/ToastComponent';
import {
  type VacationSettings,
  DEFAULT_VACATION_SETTINGS,
  buildScriptWithVacation,
  parseVacationFromScript,
  updateScriptContent,
} from './vacation-transform';

const DEFAULT_VACATION_SCRIPT_NAME = 'vacation-autoreply';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-1.5 bg-[var(--accent-3)] rounded-md">
      <Icon className="w-4 h-4 text-[var(--accent-9)]" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-[var(--gray-12)]">{title}</h3>
      {subtitle && <p className="text-xs text-[var(--gray-11)]">{subtitle}</p>}
    </div>
  </div>
);

// Add this component at the top of the file alongside Field/SectionHeader
const Tooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <BsInfoCircle
        className="w-3 h-3 text-[var(--gray-10)] hover:text-[var(--gray-11)] cursor-pointer transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-56 px-3 py-2 text-xs text-[var(--gray-12)] bg-[var(--gray-2)] border border-[var(--gray-6)] rounded-md shadow-lg leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
};

const Field = ({
  label,
  required,
  hint,
  tooltip,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  tooltip?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-[var(--gray-12)]">
      {label}
      {required && <span className="text-[var(--red-9)] ml-0.5">*</span>}
      {tooltip && <Tooltip text={tooltip} />}
    </label>
    {children}
    {hint && <p className="text-xs text-[var(--gray-11)]">{hint}</p>}
  </div>
);
const inputClass =
  'w-full px-3 py-2 border border-[var(--gray-6)] bg-[var(--gray-1)] text-[var(--gray-12)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] transition-all hover:border-[var(--gray-7)] placeholder:text-[var(--gray-9)] text-sm';

export const VacationTab: React.FC = () => {
  const toast = useToast();
  const { data: scriptsData, isLoading: scriptsLoading } = useScripts();
  const createScriptMutation = useCreateScript();
  const enableScriptMutation = useEnableScript();

  const activeScript = scriptsData?.scripts.active || '';
  const targetScript = activeScript || DEFAULT_VACATION_SCRIPT_NAME;
  const isCreatingNewScript = !activeScript;

  const { data: rawScriptData, isLoading: rawLoading } = useScriptRaw(activeScript, !!activeScript);

  const [settings, setSettings] = useState<VacationSettings>(DEFAULT_VACATION_SETTINGS);
  const [rawScript, setRawScript] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!activeScript) {
      setRawScript('');
      setSettings(DEFAULT_VACATION_SETTINGS);
      return;
    }
    const raw: string = (rawScriptData as any)?.raw_data || '';
    setRawScript(raw);
    setSettings(parseVacationFromScript(raw) ?? DEFAULT_VACATION_SETTINGS);
  }, [rawScriptData, activeScript]);

  const handleSave = async () => {
    if (settings.enabled) {
      if (!settings.subject.trim()) {
        toast.error({ description: 'Subject is required' });
        return;
      }
      if (!settings.body.trim()) {
        toast.error({ description: 'Message body is required' });
        return;
      }
      if (!settings.ruleName.trim()) {
        toast.error({ description: 'Rule name is required' });
        return;
      }
      if (
        settings.schedule.enabled &&
        settings.schedule.startDate &&
        settings.schedule.endDate &&
        settings.schedule.startDate > settings.schedule.endDate
      ) {
        toast.error({ description: 'Start date must be before end date' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const newContent = buildScriptWithVacation(rawScript, settings);
      await updateScriptContent(targetScript, newContent, (args) =>
        createScriptMutation.mutateAsync(args)
      );
      if (isCreatingNewScript) await enableScriptMutation.mutateAsync(targetScript);
      setRawScript(newContent);
      toast.success({ description: 'Vacation settings saved successfully' });
    } catch (error: any) {
      toast.error({ description: error?.message || 'Failed to save vacation settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const update = useCallback(
    <K extends keyof VacationSettings>(key: K, value: VacationSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    []
  );

  const updateSchedule = useCallback(
    <K extends keyof VacationSettings['schedule']>(
      key: K,
      value: VacationSettings['schedule'][K]
    ) => setSettings((prev) => ({ ...prev, schedule: { ...prev.schedule, [key]: value } })),
    []
  );

  const toggleDay = useCallback((day: number) => {
    setSettings((prev) => {
      const { activeDays } = prev.schedule;
      const next = activeDays.includes(day)
        ? activeDays.filter((d) => d !== day)
        : [...activeDays, day];
      return { ...prev, schedule: { ...prev.schedule, activeDays: next } };
    });
  }, []);

  if (rawLoading || scriptsLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-8 space-y-5">
      {/* Enable toggle card */}
      <div className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--gray-12)]">Vacation Auto-Reply</h3>
            <p className="text-sm text-[var(--gray-11)] mt-0.5">
              Automatically reply to incoming emails while you're away
            </p>
          </div>
          <Switch.Root
            checked={settings.enabled}
            onCheckedChange={(v) => update('enabled', v)}
            className="w-11 h-6 bg-[var(--gray-6)] rounded-full relative data-[state=checked]:bg-[var(--accent-9)] transition-colors outline-none cursor-pointer flex-shrink-0"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow translate-x-0.5 data-[state=checked]:translate-x-[22px] transition-transform" />
          </Switch.Root>
        </div>
        {settings.enabled && (
          <div className="mt-3 pt-3 border-t border-[var(--gray-5)]">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--green-11)] bg-[var(--green-3)] border border-[var(--green-6)] px-2.5 py-1 rounded-full">
              <BsCheckCircleFill className="w-3 h-3" />
              Vacation replies enabled
            </span>
          </div>
        )}
      </div>

      {settings.enabled && (
        <>
          {/* Reply Message */}
          <div className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg p-5 space-y-4">
            <SectionHeader
              icon={BsEnvelope}
              title="Reply Message"
              subtitle="The auto-reply sent to incoming emails"
            />

            {/* <Field
              label="Rule Name"
              required
              hint="Used to identify this vacation rule in your filter list"
              tooltip="A unique name for this vacation rule"
            >
              <input
                type="text"
                value={settings.ruleName}
                onChange={(e) => update('ruleName', e.target.value)}
                placeholder="e.g., vacation-reply"
                className={inputClass}
              />
            </Field> */}

            <Field
              label="Subject"
              required
              tooltip="The subject line of the auto-reply email that senders will receive. Keep it clear so recipients know you're away."
            >
              <input
                type="text"
                value={settings.subject}
                onChange={(e) => update('subject', e.target.value)}
                placeholder="e.g., Out of Office: Back on March 20th"
                className={inputClass}
              />
            </Field>

            <Field
              label="Message Body"
              required
              tooltip="The full text of your auto-reply. Let senders know when you'll be back, and optionally who to contact for urgent matters."
            >
              <textarea
                value={settings.body}
                onChange={(e) => update('body', e.target.value)}
                placeholder="Hi, I'm currently out of the office..."
                rows={6}
                className={`${inputClass} resize-y`}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Reply From Address"
                hint="Leave empty to use your default address"
                tooltip="The email address that will appear as the sender of the auto-reply. If left empty, your account's default address is used."
              >
                <input
                  type="email"
                  value={settings.fromAddress}
                  onChange={(e) => update('fromAddress', e.target.value)}
                  placeholder="sender@example.com"
                  className={inputClass}
                />
              </Field>
              <Field
                label="My Email Addresses"
                hint="Comma-separated, prevents reply loops"
                tooltip="All email addresses that belong to you. The server uses this list to avoid sending auto-replies to your own messages or creating infinite reply loops."
              >
                <input
                  type="text"
                  value={settings.myAddresses}
                  onChange={(e) => update('myAddresses', e.target.value)}
                  placeholder="me@example.com, alias@example.com"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label="Reply Interval (days)"
              hint="Minimum days between auto-replies to the same sender"
              tooltip="If the same person emails you multiple times, they'll only receive one auto-reply per this many days. Prevents spamming frequent senders. Default is 1 day."
            >
              <input
                type="number"
                min={1}
                value={settings.daysInterval}
                onChange={(e) =>
                  update('daysInterval', Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className={`${inputClass} max-w-[140px]`}
              />
            </Field>
          </div>

          {/* Schedule */}
          <div className="bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <SectionHeader
                icon={BsCalendar3}
                title="Schedule"
                subtitle="Limit replies to a specific date range and days"
              />
              <Switch.Root
                checked={settings.schedule.enabled}
                onCheckedChange={(v) => updateSchedule('enabled', v)}
                className="w-10 h-5 bg-[var(--gray-6)] rounded-full relative data-[state=checked]:bg-[var(--accent-9)] transition-colors outline-none cursor-pointer flex-shrink-0 mt-1"
              >
                <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow translate-x-0.5 data-[state=checked]:translate-x-5 transition-transform" />
              </Switch.Root>
            </div>

            {settings.schedule.enabled ? (
              <div className="space-y-5">
                {/* Date Range */}
                <div>
                  <p className="text-xs font-medium text-[var(--gray-11)] uppercase tracking-wide mb-2">
                    Date Range
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Start Date">
                      <input
                        type="date"
                        value={settings.schedule.startDate}
                        onChange={(e) => updateSchedule('startDate', e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="End Date">
                      <input
                        type="date"
                        value={settings.schedule.endDate}
                        onChange={(e) => updateSchedule('endDate', e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  {settings.schedule.startDate && settings.schedule.endDate && (
                    <p className="text-xs text-[var(--accent-11)] mt-2 font-medium">
                      Active from <strong>{settings.schedule.startDate}</strong> to{' '}
                      <strong>{settings.schedule.endDate}</strong>
                    </p>
                  )}
                </div>

                {/* Days of Week */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BsClock className="w-3 h-3 text-[var(--gray-11)]" />
                    <p className="text-xs font-medium text-[var(--gray-11)] uppercase tracking-wide">
                      Active Days
                    </p>
                    <span className="text-xs text-[var(--gray-10)]">— blank = all days</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(({ value, label }) => {
                      const active = settings.schedule.activeDays.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleDay(value)}
                          className={`px-3.5 py-1.5 text-sm font-medium rounded-md border transition-all ${
                            active
                              ? 'bg-[var(--accent-9)] text-white border-[var(--accent-9)] shadow-sm'
                              : 'bg-[var(--gray-1)] text-[var(--gray-11)] border-[var(--gray-6)] hover:border-[var(--gray-8)] hover:text-[var(--gray-12)]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {settings.schedule.activeDays.length > 0 && (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-[var(--gray-11)]">
                        {settings.schedule.activeDays.length} day
                        {settings.schedule.activeDays.length !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        type="button"
                        onClick={() => updateSchedule('activeDays', [])}
                        className="text-xs text-[var(--red-10)] hover:text-[var(--red-11)] underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <ScheduleSummary settings={settings} />
              </div>
            ) : (
              <p className="text-sm text-[var(--gray-11)] py-1">
                No schedule — vacation replies fire for <strong>all incoming emails</strong> while
                enabled.
              </p>
            )}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--gray-5)]">
        <p className="text-xs text-[var(--gray-10)]">
          {isCreatingNewScript
            ? 'Will create a new vacation script on save'
            : 'Changes are written directly to the active script'}
        </p>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 text-sm font-medium text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isSaving ? 'Saving...' : 'Save Vacation Settings'}
        </button>
      </div>
    </div>
  );
};

const ScheduleSummary = ({ settings }: { settings: VacationSettings }) => {
  const { schedule } = settings;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const parts: string[] = [];

  if (schedule.startDate && schedule.endDate)
    parts.push(`Between ${schedule.startDate} and ${schedule.endDate}`);
  else if (schedule.startDate) parts.push(`Starting from ${schedule.startDate}`);
  else if (schedule.endDate) parts.push(`Until ${schedule.endDate}`);

  if (schedule.activeDays.length > 0 && schedule.activeDays.length < 7) {
    const sorted = [...schedule.activeDays].sort((a, b) => a - b);
    parts.push(`on ${sorted.map((d) => dayNames[d]).join(', ')}`);
  }

  if (parts.length === 0) return null;

  return (
    <div className="p-3 bg-[var(--accent-2)] border border-[var(--accent-5)] rounded-md">
      <p className="text-xs font-medium text-[var(--accent-11)]">
        📅 Auto-reply will fire: <span className="font-semibold">{parts.join(' ')}</span>
      </p>
    </div>
  );
};
