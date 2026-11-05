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

import type { BIMIRecord } from './bimiService';

/**
 * Sender logos survive a reload, so opening the app doesn't repeat one DNS
 * lookup per sender domain. Only real answers are stored, never a failed
 * lookup.
 */
const STORAGE_KEY = 'webmail-bimi-cache-v1';
const DAY_MS = 24 * 60 * 60 * 1000;
// A domain with a logo rarely changes it; one without may add it sooner
const TTL_WITH_LOGO_MS = 7 * DAY_MS;
const TTL_WITHOUT_LOGO_MS = DAY_MS;
const MAX_DOMAINS = 500;

type Stored = Record<string, { record: BIMIRecord; savedAt: number }>;

const read = (): Stored => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const isFresh = ({ record, savedAt }: Stored[string], now: number) =>
  now - savedAt < (record.exists ? TTL_WITH_LOGO_MS : TTL_WITHOUT_LOGO_MS);

export function getStoredBimiRecord(domain: string, now = Date.now()): BIMIRecord | null {
  const entry = read()[domain];
  return entry && isFresh(entry, now) ? entry.record : null;
}

export function storeBimiRecord(domain: string, record: BIMIRecord, now = Date.now()) {
  const fresh = Object.entries(read()).filter(([, entry]) => isFresh(entry, now));
  // Oldest entries go first once the limit is reached
  const kept = fresh.sort((a, b) => a[1].savedAt - b[1].savedAt).slice(-(MAX_DOMAINS - 1));
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...Object.fromEntries(kept), [domain]: { record, savedAt: now } })
    );
  } catch {
    // Storage full or blocked: the logo is just looked up again next time
  }
}
