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

// ============================================================
// vacationTransform.ts
// ============================================================

import type { SieveApiResponse } from '../../../api/sieve';
// Strategy: use "# rule:[vacation] <ruleName>" as the sole
// identifier for the vacation block — no start/end markers.
// The backend preserves # rule: lines so the block survives
// normal filter edits. We find the block boundaries by scanning
// from the rule comment to the next "# rule:" or end of file.
// ============================================================

export interface VacationSchedule {
  enabled: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  activeDays: number[]; // 0=Sun … 6=Sat. Empty = all days
}

export interface VacationSettings {
  enabled: boolean;
  ruleName: string; // e.g. "vacation-reply"
  subject: string;
  body: string;
  fromAddress: string;
  myAddresses: string; // comma-separated
  daysInterval: number;
  schedule: VacationSchedule;
}

export const DEFAULT_VACATION_SETTINGS: VacationSettings = {
  enabled: false,
  ruleName: 'vacation-reply',
  subject: '',
  body: '',
  fromAddress: '',
  myAddresses: '',
  daysInterval: 1,
  schedule: { enabled: false, startDate: '', endDate: '', activeDays: [] },
};

// ----------------------------------------------------------------
// Rule comment prefix — MUST start with "# rule:" so the backend
// treats it as a named rule and preserves it on rewrites.
// ----------------------------------------------------------------
const VACATION_RULE_PREFIX = '# rule:[vacation]';

// ----------------------------------------------------------------
// ----------------------------------------------------------------
const escapeStr = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const unescapeStr = (s: string) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

// ----------------------------------------------------------------
// Require merging
// ----------------------------------------------------------------
const mergeRequires = (raw: string, toAdd: string[], toRemove: string[] = []): string => {
  const m = raw.match(/^require\s+\[([^\]]*)\]\s*;/m);
  const existing = m ? (m[1].match(/"([^"]+)"/g) || []).map((r) => r.slice(1, -1)) : [];
  const merged = [...new Set([...existing.filter((r) => !toRemove.includes(r)), ...toAdd])];
  const newLine = `require [${merged.map((r) => `"${r}"`).join(', ')}];`;
  return m ? raw.replace(m[0], newLine) : newLine + '\n\n' + raw;
};

// ----------------------------------------------------------------
// Find the vacation block in a raw script.
// Returns { start, end } indices (end is exclusive) or null.
// The block is everything from "# rule:[vacation]" up to (but not
// including) the next "# rule:" line, or end of string.
// ----------------------------------------------------------------
const findVacationBlock = (raw: string): { start: number; end: number } | null => {
  const startIdx = raw.indexOf(VACATION_RULE_PREFIX);
  if (startIdx === -1) return null;

  // Find the next "# rule:" after our block starts
  const afterStart = raw.indexOf('\n# rule:', startIdx + 1);
  const end = afterStart === -1 ? raw.length : afterStart;

  return { start: startIdx, end };
};

// ----------------------------------------------------------------
// Strip the vacation block from a raw script
// ----------------------------------------------------------------
export const stripVacationBlock = (raw: string): string => {
  const bounds = findVacationBlock(raw);
  if (!bounds) return raw;

  const before = raw.substring(0, bounds.start).trimEnd();
  const after = raw.substring(bounds.end).trimStart();
  return [before, after].filter(Boolean).join('\n\n');
};

// ----------------------------------------------------------------
// Build vacation command string
// ----------------------------------------------------------------
const buildVacationCmd = (s: VacationSettings): string => {
  const parts = ['vacation'];
  if (s.daysInterval > 0) parts.push(`:days ${s.daysInterval}`);
  if (s.subject) parts.push(`:subject "${escapeStr(s.subject)}"`);
  if (s.fromAddress) parts.push(`:from "${escapeStr(s.fromAddress)}"`);

  const addrs = s.myAddresses
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  if (addrs.length > 0)
    parts.push(`:addresses [${addrs.map((a) => `"${escapeStr(a)}"`).join(', ')}]`);

  parts.push(`"${escapeStr(s.body)}"`);
  return parts.join('\n    ');
};

// ----------------------------------------------------------------
// Generate the full named vacation block
//
// Extension requirements:
//   "vacation"   — always
//   "date"       — when any currentdate test is used
//   "relational" — when :value "ge"/"le" is used (date range)
//
// Weekday uses :is (no relational needed):
//   currentdate :zone "+0000" :is "weekday" ["1","2","5"]
// Date range uses :value (relational required):
//   currentdate :zone "+0000" :value "ge" "date" "2026-03-15"
// ----------------------------------------------------------------
const generateBlock = (
  s: VacationSettings
): { text: string; needsDate: boolean; needsRelational: boolean } => {
  const vacCmd = buildVacationCmd(s);
  const { schedule } = s;
  const conditions: string[] = [];
  let needsDate = false;
  let needsRelational = false;

  if (schedule.enabled) {
    if (schedule.startDate) {
      needsDate = needsRelational = true;
      conditions.push(`currentdate :zone "+0000" :value "ge" "date" "${schedule.startDate}"`);
    }
    if (schedule.endDate) {
      needsDate = needsRelational = true;
      conditions.push(`currentdate :zone "+0000" :value "le" "date" "${schedule.endDate}"`);
    }
    const { activeDays } = schedule;
    if (activeDays.length > 0 && activeDays.length < 7) {
      needsDate = true;
      const wdList = activeDays.map((d) => `"${d}"`).join(', ');
      conditions.push(`anyof (currentdate :zone "+0000" :is "weekday" [${wdList}])`);
    }
  }

  const ruleHeader = `${VACATION_RULE_PREFIX} ${s.ruleName}`;

  let text: string;
  if (conditions.length === 0) {
    text = `${ruleHeader}\nif true {\n    ${vacCmd};\n}`;
  } else {
    const condStr =
      conditions.length === 1 ? conditions[0] : `allof (\n  ${conditions.join(',\n  ')}\n)`;
    text = `${ruleHeader}\nif ${condStr} {\n    ${vacCmd};\n}`;
  }

  return { text, needsDate, needsRelational };
};

// ----------------------------------------------------------------
// Main: build script with vacation injected
// ----------------------------------------------------------------
export const buildScriptWithVacation = (rawScript: string, settings: VacationSettings): string => {
  let script = stripVacationBlock(rawScript);

  if (!settings.enabled) {
    // Mirror how the backend disables filters: wrap in "if false { ... }"
    // Settings are preserved and the rule stays visible in the filter list.
    // If there's no existing block yet, nothing to disable — just return.
    const existingBounds = findVacationBlock(rawScript); // check original before strip
    if (!existingBounds) return script;

    const { text, needsDate, needsRelational } = generateBlock(settings);
    // Keep requires so re-enabling doesn't break anything
    const toKeep = ['vacation'];
    if (needsDate) toKeep.push('date');
    if (needsRelational) toKeep.push('relational');
    script = mergeRequires(script, toKeep);

    // Wrap the if-block contents in if false { ... }
    const lines = text.split('\n');
    const ruleHeader = lines[0]; // "# rule:[vacation] name"
    const ifBody = lines.slice(1).join('\n'); // "if ... { ... }"
    const disabledBlock = `${ruleHeader}\nif false {\n    ${ifBody.split('\n').join('\n    ')}\n}`;

    // Re-insert at same position
    const reqMatch = script.match(/^require\s+\[[^\]]*\]\s*;/m);
    if (reqMatch) {
      const idx = script.indexOf(reqMatch[0]) + reqMatch[0].length;
      const before = script.substring(0, idx);
      const after = script.substring(idx).replace(/^\n+/, '');
      return `${before}\n\n${disabledBlock}\n\n${after}`.trimEnd() + '\n';
    }
    return `${disabledBlock}\n\n${script}`.trimEnd() + '\n';
  }

  const { text, needsDate, needsRelational } = generateBlock(settings);

  const toAdd = ['vacation'];
  if (needsDate) toAdd.push('date');
  if (needsRelational) toAdd.push('relational');
  script = mergeRequires(script, toAdd);

  // Insert right after the require line so vacation fires first
  const reqMatch = script.match(/^require\s+\[[^\]]*\]\s*;/m);
  if (reqMatch) {
    const idx = script.indexOf(reqMatch[0]) + reqMatch[0].length;
    const before = script.substring(0, idx);
    const after = script.substring(idx).replace(/^\n+/, '');
    script = `${before}\n\n${text}\n\n${after}`.trimEnd() + '\n';
  } else {
    script = `${text}\n\n${script}`.trimEnd() + '\n';
  }

  return script;
};

// ----------------------------------------------------------------
// Parse vacation settings back out of a raw script
// ----------------------------------------------------------------
export const parseVacationFromScript = (raw: string): VacationSettings | null => {
  const bounds = findVacationBlock(raw);
  if (!bounds) return null;

  const block = raw.substring(bounds.start, bounds.end);

  // Detect if the vacation block is disabled (wrapped in "if false { ... }")
  const isDisabled = /if\s+false\s*\{/.test(block);

  // Rule name
  const ruleNameMatch = block.match(/# rule:\[vacation\]\s+(.+)/);
  const ruleName = ruleNameMatch ? ruleNameMatch[1].trim() : 'vacation-reply';

  const subjectMatch = block.match(/:subject\s+"((?:[^"\\]|\\.)*)"/);
  const subject = subjectMatch ? unescapeStr(subjectMatch[1]) : '';

  const fromMatch = block.match(/:from\s+"((?:[^"\\]|\\.)*)"/);
  const fromAddress = fromMatch ? unescapeStr(fromMatch[1]) : '';

  const addrMatch = block.match(/:addresses\s+\[([^\]]*)\]/);
  const myAddresses = addrMatch
    ? (addrMatch[1].match(/"((?:[^"\\]|\\.)*)"/g) || [])
        .map((a) => unescapeStr(a.slice(1, -1)))
        .join(', ')
    : '';

  const daysMatch = block.match(/:days\s+(\d+)/);
  const daysInterval = daysMatch ? parseInt(daysMatch[1], 10) : 1;

  // Body — last quoted string before the closing ;
  let body = '';
  const vacIdx = block.indexOf('vacation');
  if (vacIdx !== -1) {
    const vacPart = block.substring(vacIdx);
    const cmdEnd = vacPart.indexOf(';');
    if (cmdEnd !== -1) {
      const allStrings = [...vacPart.substring(0, cmdEnd).matchAll(/"((?:[^"\\]|\\.)*)"/g)];
      if (allStrings.length > 0) body = unescapeStr(allStrings[allStrings.length - 1][1]);
    }
  }

  const startDateMatch = block.match(/:value "ge" "date" "([0-9]{4}-[0-9]{2}-[0-9]{2})"/);
  const endDateMatch = block.match(/:value "le" "date" "([0-9]{4}-[0-9]{2}-[0-9]{2})"/);
  const wdMatch = block.match(/:is "weekday" \[([^\]]*)\]/);
  const activeDays = wdMatch
    ? (wdMatch[1].match(/"(\d+)"/g) || []).map((d) => parseInt(d.slice(1, -1), 10))
    : [];

  const hasSchedule = !!(startDateMatch || endDateMatch || activeDays.length > 0);

  return {
    enabled: !isDisabled,
    ruleName,
    subject,
    body,
    fromAddress,
    myAddresses,
    daysInterval,
    schedule: {
      enabled: hasSchedule,
      startDate: startDateMatch ? startDateMatch[1] : '',
      endDate: endDateMatch ? endDateMatch[1] : '',
      activeDays,
    },
  };
};

// ----------------------------------------------------------------
// updateScriptContent — single create call (API replaces by name)
// ----------------------------------------------------------------
export const updateScriptContent = async (
  scriptName: string,
  newContent: string,
  createScript: (args: { scriptName: string; scriptContent: string }) => Promise<SieveApiResponse>
): Promise<void> => {
  await createScript({ scriptName, scriptContent: newContent });
};
